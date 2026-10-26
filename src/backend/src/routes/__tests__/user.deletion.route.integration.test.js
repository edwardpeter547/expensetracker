/**
 * Database-gated HTTP tests for the account deletion lifecycle.
 *
 * Covers voluntary closure (deactivation, session revocation, 14-day
 * scheduling, cancellation), durable erasure through the worker, statutory
 * erasure without the recovery delay, and secret-free data export.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

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
    throw new Error('Refusing to run integration tests: TEST_DATABASE_URL must point at localhost');
}

const describeDb = RUN_DB ? describe : describe.skip;
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

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

describeDb('user deletion routes (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let Config;
    let jwt;
    let authService;
    let deletionService;
    let worker;
    let adminClient;
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
     * Sign a versioned access token for a user.
     *
     * @param {object} user The user to sign the token for.
     * @returns {string} The signed JWT.
     */
    const signAccessToken = (user) => jwt.sign(
        { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
        Config.jwtSecret,
        {
            expiresIn: '15m',
            algorithm: 'HS256',
            issuer: Config.jwtIssuer,
            audience: Config.jwtAudience,
        }
    );

    /**
     * Create an active user with data and a versioned bearer JWT.
     *
     * @returns {Promise<{user: object, accessToken: string}>} The user and JWT.
     */
    const seedUserWithData = async () => {
        const suffix = crypto.randomUUID();
        const user = await prisma.user.create({
            data: {
                email: `deletion-${suffix}@example.com`,
                username: `deletion-${suffix}`,
                password: await bcrypt.hash('Password123', 10),
                firstname: 'Deletion',
                lastname: 'Route',
                language: 'en',
                currency: 'USD',
                timezone: 'UTC',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
        await prisma.category.create({ data: { name: 'Food', isSystem: false, userId: user.id } });
        await prisma.transaction.create({
            data: {
                amount: 12.5,
                currency: 'USD',
                transType: 'EXPENSE',
                category: 'Food',
                transactionDate: new Date(),
                userId: user.id,
            },
        });
        return { user, accessToken: signAccessToken(user) };
    };

    beforeAll(async () => {
        process.env.STORAGE_DRIVER = 'local';

        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('deletion_test');
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        createdDatabases.add(dbName);

        const dbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, dbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'ignore',
        });
        process.env.DATABASE_URL = dbUrl;

        app = (await import('../../app.js')).default;
        prisma = (await import('../../configurations/prisma.connect.js')).default;
        Config = (await import('../../configurations/env.config.js')).default;
        jwt = (await import('jsonwebtoken')).default;
        authService = await import('../../services/auth.service.js');
        deletionService = await import('../../account-deletion/deletion/service.js');
        worker = await import('../../account-deletion/deletion/worker.js');
    });

    afterAll(async () => {
        await prisma?.$disconnect().catch(() => {});
        if (adminClient) {
            for (const name of [...createdDatabases]) {
                await adminClient.query(`DROP DATABASE IF EXISTS "${name}"`).catch(() => {});
                createdDatabases.delete(name);
            }
            await adminClient.end();
        }
    });

    /**
     * Requesting closure deactivates the account, revokes sessions, invalidates
     * access tokens, and schedules the 14-day recovery deadline.
     */
    test('requests closure and immediately revokes access', async () => {
        const { user, accessToken } = await seedUserWithData();
        const rawRefresh = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(rawRefresh, user.id, '127.0.0.1', null, 'device');

        const response = await request(app)
            .post('/api/v1/user/deletion-request')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ password: 'Password123', confirmation: 'DELETE' })
            .expect(202);

        expect(response.body.data.recoveryDeadline).toBeDefined();

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(stored.isActive).toBe(false);
        expect(stored.tokenVersion).toBe(user.tokenVersion + 1);
        expect(await prisma.refreshToken.count({ where: { userId: user.id, isRevoked: false } })).toBe(0);

        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    });

    /**
     * Cancelling within the recovery window reactivates the account.
     */
    test('cancels an eligible closure and reactivates the account', async () => {
        const { user, accessToken } = await seedUserWithData();
        await request(app)
            .post('/api/v1/user/deletion-request')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ password: 'Password123', confirmation: 'DELETE' })
            .expect(202);

        await request(app)
            .delete('/api/v1/user/deletion-request')
            .send({ email: user.email, password: 'Password123' })
            .expect(200);

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(stored.isActive).toBe(true);
    });

    /**
     * The worker erases every user-owned data category and finalizes the
     * request once the recovery deadline has passed.
     */
    test('erases all user data through the durable worker', async () => {
        const { user, accessToken } = await seedUserWithData();
        await request(app)
            .post('/api/v1/user/deletion-request')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ password: 'Password123', confirmation: 'DELETE' })
            .expect(202);

        const past = new Date(Date.now() - 1000);
        await prisma.accountDeletionRequest.updateMany({
            where: { userId: user.id },
            data: { scheduledFor: past, recoveryDeadline: past },
        });

        const results = await worker.processDueDeletionRequests({});

        expect(results.some((r) => r.status === 'COMPLETED')).toBe(true);
        expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
        expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
        expect(await prisma.category.count({ where: { userId: user.id } })).toBe(0);

        const storedRequest = await prisma.accountDeletionRequest.findFirst({ where: { userId: user.id } });
        expect(storedRequest.status).toBe('COMPLETED');
    });

    /**
     * A statutory erasure request is scheduled immediately and is not delayed
     * by the voluntary recovery window.
     */
    test('processes statutory erasure without a recovery delay', async () => {
        const { user } = await seedUserWithData();
        const created = await deletionService.createStatutoryErasureRequest({ userId: user.id });
        expect(created.status).toBe('PENDING_DELETION');

        await worker.processDueDeletionRequests({});

        expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    });

    /**
     * The export endpoint returns financial data without secrets.
     */
    test('exports data without credentials', async () => {
        const { user, accessToken } = await seedUserWithData();

        const response = await request(app)
            .post('/api/v1/user/data-export')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.schemaVersion).toBe(1);
        expect(JSON.stringify(response.body)).not.toContain('password');
        expect(JSON.stringify(response.body)).not.toContain('tokenVersion');
        expect(response.body.transactions).toHaveLength(1);
    });
});
