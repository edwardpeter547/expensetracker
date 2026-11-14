/**
 * Unit tests for the password-reset code service.
 *
 * The mocked Prisma client models a small password-reset-token store and
 * applies the same conditional mutations a real transaction performs. These
 * tests assert the security invariants directly: raw codes are never
 * persisted, codes are single-use and attempt-limited, expired codes are
 * distinguished from wrong codes, and prior codes are superseded on resend.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PASSWORD_RESET_ATTEMPT_LIMIT = '3';
process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = '10';

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
    token: '',
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
    return {count: matched.length};
};

const passwordResetTokenClient = () => ({
    create: jest.fn(async ({data}) => {
        const record = makeToken({...data, createdAt: new Date()});
        tokens.push(record);
        return record;
    }),
    findFirst: jest.fn(async ({where, orderBy, select}) => {
        const candidates = tokens.filter((item) => matchesWhere(item, where));
        if (orderBy && orderBy.createdAt === 'desc') candidates.reverse();
        const record = candidates[0];
        return record ? applySelect(record, select) : null;
    }),
    findUnique: jest.fn(async ({where, select}) => {
        const record = tokens.find((item) => item.id === where.id);
        return record ? applySelect(record, select) : null;
    }),
    updateMany: jest.fn(async ({where, data}) => updateTokenRecords(where, data)),
});

const transactionClient = () => ({
    $queryRaw: jest.fn(async (_strings, userId) => {
        const user = users.find((item) => item.id === userId);
        return user ? [{id: user.id}] : [];
    }),
    passwordResetToken: passwordResetTokenClient(),
    user: {
        findUnique: jest.fn(async ({where, select}) => {
            const user = users.find((item) => item.id === where.id);
            return user ? applySelect(user, select) : null;
        }),
        update: jest.fn(async ({where, data}) => {
            const user = users.find((item) => item.id === where.id);
            if (!user) return null;
            for (const [key, value] of Object.entries(data || {})) {
                if (value && typeof value === 'object' && 'increment' in value) {
                    user[key] = user[key] + value.increment;
                } else {
                    user[key] = value;
                }
            }
            return user;
        }),
    },
    refreshToken: {
        updateMany: jest.fn(async () => ({count: 1})),
    },
    passwordHistory: {
        create: jest.fn(async ({data}) => data),
    },
});

const mockPrisma = {
    passwordResetToken: passwordResetTokenClient(),
    $transaction: jest.fn(async (callback) => callback(transactionClient())),
};

const backendSrc = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
);

jest.unstable_mockModule(
    path.resolve(backendSrc, 'configurations/prisma.connect.js'),
    () => ({default: mockPrisma})
);

jest.unstable_mockModule(
    path.resolve(backendSrc, 'services/auth-audit.service.js'),
    () => ({recordAuthAuditEvent: jest.fn(async () => undefined)})
);

const authService = await import('../auth.service.js');

describe('auth.service password-reset operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        tokens = [];
        users = [{id: 1, email: 'user@example.com', password: 'old-hash', tokenVersion: 0}];
    });

    /**
     * The raw six-digit code must never reach the persisted token record;
     * only its keyed HMAC digest may be written.
     */
    test('savePasswordResetToken stores only the hashed code', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        expect(tokens).toHaveLength(1);
        expect(tokens[0].token).not.toBe('123456');
        expect(tokens[0].token).toBe(authService.hashResetCode('123456'));
        expect(tokens[0].usedAt).toBeNull();
    });

    /**
     * Issuing a second code must invalidate the previous unused code so only
     * the most recently issued code remains usable.
     */
    test('savePasswordResetToken supersedes prior unused codes', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '111111', '127.0.0.1');
        await authService.savePasswordResetToken(user, '222222', '127.0.0.1');

        expect(tokens).toHaveLength(2);
        expect(tokens.find((item) => item.token === authService.hashResetCode('111111')).usedAt).not.toBeNull();
        expect(tokens.find((item) => item.token === authService.hashResetCode('222222')).usedAt).toBeNull();
    });

    /**
     * A valid code verifies successfully and is not consumed by verification.
     */
    test('verifyResetPasswordToken accepts a valid code without consuming it', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        const result = await authService.verifyResetPasswordToken('123456', user);

        expect(result.valid).toBe(true);
        expect(result.reason).toBeNull();
        expect(tokens[0].usedAt).toBeNull();
    });

    /**
     * A wrong code is rejected and consumes one of the account's attempts.
     */
    test('verifyResetPasswordToken rejects a wrong code and records an attempt', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        const result = await authService.verifyResetPasswordToken('000000', user);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('invalid');
        expect(tokens[0].attempts).toBe(1);
        expect(tokens[0].usedAt).toBeNull();
    });

    /**
     * Reaching the attempt limit must invalidate the code so brute-force
     * guesses cannot continue against the same credential.
     */
    test('verifyResetPasswordToken invalidates a code after too many attempts', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        for (let attempt = 0; attempt < 3; attempt += 1) {
            await authService.verifyResetPasswordToken('000000', user);
        }

        expect(tokens[0].attempts).toBe(3);
        expect(tokens[0].usedAt).not.toBeNull();

        const valid = await authService.verifyResetPasswordToken('123456', user);
        expect(valid.valid).toBe(false);
    });

    /**
     * An expired code is rejected with an explicit expired reason and marked
     * used.
     */
    test('verifyResetPasswordToken reports an expired code', async () => {
        const user = users[0];
        tokens.push(makeToken({
            userId: user.id,
            token: authService.hashResetCode('123456'),
            expiresAt: new Date(Date.now() - 60 * 1000),
        }));

        const result = await authService.verifyResetPasswordToken('123456', user);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('expired');
        expect(tokens[0].usedAt).not.toBeNull();
    });

    /**
     * A wrong code must never change the password and must record an attempt.
     */
    test('resetPasswordWithCode rejects a wrong code without changing the password', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        const result = await authService.resetPasswordWithCode({
            userId: user.id,
            code: '000000',
            password: 'NewPassword123',
        });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('invalid');
        expect(user.password).toBe('old-hash');
        expect(tokens[0].attempts).toBe(1);
    });

    /**
     * An expired code is rejected with an explicit expired reason and never
     * changes the password.
     */
    test('resetPasswordWithCode reports an expired code', async () => {
        const user = users[0];
        tokens.push(makeToken({
            userId: user.id,
            token: authService.hashResetCode('123456'),
            expiresAt: new Date(Date.now() - 60 * 1000),
        }));

        const result = await authService.resetPasswordWithCode({
            userId: user.id,
            code: '123456',
            password: 'NewPassword123',
        });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('expired');
        expect(user.password).toBe('old-hash');
    });

    /**
     * A valid code resets the password exactly once and consumes the code.
     */
    test('resetPasswordWithCode applies a valid reset and consumes the code', async () => {
        const user = users[0];
        await authService.savePasswordResetToken(user, '123456', '127.0.0.1');

        const result = await authService.resetPasswordWithCode({
            userId: user.id,
            code: '123456',
            password: 'NewPassword123',
        });

        expect(result.success).toBe(true);
        expect(result.reason).toBeNull();
        expect(user.password).not.toBe('old-hash');
        expect(user.tokenVersion).toBe(1);
        expect(tokens[0].usedAt).not.toBeNull();
    });
});
