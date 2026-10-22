/**
 * HTTP-level integration tests for the logout route.
 *
 * These tests exercise the real Express app with Supertest against a disposable
 * PostgreSQL instance, covering authentication, validation, idempotency,
 * cross-user isolation, and the response envelope end to end.
 *
 * Safety contract: runs only when RUN_DB_INTEGRATION=1; TEST_DATABASE_URL must
 * be a localhost administrative connection. The suite creates its own database
 * and drops only what it created.
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

describeDb('auth logout route (HTTP, real PostgreSQL)', () => {
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
     * Drop every database this run created.
     *
     * @param {Client} admin An administrative client.
     * @returns {Promise<void>}
     */
    const dropAllCreatedDatabases = async (admin) => {
        for (const name of [...createdDatabases]) {
            await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
            createdDatabases.delete(name);
        }
    };

    /**
     * Create a fresh active user and sign a bearer JWT for it.
     *
     * @returns {Promise<{user: object, token: string}>} The user and its JWT.
     */
    const seedAuthenticatedUser = async () => {
        const testPassword = crypto.randomBytes(32).toString('hex');
        const user = await prisma.user.create({
            data: {
                email: `refresh-${crypto.randomUUID()}@example.com`,
                username: `refresh-${crypto.randomUUID()}`,
                password: await bcrypt.hash(testPassword, 10),
                firstname: 'Route',
                lastname: 'Logout',
                language: 'en',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
        const accessToken = jwt.sign({ userId: user.id, email: user.email }, Config.jwtSecret, { expiresIn: '15m' });
        return { user, accessToken };
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const mainTestDbName = uniqueDbName('expensetracker_logout_route');
        await createDatabaseAndTrack(adminClient, mainTestDbName);

        const mainTestDbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, mainTestDbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: mainTestDbUrl },
            stdio: 'pipe',
        });

        process.env.DATABASE_URL = mainTestDbUrl;
        app = (await import('../../app.js')).default;
        prisma = (await import('../../configurations/prisma.connect.js')).default;
        authService = await import('../../services/auth.service.js');
        Config = (await import('../../configurations/env.config.js')).default;
        jwt = (await import('jsonwebtoken')).default;
    });

    afterAll(async () => {
        await prisma?.$disconnect().catch(() => {});
        if (adminClient) await dropAllCreatedDatabases(adminClient);
        await adminClient?.end().catch(() => {});
    });

    /**
     * A request without an Authorization bearer token must be rejected with
     * 401 before any logout work is performed.
     */
    test('rejects missing authentication with 401', async () => {
        const response = await request(app)
            .post('/api/v1/auth/logout')
            .send({ refreshToken: 'a'.repeat(80) });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    /**
     * An authenticated request with no refresh token must fail validation
     * with a non-2xx status and a failed envelope.
     */
    test('rejects a missing refresh token with a validation error', async () => {
        const { accessToken } = await seedAuthenticatedUser();

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    /**
     * An authenticated request with a malformed refresh token must fail
     * validation with a non-2xx status and a failed envelope.
     */
    test('rejects a malformed refresh token with a validation error', async () => {
        const { accessToken } = await seedAuthenticatedUser();

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken: 'not-a-token' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    /**
     * A valid authenticated logout must return 200 with the standard
     * `{ success, message, data, errors }` envelope and revoke the token.
     */
    test('performs a valid logout and returns the response envelope', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken: raw });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(expect.objectContaining({
            success: true,
            message: expect.any(String),
            errors: null,
        }));
        expect(response.body).toHaveProperty('data');

        const stored = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(raw) },
        });
        expect(stored.isRevoked).toBe(true);
    });

    /**
     * Repeating the same logout must remain idempotent and return 200.
     */
    test('repeated logout returns 200 both times', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');

        const first = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken: raw });
        const second = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken: raw });

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
    });

    /**
     * Logging out with another user's token must not revoke that token. The
     * cross-user request is idempotent, and the victim's token stays usable.
     */
    test('does not revoke another user token', async () => {
        const owner = await seedAuthenticatedUser();
        const attacker = await seedAuthenticatedUser();
        const ownerToken = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(ownerToken, owner.user.id, '127.0.0.1');

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${attacker.accessToken}`)
            .send({ refreshToken: ownerToken });

        expect(response.status).toBe(200);
        await expect(authService.rotateRefreshToken(ownerToken)).resolves.toHaveProperty('refreshToken');
    });
});
