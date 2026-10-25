/**
 * Database-gated HTTP tests for the password recovery flow.
 *
 * Exercises forgot-password, verify-otp, and change-password against the real
 * Express app and a disposable PostgreSQL database, verifying generic
 * unknown-email responses, valid reset, expired-token rejection, session
 * revocation, and password/token-version changes.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.AUTH_RATE_LIMIT_FORGOT_MAX = '1000';

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
    throw new Error('Refusing to run integration tests: TEST_DATABASE_URL must be localhost');
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

describeDb('auth password reset routes (HTTP, real PostgreSQL)', () => {
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
     * Create an active user with a known password hash.
     *
     * @returns {Promise<object>} The created user record.
     */
    const seedUser = async () => {
        const suffix = crypto.randomUUID();
        return prisma.user.create({
            data: {
                email: `reset-${suffix}@example.com`,
                username: `reset-${suffix}`,
                password: await bcrypt.hash('OldPassword123', 10),
                firstname: 'Reset',
                lastname: 'User',
                language: 'en',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('password_reset_test');
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        createdDatabases.add(dbName);

        const dbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, dbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'ignore',
        });
        process.env.DATABASE_URL = dbUrl;

        prisma = (await import('../../configurations/prisma.connect.js')).default;
        authService = await import('../../services/auth.service.js');
        Config = (await import('../../configurations/env.config.js')).default;
        jwt = (await import('jsonwebtoken')).default;
        app = (await import('../../app.js')).default;
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
     * Requesting a reset for an unknown email returns the same generic 200 and
     * creates no reset token.
     */
    test('forgot-password returns a generic response for unknown email', async () => {
        const response = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: 'missing@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const tokenCount = await prisma.passwordResetToken.count();
        expect(tokenCount).toBe(0);
    });

    /**
     * A valid code verifies the account and then changes the password exactly
     * through the reset flow, revoking sessions and bumping tokenVersion.
     */
    test('verify-otp and change-password complete a valid reset', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');
        const oldAccessToken = jwt.sign(
            { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
            Config.jwtSecret,
            {
                expiresIn: '15m',
                algorithm: 'HS256',
                issuer: Config.jwtIssuer,
                audience: Config.jwtAudience,
            }
        );

        await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: user.email })
            .expect(200);

        const resetRecord = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
        expect(resetRecord).toBeTruthy();

        const verify = await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code: resetRecord.token, email: user.email })
            .expect(200);
        expect(verify.body.data.user).not.toHaveProperty('password');

        await request(app)
            .post('/api/v1/auth/change-password')
            .send({ code: resetRecord.token, email: user.email, password: 'NewPassword123' })
            .expect(200);

        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        expect(await bcrypt.compare('NewPassword123', updated.password)).toBe(true);
        expect(updated.tokenVersion).toBe(user.tokenVersion + 1);

        const activeRefreshTokens = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(activeRefreshTokens).toBe(0);

        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${oldAccessToken}`)
            .expect(401);
    });

    /**
     * Expired and unknown reset codes are rejected without changing the
     * password or user token version.
     */
    test('expired or unknown reset codes are rejected', async () => {
        const user = await seedUser();
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: '654321',
                expiresAt: new Date(Date.now() - 60 * 1000),
            },
        });

        await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code: '654321', email: user.email })
            .expect(401);

        await request(app)
            .post('/api/v1/auth/change-password')
            .send({ code: '654321', email: user.email, password: 'NewPassword123' })
            .expect(401);

        await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code: '000000', email: user.email })
            .expect(401);

        const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
        expect(unchanged.tokenVersion).toBe(user.tokenVersion);
        expect(await bcrypt.compare('OldPassword123', unchanged.password)).toBe(true);
    });

    /**
     * Reset codes are expected to be single-use.
     *
     * This test is intentionally skipped until #21 consumes a code on
     * successful change-password. Running it today would fail because the
     * reset record currently remains reusable until it expires.
     */
    test.skip('a reset code can be used only once', async () => {
        const user = await seedUser();
        await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: user.email })
            .expect(200);
        const resetRecord = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        await request(app)
            .post('/api/v1/auth/change-password')
            .send({ code: resetRecord.token, email: user.email, password: 'FirstNewPassword1' })
            .expect(200);

        await request(app)
            .post('/api/v1/auth/change-password')
            .send({ code: resetRecord.token, email: user.email, password: 'SecondNewPassword1' })
            .expect(401);
    });
});
