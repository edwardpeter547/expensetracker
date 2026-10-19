/**
 * Unit tests for logout token revocation at the service layer.
 *
 * The mock stores only SHA-256 digests and applies `updateMany` matching so
 * these tests exercise the real ownership constraint: a user can only revoke
 * their own, still-active, presented token.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

let store;

/**
 * Apply a Prisma-style `updateMany` over the in-memory token store.
 *
 * @param {{[key: string]: unknown}} where Field equality filters.
 * @param {{[key: string]: unknown}} data Values assigned to matched rows.
 * @returns {{ count: number }} The number of matched rows.
 */
const updateMany = ({ where, data }) => {
    let count = 0;
    for (const record of store) {
        if (Object.entries(where).every(([key, value]) => record[key] === value)) {
            Object.assign(record, data);
            count += 1;
        }
    }
    return { count };
};

const mockPrisma = {
    refreshToken: {
        updateMany: jest.fn(async (args) => updateMany(args)),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const authService = await import('../auth.service.js');

/**
 * Seed the in-memory store with one active token for a user.
 *
 * @param {number} userId The owning user id.
 * @param {string} rawToken The raw 80-character token to hash and store.
 * @param {boolean} [revoked=false] Whether the stored token is already revoked.
 */
const seedToken = (userId, rawToken, revoked = false) => {
    store = [{
        id: crypto.randomUUID(),
        token: sha256(rawToken),
        familyId: 'family-1',
        userId,
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: revoked,
        createdAt: new Date(),
    }];
};

describe('auth.service revokeRefreshTokenByHash', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        store = [];
    });

    /**
     * A logout must revoke the presented token by its SHA-256 hash and only
     * when the authenticated user owns it and it is still active.
     */
    test('revokes only the matching active token by hash and userId', async () => {
        const raw = 'c'.repeat(80);
        seedToken(1, raw);

        const result = await authService.revokeRefreshTokenByHash(raw, 1);

        expect(result.count).toBe(1);
        expect(store[0].isRevoked).toBe(true);
        expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
            where: { token: sha256(raw), userId: 1, isRevoked: false },
            data: { isRevoked: true },
        });
    });

    /**
     * A user must never be able to revoke another user's token. The ownership
     * filter yields zero matches and the token remains active.
     */
    test('does not revoke another user token', async () => {
        const raw = 'd'.repeat(80);
        seedToken(1, raw);

        const result = await authService.revokeRefreshTokenByHash(raw, 2);

        expect(result.count).toBe(0);
        expect(store[0].isRevoked).toBe(false);
    });

    /**
     * An already-revoked token must match zero rows, keeping repeated logout
     * idempotent without an error.
     */
    test('is idempotent for an already-revoked token', async () => {
        const raw = 'e'.repeat(80);
        seedToken(1, raw, true);

        const result = await authService.revokeRefreshTokenByHash(raw, 1);

        expect(result.count).toBe(0);
        expect(store[0].isRevoked).toBe(true);
    });
});
