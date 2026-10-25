/**
 * Regression tests for secure refresh-token storage and rotation.
 *
 * The mock models a tiny refresh_token table and applies only the mutations a
 * transaction performs, undoing them on rollback. It stores only SHA-256
 * digests, so any test that accidentally persists a raw token or fails to
 * revoke a family will observe it directly.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const rawToken = () => crypto.randomBytes(40).toString('hex');

const ACTIVE_USER = {
    id: 1,
    email: 'active@example.com',
    username: 'active',
    firstname: 'Ada',
    lastname: 'Byron',
    avatar: null,
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    language: 'en',
    tokenVersion: 0,
};

const INACTIVE_USER = { ...ACTIVE_USER, id: 2, email: 'inactive@example.com', isActive: false };
const USERS = { [ACTIVE_USER.id]: ACTIVE_USER, [INACTIVE_USER.id]: INACTIVE_USER };

let store;
let shouldFailCreate = false;

const matchesWhere = (record, where) => {
    for (const [key, value] of Object.entries(where || {})) {
        if (record[key] !== value) return false;
    }
    return true;
};

const findTokenByHash = (tokenHash) => {
    const record = store.find((item) => item.token === tokenHash);
    if (!record) return null;
    return { ...record, user: USERS[record.userId] };
};

const createTokenRecord = (data) => {
    const record = { id: crypto.randomUUID(), createdAt: new Date(), isRevoked: false, ...data };
    store.push(record);
    return { ...record };
};

const updateTokenRecords = (where, data) => {
    const matched = store.filter((item) => matchesWhere(item, where));
    const originals = matched.map((item) => ({ ...item }));
    for (const item of matched) Object.assign(item, data);
    return { count: matched.length, matched, originals };
};

const makeTransactionClient = () => {
    const undoLog = [];
    return {
        undoLog,
        $queryRaw: jest.fn(async () => [{ tokenVersion: 0, isActive: true }]),
        refreshToken: {
            create: async ({ data }) => {
                if (shouldFailCreate) throw new Error('simulated database failure');
                const record = createTokenRecord(data);
                undoLog.push(() => {
                    const index = store.indexOf(record);
                    if (index >= 0) store.splice(index, 1);
                });
                return record;
            },
            updateMany: async ({ where, data }) => {
                const result = updateTokenRecords(where, data);
                undoLog.push(() => result.matched.forEach((item, index) => Object.assign(item, result.originals[index])));
                return { count: result.count };
            },
        },
        user: { update: jest.fn(async () => ({})), findFirst: jest.fn(async () => ({ password: 'old-hash' })) },
        passwordHistory: { create: jest.fn(async () => ({})) },
    };
};

const mockPrisma = {
    refreshToken: {
        findUnique: jest.fn(async ({ where }) => findTokenByHash(where.token)),
        create: jest.fn(async ({ data }) => createTokenRecord(data)),
        updateMany: jest.fn(async ({ where, data }) => {
            const result = updateTokenRecords(where, data);
            return { count: result.count };
        }),
    },
    user: {
        findFirst: jest.fn(async () => ({ password: 'old-hash' })),
    },
    passwordHistory: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (callback) => {
        const client = makeTransactionClient();
        try {
            return await callback(client);
        } catch (error) {
            client.undoLog.reverse().forEach((undo) => undo());
            throw error;
        }
    }),
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const authService = await import('../auth.service.js');

const seedToken = (overrides = {}) => {
    const token = rawToken();
    store = [{
        id: crypto.randomUUID(),
        token: sha256(token),
        familyId: 'family-1',
        userId: ACTIVE_USER.id,
        expiresAt: new Date(Date.now() + TTL_MS),
        isRevoked: false,
        createdByIp: '127.0.0.1',
        createdAt: new Date(),
        ...overrides,
    }];
    return token;
};

describe('refresh-token storage and rotation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        store = [];
        shouldFailCreate = false;
    });

    test('hashToken returns a 64-character SHA-256 digest', () => {
        expect(authService.hashToken('abc')).toBe(sha256('abc'));
        expect(authService.hashToken('abc')).toHaveLength(64);
        expect(authService.hashToken('abc')).not.toBe('abc');
    });

    test('createRefreshToken stores only the SHA-256 digest, never the raw token', async () => {
        const token = rawToken();
        await authService.createRefreshToken(token, ACTIVE_USER.id, '127.0.0.1');

        expect(store).toHaveLength(1);
        expect(store[0].token).toBe(sha256(token));
        expect(store[0].token).not.toBe(token);
        expect(JSON.stringify(store)).not.toContain(token);
        expect(store[0].familyId).toBeDefined();
        expect(store[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + TTL_MS - 1000);
    });

    test('rotateRefreshToken rotates atomically and keeps the same family', async () => {
        const token = seedToken();

        const result = await authService.rotateRefreshToken(token);

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(store).toHaveLength(2);
        const [oldRecord, newRecord] = store;
        expect(oldRecord.isRevoked).toBe(true);
        expect(newRecord.isRevoked).toBe(false);
        expect(newRecord.familyId).toBe('family-1');
        expect(newRecord.token).toBe(sha256(result.refreshToken));
        expect(store.map((item) => item.token)).not.toContain(result.refreshToken);
    });

    test('rotateRefreshToken rejects malformed, nonexistent, expired, and revoked tokens with 401', async () => {
        await expect(authService.rotateRefreshToken('not-a-token')).rejects.toMatchObject({ statusCode: 401 });

        seedToken();
        const unknown = rawToken();
        await expect(authService.rotateRefreshToken(unknown)).rejects.toMatchObject({ statusCode: 401 });

        const expired = seedToken({ expiresAt: new Date(Date.now() - 1000) });
        await expect(authService.rotateRefreshToken(expired)).rejects.toMatchObject({ statusCode: 401 });

        const revoked = seedToken({ isRevoked: true });
        await expect(authService.rotateRefreshToken(revoked)).rejects.toMatchObject({ statusCode: 401 });
    });

    test('presenting a revoked token revokes the whole family', async () => {
        const token = seedToken();
        await authService.rotateRefreshToken(token);
        const rotatedRecord = store[1];
        expect(rotatedRecord.isRevoked).toBe(false);

        await expect(authService.rotateRefreshToken(token)).rejects.toMatchObject({ statusCode: 401 });
        expect(store.every((item) => item.isRevoked === true)).toBe(true);
    });

    test('refresh re-checks account eligibility and revokes the family for inactive users', async () => {
        const token = seedToken({ userId: INACTIVE_USER.id });

        await expect(authService.rotateRefreshToken(token)).rejects.toMatchObject({ statusCode: 401 });
        expect(store[0].isRevoked).toBe(true);
    });

    test('concurrent refresh attempts allow exactly one rotation and revoke the family on replay', async () => {
        const token = seedToken();

        const [first, second] = await Promise.allSettled([
            authService.rotateRefreshToken(token),
            authService.rotateRefreshToken(token),
        ]);

        const fulfilled = [first, second].filter((item) => item.status === 'fulfilled');
        const rejected = [first, second].filter((item) => item.status === 'rejected');
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason).toMatchObject({ statusCode: 401 });
        expect(store.every((item) => item.isRevoked === true)).toBe(true);
    });

    test('a database failure during rotation rolls back the consume step', async () => {
        const token = seedToken();
        shouldFailCreate = true;

        await expect(authService.rotateRefreshToken(token)).rejects.toThrow('simulated database failure');
        expect(store).toHaveLength(1);
        expect(store[0].isRevoked).toBe(false);
    });

    test('revokeAllRefreshTokens revokes every active token for the user', async () => {
        const first = rawToken();
        const second = rawToken();
        await authService.createRefreshToken(first, ACTIVE_USER.id, '127.0.0.1');
        await authService.createRefreshToken(second, ACTIVE_USER.id, '127.0.0.1');

        const result = await authService.revokeAllRefreshTokens(ACTIVE_USER.id);

        expect(result.count).toBe(2);
        expect(store.every((item) => item.isRevoked === true)).toBe(true);
    });

    test('updateUserPassword revokes all sessions in the same transaction', async () => {
        const first = rawToken();
        const second = rawToken();
        await authService.createRefreshToken(first, ACTIVE_USER.id, '127.0.0.1');
        await authService.createRefreshToken(second, ACTIVE_USER.id, '127.0.0.1');

        await authService.updateUserPassword({ id: ACTIVE_USER.id, email: ACTIVE_USER.email }, 'new-password');

        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(store.every((item) => item.isRevoked === true)).toBe(true);
    });
});
