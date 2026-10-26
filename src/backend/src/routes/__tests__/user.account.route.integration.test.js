/**
 * Database-gated HTTP tests for the authenticated account-management routes.
 *
 * Exercises `POST /api/v1/user/change-password` and the avatar endpoints
 * against the real Express app and a disposable PostgreSQL database, verifying
 * password verification, history-reuse rejection, session revocation, and
 * access-token invalidation.
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

describeDb('user account routes (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let authService;
    let Config;
    let jwt;
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
     * Create an active user with a known password and a versioned bearer JWT.
     *
     * @param {string} password The plaintext password to hash and store.
     * @returns {Promise<{user: object, accessToken: string}>} The user and JWT.
     */
    const seedAuthenticatedUser = async (password = 'Password123') => {
        const suffix = crypto.randomUUID();
        const user = await prisma.user.create({
            data: {
                email: `account-${suffix}@example.com`,
                username: `account-${suffix}`,
                password: await bcrypt.hash(password, 10),
                firstname: 'Account',
                lastname: 'Route',
                language: 'en',
                currency: 'USD',
                timezone: 'UTC',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
        const accessToken = signAccessToken(user);
        return { user, accessToken };
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('account_test');
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
        authService = await import('../../services/auth.service.js');
        Config = (await import('../../configurations/env.config.js')).default;
        jwt = (await import('jsonwebtoken')).default;
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
     * A correct current password changes the password, records history,
     * revokes refresh sessions, and invalidates the old access token.
     */
    test('changes the password and revokes all other sessions', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('Password123');
        const rawRefresh = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(rawRefresh, user.id, '127.0.0.1', null, 'device');

        const response = await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ currentPassword: 'Password123', newPassword: 'NewPassword456' })
            .expect(200);

        expect(response.body.data).toBeNull();

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(await bcrypt.compare('NewPassword456', stored.password)).toBe(true);
        expect(stored.tokenVersion).toBe(user.tokenVersion + 1);

        const revoked = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(rawRefresh) },
        });
        expect(revoked.isRevoked).toBe(true);

        const historyCount = await prisma.passwordHistory.count({ where: { userId: user.id } });
        expect(historyCount).toBe(1);

        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    });

    /**
     * An incorrect current password must be rejected with 401 and leave the
     * stored hash unchanged.
     */
    test('rejects an incorrect current password with 401', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('Password123');

        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ currentPassword: 'WrongPassword', newPassword: 'NewPassword456' })
            .expect(401);

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(await bcrypt.compare('Password123', stored.password)).toBe(true);
    });

    /**
     * Reusing the current password as the new password must be rejected with
     * 409.
     */
    test('rejects current-password reuse with 409', async () => {
        const { accessToken } = await seedAuthenticatedUser('Password123');

        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ currentPassword: 'Password123', newPassword: 'Password123' })
            .expect(409);
    });

    /**
     * Reusing a previous password must be rejected with 409.
     */
    test('rejects password-history reuse with 409', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('Password123');

        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ currentPassword: 'Password123', newPassword: 'SecondPass456' })
            .expect(200);

        const freshToken = signAccessToken({ ...user, tokenVersion: user.tokenVersion + 1 });
        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${freshToken}`)
            .send({ currentPassword: 'SecondPass456', newPassword: 'Password123' })
            .expect(409);
    });

    /**
     * A new password below the policy minimum must be rejected by validation
     * with 400 before any write occurs.
     */
    test('rejects a too-short new password with 400', async () => {
        const { accessToken } = await seedAuthenticatedUser('Password123');

        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ currentPassword: 'Password123', newPassword: 'short' })
            .expect(400);
    });
});
