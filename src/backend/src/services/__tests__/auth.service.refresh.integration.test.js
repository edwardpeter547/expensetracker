/**
 * Real-PostgreSQL integration tests for refresh-token security.
 *
 * These tests are intentionally not mocked: they run the production service
 * functions against a disposable PostgreSQL instance and exercise real
 * transaction/row-lock behavior.
 *
 * Safety contract:
 * - Tests run only when RUN_DB_INTEGRATION=1.
 * - TEST_DATABASE_URL must resolve to localhost and is treated as an
 *   ADMINISTRATIVE connection to a disposable/dedicated PostgreSQL instance.
 *   The suite never modifies the database named in TEST_DATABASE_URL; it
 *   creates its own uniquely named databases and drops only those it created.
 * - The configured PostgreSQL instance itself must be disposable or dedicated
 *   to testing; never point this suite at a production or shared instance.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import { readFile } from 'fs/promises';
import bcrypt from 'bcryptjs';

const RUN_DB = process.env.RUN_DB_INTEGRATION === '1';
const ADMIN_DATABASE_URL = process.env.TEST_DATABASE_URL;

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
        'disposable local PostgreSQL (localhost, 127.0.0.1, or ::1). It must ' +
        'never reference a production or shared database.'
    );
}

const describeDb = RUN_DB ? describe : describe.skip;

const backendRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..'
);

const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('auth refresh-token integration (real PostgreSQL)', () => {
    let prisma;
    let authService;
    let adminClient;
    let testDbUrl;
    let setupFailed = false;

    // Names of databases this run successfully created. Teardown drops only
    // these and never touches the database named in ADMIN_DATABASE_URL.
    const createdDatabases = new Set();

    const connectPg = async (url) => {
        const client = new Client({ connectionString: url });
        await client.connect();
        return client;
    };

    const createDatabaseAndTrack = async (admin, name) => {
        await admin.query(`CREATE DATABASE "${name}"`);
        createdDatabases.add(name);
    };

    const dropDatabaseIfTracked = async (admin, name) => {
        if (!createdDatabases.has(name)) return;
        await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
        createdDatabases.delete(name);
    };

    const dropAllCreatedDatabases = async (admin) => {
        for (const name of [...createdDatabases]) {
            await dropDatabaseIfTracked(admin, name);
        }
    };

    const seedUser = async (overrides = {}) => {
        const testPassword = crypto.randomBytes(32).toString('hex');
        return prisma.user.create({
            data: {
                email: `refresh-${crypto.randomUUID()}@example.com`,
                username: `refresh-${crypto.randomUUID()}`,
                password: await bcrypt.hash(testPassword, 10),
                firstname: 'Refresh',
                lastname: 'User',
                language: 'en',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
                ...overrides,
            },
        });
    };

    const activeTokensForFamily = async (familyId) => {
        return prisma.refreshToken.count({
            where: { familyId, isRevoked: false },
        });
    };

    /**
     * Wait until a backend transaction is blocked on a lock with a query
     * matching the supplied pattern.
     *
     * @param {string} pattern SQL `ILIKE` pattern for `pg_stat_activity.query`.
     * @param {number} [timeoutMs=2000] How long to wait before failing.
     * @returns {Promise<void>}
     */
    const waitForBlockedQuery = async (pattern, timeoutMs = 2000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const result = await adminClient.query(
                `SELECT count(*)::int AS n
                   FROM pg_stat_activity
                  WHERE wait_event_type = 'Lock'
                    AND state = 'active'
                    AND query ILIKE $1`,
                [pattern]
            );
            if (result.rows[0].n > 0) return;
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error(`Timed out waiting for a locked query matching ${pattern}`);
    };

    beforeAll(async () => {
        try {
            adminClient = await connectPg(ADMIN_DATABASE_URL);

            // Create a database owned by this test run only.
            const mainTestDbName = uniqueDbName('expensetracker_it');
            await createDatabaseAndTrack(adminClient, mainTestDbName);

            const mainTestDbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, mainTestDbName);
            testDbUrl = mainTestDbUrl;
            execSync('npx prisma db push', {
                cwd: backendRoot,
                env: { ...process.env, DATABASE_URL: mainTestDbUrl },
                stdio: 'pipe',
            });

            // Import the real client and service only after the schema exists.
            process.env.DATABASE_URL = mainTestDbUrl;
            prisma = (await import('../../configurations/prisma.connect.js')).default;
            authService = await import('../auth.service.js');
        } catch (error) {
            setupFailed = true;
            throw error;
        }
    });

    afterAll(async () => {
        try {
            // Close every connection into the created databases before dropping.
            await prisma?.$disconnect().catch(() => {});
            if (adminClient) {
                await dropAllCreatedDatabases(adminClient);
            }
        } catch (cleanupError) {
            if (setupFailed) {
                // Do not mask the original setup failure with a cleanup failure.
                console.error('Integration test cleanup failed after setup failure:', cleanupError);
            } else {
                throw cleanupError;
            }
        } finally {
            await adminClient?.end().catch(() => {});
        }
    });

    test('two simultaneous refresh requests cannot both consume the same token', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');
        const originalRecord = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(raw) },
        });

        const results = await Promise.allSettled([
            authService.rotateRefreshToken(raw),
            authService.rotateRefreshToken(raw),
        ]);

        const fulfilled = results.filter((item) => item.status === 'fulfilled');
        const rejected = results.filter((item) => item.status === 'rejected');
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason).toMatchObject({ statusCode: 401 });
        expect(fulfilled[0].value).toHaveProperty('refreshToken');

        expect(await activeTokensForFamily(originalRecord.familyId)).toBe(0);

        await expect(
            authService.rotateRefreshToken(fulfilled[0].value.refreshToken)
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    test('replay revokes the whole family, including the newly rotated token', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const rotated = await authService.rotateRefreshToken(raw);
        const familyRecord = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(rotated.refreshToken) },
        });

        await expect(authService.rotateRefreshToken(raw)).rejects.toMatchObject({ statusCode: 401 });
        expect(await activeTokensForFamily(familyRecord.familyId)).toBe(0);
    });

    test('refresh enforces the same account eligibility as login', async () => {
        const user = await seedUser({ isActive: false, isEmailVerified: false });
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        await expect(authService.rotateRefreshToken(raw)).rejects.toMatchObject({ statusCode: 401 });
        const record = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(raw) },
        });
        expect(await activeTokensForFamily(record.familyId)).toBe(0);
    });

    test('password change revokes all of the user sessions atomically', async () => {
        const user = await seedUser();
        const first = crypto.randomBytes(40).toString('hex');
        const second = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(first, user.id, '127.0.0.1');
        await authService.createRefreshToken(second, user.id, '127.0.0.1');

        await authService.updateUserPassword(
            { id: user.id, email: user.email, language: user.language },
            'new-password'
        );

        const active = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(active).toBe(0);

        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { tokenVersion: true },
        });
        expect(updatedUser.tokenVersion).toBe(user.tokenVersion + 1);
    });

    /**
     * Force the rotation to acquire the user-row lock first, then verify
     * revoke-all still removes the freshly rotated refresh token.
     */
    test('revoke-all revokes a refresh token created by a rotation that won the race', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const lockClient = await connectPg(testDbUrl);
        await lockClient.query('BEGIN');
        await lockClient.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [user.id]);

        const rotatePromise = authService.rotateRefreshToken(raw);
        await waitForBlockedQuery('%FOR UPDATE%');
        const revokeAllPromise = authService.revokeAllUserSessions(user.id);

        try {
            await lockClient.query('COMMIT');
        } finally {
            await lockClient.end();
        }

        const [rotateResult, revokeAllResult] = await Promise.allSettled([
            rotatePromise,
            revokeAllPromise,
        ]);

        expect(rotateResult.status).toBe('fulfilled');
        expect(revokeAllResult.status).toBe('fulfilled');

        const active = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(active).toBe(0);

        await expect(
            authService.rotateRefreshToken(rotateResult.value.refreshToken)
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    /**
     * Force revoke-all to acquire the user-row lock first, then verify a
     * concurrent rotation cannot create a usable session.
     */
    test('rotation loses the race and cannot create a session after revoke-all commits', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const lockClient = await connectPg(testDbUrl);
        await lockClient.query('BEGIN');
        await lockClient.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [user.id]);

        const revokeAllPromise = authService.revokeAllUserSessions(user.id);
        await waitForBlockedQuery('%tokenVersion%');
        const rotatePromise = authService.rotateRefreshToken(raw);

        try {
            await lockClient.query('COMMIT');
        } finally {
            await lockClient.end();
        }

        const [revokeAllResult, rotateResult] = await Promise.allSettled([
            revokeAllPromise,
            rotatePromise,
        ]);

        expect(revokeAllResult.status).toBe('fulfilled');
        expect(rotateResult.status).toBe('rejected');
        expect(rotateResult.reason).toMatchObject({ statusCode: 401 });

        const active = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(active).toBe(0);
    });

    /**
     * The committed baseline migration must reconstruct the refresh_token
     * schema from an empty database with a NOT NULL family_id column plus the
     * family and token indexes. The migration history was rebaselined after the
     * Neon-hosted development database was abandoned, so this asserts the full
     * baseline rather than an incremental ALTER.
     */
    test('baseline migration creates the refresh_token schema with family_id and indexes', async () => {
        const migrationDbName = uniqueDbName('expensetracker_migration');
        await createDatabaseAndTrack(adminClient, migrationDbName);

        const migrationClient = await connectPg(
            replaceDatabaseName(ADMIN_DATABASE_URL, migrationDbName)
        );

        try {
            const migrationSql = await readFile(
                path.join(backendRoot, 'src/prisma/migrations/20261018000000_init/migration.sql'),
                'utf8'
            );
            await migrationClient.query(migrationSql);

            const column = await migrationClient.query(
                "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'refresh_token' AND column_name = 'family_id'"
            );
            expect(column.rows[0].is_nullable).toBe('NO');

            const familyIndex = await migrationClient.query(
                "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'refresh_token' AND indexname = 'refresh_token_family_id_idx'"
            );
            expect(familyIndex.rows[0].n).toBe(1);

            const tokenUniqueIndex = await migrationClient.query(
                "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'refresh_token' AND indexname = 'refresh_token_token_key'"
            );
            expect(tokenUniqueIndex.rows[0].n).toBe(1);
        } finally {
            // Close the connection into the migration DB before dropping it.
            await migrationClient.end().catch(() => {});
            await dropDatabaseIfTracked(adminClient, migrationDbName);
        }
    });

    test('a setup failure still cleans up the database it created', async () => {
        const scratchName = uniqueDbName('expensetracker_failure');
        await createDatabaseAndTrack(adminClient, scratchName);
        expect(createdDatabases.has(scratchName)).toBe(true);

        // Simulate a failure between creation and the rest of initialization.
        try {
            throw new Error('simulated setup failure');
        } catch {
            await dropDatabaseIfTracked(adminClient, scratchName);
        }

        expect(createdDatabases.has(scratchName)).toBe(false);
        const result = await adminClient.query(
            'SELECT 1 AS present FROM pg_database WHERE datname = $1',
            [scratchName]
        );
        expect(result.rowCount).toBe(0);
    });
});
