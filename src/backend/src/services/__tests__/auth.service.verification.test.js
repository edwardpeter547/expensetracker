/**
 * Unit tests for the six-digit email-verification code service.
 *
 * The mocked Prisma client models a small verification-token store and applies
 * the same conditional mutations a real transaction performs. These tests
 * assert the security invariants directly: raw codes are never persisted,
 * codes are single-use and attempt-limited, leading zeros are preserved by
 * hashing the code as a string, and prior codes are superseded on resend.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.VERIFICATION_ATTEMPT_LIMIT = '3';
process.env.VERIFICATION_TOKEN_EXPIRY_MINUTES = '10';

let tokens;
let users;

const matchesWhere = (record, where) => {
    for (const [key, value] of Object.entries(where || {})) {
        if (value && typeof value === 'object' && 'gt' in value) {
            if (!(record[key] > value.gt)) return false;
        } else if (record[key] !== value) {
            return false;
        }
    }
    return true;
};

const applySelect = (record, select) => {
    const result = {};
    for (const [key, value] of Object.entries(select || {})) {
        if (value === true) {
            result[key] = record[key];
        }
    }
    return result;
};

const makeToken = (overrides = {}) => ({
    id: crypto.randomUUID(),
    userId: 1,
    tokenHash: '',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    attempts: 0,
    createdAt: new Date(),
    createdByIp: null,
    ...overrides,
});

const updateTokenRecords = (where, data) => {
    const matched = tokens.filter((item) => matchesWhere(item, where));
    for (const item of matched) {
        for (const [key, value] of Object.entries(data || {})) {
            if (value && typeof value === 'object' && 'increment' in value) {
                item[key] = item[key] + value.increment;
            } else {
                item[key] = value;
            }
        }
    }
    return { count: matched.length };
};

const verificationTokenClient = () => ({
    create: jest.fn(async ({ data }) => {
        const record = makeToken({...data, createdAt: new Date()});
        tokens.push(record);
        return record;
    }),
    findFirst: jest.fn(async ({ where, orderBy, select }) => {
        const candidates = tokens.filter((item) => matchesWhere(item, where));
        if (orderBy && orderBy.createdAt === 'desc') candidates.reverse();
        const record = candidates[0];
        return record ? applySelect(record, select) : null;
    }),
    findUnique: jest.fn(async ({ where, select }) => {
        const record = tokens.find((item) => item.id === where.id);
        return record ? applySelect(record, select) : null;
    }),
    updateMany: jest.fn(async ({ where, data }) => updateTokenRecords(where, data)),
});

const transactionClient = () => ({
    $queryRaw: jest.fn(async (_strings, email) => {
        const user = users.find((item) => item.email === email);
        return user ? [{...user}] : [];
    }),
    verificationToken: verificationTokenClient(),
    user: {
        update: jest.fn(async ({ where, data }) => {
            const user = users.find((item) => item.id === where.id);
            if (user) Object.assign(user, data);
            return user;
        }),
    },
});

const mockPrisma = {
    verificationToken: verificationTokenClient(),
    $transaction: jest.fn(async (callback) => callback(transactionClient())),
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const authService = await import('../auth.service.js');

const seedUnverifiedUser = (overrides = {}) => {
    users = [{
        id: 1,
        email: 'user@example.com',
        language: 'en',
        isActive: false,
        isEmailVerified: false,
        ...overrides,
    }];
};

describe('auth.service verification-code operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokens = [];
        seedUnverifiedUser();
    });

    /**
     * The raw six-digit code must never reach the persisted token record;
     * only its keyed HMAC digest may be written.
     */
    test('createVerificationCode stores only the hashed code', async () => {
        await authService.createVerificationCode({id: 1}, '012345', '127.0.0.1');

        expect(tokens).toHaveLength(1);
        expect(tokens[0].tokenHash).not.toContain('012345');
        expect(tokens[0].tokenHash).toBe(authService.hashVerificationCode('012345'));
        expect(tokens[0].usedAt).toBeNull();
        expect(tokens[0].attempts).toBe(0);
    });

    /**
     * A correct, unexpired code must activate the account exactly once and
     * consume the token, after which the same code is rejected.
     */
    test('verifyEmailCode activates the account and rejects a reused code', async () => {
        await authService.createVerificationCode({id: 1}, '654321');

        const first = await authService.verifyEmailCode({email: 'user@example.com', code: '654321'});
        const second = await authService.verifyEmailCode({email: 'user@example.com', code: '654321'});

        expect(first.status).toBe('verified');
        expect(first.user).toMatchObject({id: 1, email: 'user@example.com'});
        expect(users[0].isActive).toBe(true);
        expect(users[0].isEmailVerified).toBe(true);
        expect(tokens.every((item) => item.usedAt !== null)).toBe(true);
        expect(second.status).toBe('invalid');
    });

    /**
     * A six-digit code with leading zeros must verify correctly because the
     * code is hashed as a zero-padded string rather than as a number.
     */
    test('verifyEmailCode preserves leading zeros', async () => {
        await authService.createVerificationCode({id: 1}, '000123');

        const result = await authService.verifyEmailCode({email: 'user@example.com', code: '000123'});

        expect(result.status).toBe('verified');
    });

    /**
     * An unknown email must behave like a wrong code (generic invalid result)
     * so the endpoint cannot be used for account enumeration.
     */
    test('verifyEmailCode treats an unknown email as invalid', async () => {
        const result = await authService.verifyEmailCode({email: 'missing@example.com', code: '123456'});

        expect(result.status).toBe('invalid');
    });

    /**
     * A wrong code must increment the active code attempt counter and, once
     * the configured limit is reached, invalidate the code so even the
     * correct value no longer works.
     */
    test('verifyEmailCode enforces the attempt limit', async () => {
        await authService.createVerificationCode({id: 1}, '123456');

        await authService.verifyEmailCode({email: 'user@example.com', code: '000000'});
        await authService.verifyEmailCode({email: 'user@example.com', code: '000000'});
        await authService.verifyEmailCode({email: 'user@example.com', code: '000000'});

        expect(tokens[0].usedAt).not.toBeNull();

        const correctAfterLimit = await authService.verifyEmailCode({email: 'user@example.com', code: '123456'});
        expect(correctAfterLimit.status).toBe('invalid');
        expect(users[0].isActive).toBe(false);
    });

    /**
     * An expired code must be reported distinctly and must not activate the
     * account.
     */
    test('verifyEmailCode reports an expired code without activating the account', async () => {
        await authService.createVerificationCode({id: 1}, '123456');
        tokens[0].expiresAt = new Date(Date.now() - 1000);

        const result = await authService.verifyEmailCode({email: 'user@example.com', code: '123456'});

        expect(result.status).toBe('expired');
        expect(users[0].isActive).toBe(false);
        expect(tokens[0].usedAt).not.toBeNull();
    });

    /**
     * Resending must supersede any previous unused code so only the most
     * recently issued code is accepted.
     */
    test('saveVerificationCode supersedes previous unused codes', async () => {
        await authService.createVerificationCode({id: 1}, '111111');
        const previous = tokens[0].id;

        await authService.saveVerificationCode({id: 1}, '222222', '127.0.0.1');

        expect(tokens.find((item) => item.id === previous).usedAt).not.toBeNull();
        const active = tokens.find((item) => item.usedAt === null);
        expect(active.tokenHash).toBe(authService.hashVerificationCode('222222'));

        const result = await authService.verifyEmailCode({email: 'user@example.com', code: '111111'});
        expect(result.status).toBe('invalid');
    });
});
