/**
 * Real-PostgreSQL integration tests for logout revocation.
 *
 * These tests run the production service functions against a disposable
 * PostgreSQL instance and verify real persistence and row-lock behavior.
 *
 * Safety contract (same as the refresh integration suite):
 * - Runs only when RUN_DB_INTEGRATION=1.
 * - TEST_DATABASE_URL must resolve to localhost and is treated as an
 *   ADMINISTRATIVE connection to a disposable/dedicated PostgreSQL instance.
 * - The suite creates its own uniquely named databases and drops only those
 *   it created. It never modifies the database named in TEST_DATABASE_URL.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const RUN_DB = process.env.RUN_DB_INTEGRATION === '1';
const ADMIN_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Determine whether a connection URL targets a disposable local instance.
 *
 * @param {string|undefined} url The candidate connection string.
 * @returns {boolean} True when the host is localhost, 127.0.0.1, or ::1.
 */
const isLocalDisposableDatabaseUrl = (url) => {
    if (!url) return false;
    try {
        const hostname = new URL(url).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    } catch {
        return false;
    }
};

if (RUN_DB && !isLocalDisposableDatabaseUrl(ADMIN_DATABASE_URL)) {
    throw new Error(
        'Refusing to run integration tests: TEST_DATABASE_URL must point at a ' +
        'disposable local PostgreSQL (localhost, 127.0.0.1, or ::1).'
    );
}

const describeDb = RUN_DB ? describe : describe.skip;

const backendRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..'
);

/**
 * Build a unique, test-run-owned database name.
 *
 * @param {string} prefix Stable prefix for the database name.
 * @returns {string} A collision-resistant database name.
 */
const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

/**
 * Replace the path component of a connection URL with a database name.
 *
 * @param {string} url The administrative connection string.
 * @param {string} name The database name to target.
 * @returns {string} A connection string pointing at the named database.
 */
const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('auth logout integration (real PostgreSQL)', () => {
    let prisma;
    let authService;
    let adminClient;

    // Databases successfully created by this run; teardown drops only these.
    const createdDatabases = new Set();

    /**
     * Open a `pg` client against a connection string.
     *
     * @param {string} url The connection string.
     * @returns {Promise<Client>} A connected client.
     */
    const connectPg = async (url) => {
        const client = new Client({ connectionString: url });
        await client.connect();
        return client;
    };

    /**
     * Create a database and record it for teardown.
     *
     * @param {Client} admin An administrative client.
     * @param {string} name The database name to create.
     * @returns {Promise<void>}
     */
    const createDatabaseAndTrack = async (admin, name) => {
        await admin.query(`CREATE DATABASE "${name}"`);
        createdDatabases.add(name);
    };

    /**
     * Drop a database only when this run created it.
     *
     * @param {Client} admin An administrative client.
     * @param {string} name The database name.
     * @returns {Promise<void>}
     */
    const dropDatabaseIfTracked = async (admin, name) => {
        if (!createdDatabases.has(name)) return;
        await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
        createdDatabases.delete(name);
    };

    /**
     * Drop every database this run created.
     *
     * @param {Client} admin An administrative client.
     * @returns {Promise<void>}
     */
    const dropAllCreatedDatabases = async (admin) => {
        for (const name of [...createdDatabases]) {
            await dropDatabaseIfTracked(admin, name);
        }
    };

    /**
     * Create a fresh active user for a test.
     *
     * @param {{[key: string]: unknown}} [overrides] User field overrides.
     * @returns {Promise<object>} The created user record.
     */
    const seedUser = async (overrides = {}) => {
        const testPassword = crypto.randomBytes(32).toString('hex');
        return prisma.user.create({
            data: {
                email: `refresh-${crypto.randomUUID()}@example.com`,
                username: `refresh-${crypto.randomUUID()}`,
                password: await bcrypt.hash(testPassword, 10),
                firstname: 'Logout',
                lastname: 'User',
                language: 'en',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
                ...overrides,
            },
        });
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const mainTestDbName = uniqueDbName('expensetracker_logout_it');
        await createDatabaseAndTrack(adminClient, mainTestDbName);

        const mainTestDbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, mainTestDbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: mainTestDbUrl },
            stdio: 'pipe',
        });

        process.env.DATABASE_URL = mainTestDbUrl;
        prisma = (await import('../../configurations/prisma.connect.js')).default;
        authService = await import('../auth.service.js');
    });

    afterAll(async () => {
        await prisma?.$disconnect().catch(() => {});
        if (adminClient) await dropAllCreatedDatabases(adminClient);
        await adminClient?.end().catch(() => {});
    });

    /**
     * Logout must persist the revocation: the revoked token can no longer be
     * used to refresh into a new session.
     */
    test('logout persists revocation and blocks refresh with the same token', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        await authService.revokeRefreshTokenByHash(raw, user.id);

        await expect(authService.rotateRefreshToken(raw)).rejects.toMatchObject({ statusCode: 401 });
        const stored = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(raw) },
        });
        expect(stored.isRevoked).toBe(true);
    });

    /**
     * A user must never be able to revoke another user's token. A cross-user
     * logout matches zero rows and the victim's token remains refreshable.
     */
    test('logout never revokes another user token', async () => {
        const owner = await seedUser();
        const attacker = await seedUser();
        const ownerToken = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(ownerToken, owner.id, '127.0.0.1');

        const result = await authService.revokeRefreshTokenByHash(ownerToken, attacker.id);

        expect(result.count).toBe(0);
        await expect(authService.rotateRefreshToken(ownerToken)).resolves.toHaveProperty('refreshToken');
    });

    /**
     * Repeating logout for an already-revoked token is idempotent and does not
     * error.
     */
    test('repeated logout is idempotent', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const first = await authService.revokeRefreshTokenByHash(raw, user.id);
        const second = await authService.revokeRefreshTokenByHash(raw, user.id);

        expect(first.count).toBe(1);
        expect(second.count).toBe(0);
    });

    /**
     * Concurrent logout and refresh must preserve the single-use invariant.
     *
     * Logout always fulfills and revokes the presented token if it is still
     * active. Refresh either wins (fulfills with a fresh token pair, after
     * which logout observes zero remaining rows) or loses to replay detection
     * (rejects with 401, after which logout observes the one row it revoked).
     * Either way the original token ends revoked, and the final family state
     * must match the observed outcome.
     */
    test('concurrent logout and refresh preserve the single-use invariant', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');
        const originalHash = authService.hashToken(raw);
        const familyRecord = await prisma.refreshToken.findFirst({ where: { token: originalHash } });

        const [logoutResult, refreshResult] = await Promise.allSettled([
            authService.revokeRefreshTokenByHash(raw, user.id),
            authService.rotateRefreshToken(raw),
        ]);

        // Logout must always fulfill and return the number of rows it revoked.
        expect(logoutResult.status).toBe('fulfilled');
        expect([0, 1]).toContain(logoutResult.value.count);

        // Refresh may fulfill (won the race) or reject with a replay 401.
        // Any other rejection is an unexpected error and must fail the test.
        expect(['fulfilled', 'rejected']).toContain(refreshResult.status);
        if (refreshResult.status === 'rejected') {
            expect(refreshResult.reason).toMatchObject({ statusCode: 401 });
            // If refresh lost, logout must have revoked the original row.
            expect(logoutResult.value.count).toBe(1);
        } else {
            // If refresh won, it issued a fresh pair and consumed the original,
            // so logout observed zero remaining active rows.
            expect(logoutResult.value.count).toBe(0);
            expect(refreshResult.value).toHaveProperty('refreshToken');
        }

        // The original token must always end revoked.
        const original = await prisma.refreshToken.findFirst({ where: { token: originalHash } });
        expect(original.isRevoked).toBe(true);

        const activeFamilyCount = await prisma.refreshToken.count({
            where: { familyId: familyRecord.familyId, isRevoked: false },
        });

        if (refreshResult.status === 'fulfilled') {
            // Refresh won: exactly one fresh token is active, and it is usable
            // only while its session remains active. Reusing it after rotation
            // must be rejected as replay.
            expect(activeFamilyCount).toBe(1);
            const issuedToken = refreshResult.value.refreshToken;
            const rotated = await authService.rotateRefreshToken(issuedToken);
            expect(rotated).toHaveProperty('refreshToken');
            await expect(authService.rotateRefreshToken(issuedToken)).rejects.toMatchObject({ statusCode: 401 });
        } else {
            // Refresh lost to replay: the entire family must be revoked.
            expect(activeFamilyCount).toBe(0);
        }
    });
});
