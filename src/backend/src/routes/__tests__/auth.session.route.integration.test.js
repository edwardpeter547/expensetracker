/**
 * HTTP-level integration tests for the device-session endpoints.
 *
 * The `.integration.test.js` suffix marks this suite as database-gated so it
 * is discovered by `task test:integration`. Tests run against a disposable
 * local PostgreSQL database and exercise the real Express app, verifying list,
 * per-session revocation, revoke-all, cross-user isolation, and that revoked
 * sessions can no longer refresh.
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

describeDb('auth session routes (HTTP, real PostgreSQL)', () => {
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
     * Sign a versioned access token for a user.
     *
     * @param {object} user The user to sign the token for.
     * @param {number} [tokenVersion=user.tokenVersion] The token version claim.
     * @returns {string} The signed JWT.
     */
    const signAccessToken = (user, tokenVersion = user.tokenVersion) => jwt.sign(
        { userId: user.id, email: user.email, tokenVersion },
        Config.jwtSecret,
        {
            expiresIn: '15m',
            algorithm: 'HS256',
            issuer: Config.jwtIssuer,
            audience: Config.jwtAudience,
        }
    );

    /**
     * Create an active user and sign a versioned bearer JWT for it.
     *
     * @param {string} label A stable label for the user's email/username.
     * @returns {Promise<{user: object, accessToken: string}>} The user and JWT.
     */
    const seedAuthenticatedUser = async (label) => {
        const suffix = crypto.randomUUID();
        const user = await prisma.user.create({
            data: {
                email: `${label}-${suffix}@example.com`,
                username: `${label}-${suffix}`,
                password: await bcrypt.hash('Password123', 10),
                firstname: 'Session',
                lastname: 'Route',
                language: 'en',
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
        const mainTestDbName = uniqueDbName('expensetracker_session_route');
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
     * Session listing requires authentication and returns only the caller's
     * active sessions with device metadata and no raw token material.
     */
    test('lists only the authenticated user active sessions with metadata', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('sessions-owner');
        const other = await seedAuthenticatedUser('sessions-other');
        const firstRaw = crypto.randomBytes(40).toString('hex');
        const secondRaw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(firstRaw, user.id, '127.0.0.1', null, 'device-one');
        await authService.createRefreshToken(secondRaw, user.id, '192.168.1.5', null, 'device-two');
        await authService.createRefreshToken(
            crypto.randomBytes(40).toString('hex'),
            other.user.id,
            '127.0.0.1',
            null,
            'other-device'
        );

        const response = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessions).toHaveLength(2);
        expect(JSON.stringify(response.body)).not.toContain(firstRaw);
        expect(JSON.stringify(response.body)).not.toContain(secondRaw);
        expect(response.body.data.sessions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    createdByIp: '127.0.0.1',
                    userAgent: 'device-one',
                }),
                expect.objectContaining({
                    createdByIp: '192.168.1.5',
                    userAgent: 'device-two',
                }),
            ])
        );
    });

    /**
     * Expired refresh-token records are not device sessions and must be
     * omitted from the listing.
     */
    test('excludes expired refresh-token records from session listing', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('sessions-expired');
        const activeRaw = crypto.randomBytes(40).toString('hex');
        const expiredRaw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(activeRaw, user.id, '127.0.0.1', null, 'active-device');
        await authService.createRefreshToken(expiredRaw, user.id, '127.0.0.1', null, 'expired-device');

        await prisma.refreshToken.updateMany({
            where: { token: authService.hashToken(expiredRaw) },
            data: { expiresAt: new Date(Date.now() - 60 * 1000) },
        });

        const response = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.sessions).toHaveLength(1);
        expect(response.body.data.sessions[0].userAgent).toBe('active-device');
    });

    /**
     * A refresh rotation replaces the previous session record for the same
     * device instead of duplicating it.
     */
    test('represents a rotated device session as a single active record', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('sessions-rotated');
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1', null, 'rotating-device');

        const before = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(before.body.data.sessions).toHaveLength(1);
        const oldId = before.body.data.sessions[0].id;

        const rotated = await authService.rotateRefreshToken(raw);
        const after = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(after.body.data.sessions).toHaveLength(1);
        expect(after.body.data.sessions[0].id).not.toBe(oldId);
        expect(after.body.data.sessions[0].userAgent).toBe('rotating-device');
        expect(JSON.stringify(after.body)).not.toContain(rotated.refreshToken);
    });

    /**
     * A user can revoke one of their sessions without affecting the others.
     */
    test('revokes one session while leaving the other sessions active', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('revoke-one');
        const keepRaw = crypto.randomBytes(40).toString('hex');
        const revokeRaw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(keepRaw, user.id, '127.0.0.1');
        await authService.createRefreshToken(revokeRaw, user.id, '127.0.0.1');

        const target = await prisma.refreshToken.findUnique({
            where: { token: authService.hashToken(revokeRaw) },
            select: { id: true },
        });

        const revoked = await request(app)
            .delete(`/api/v1/auth/sessions/${target.id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(revoked.status).toBe(200);

        const listAfter = await request(app)
            .get('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(listAfter.body.data.sessions).toHaveLength(1);

        // Both raw tokens still exist in storage; identify which one was
        // revoked by attempting refresh, which must fail for the target.
        const refreshable = [];
        for (const raw of [keepRaw, revokeRaw]) {
            try {
                await authService.rotateRefreshToken(raw);
                refreshable.push(raw);
            } catch {
                // Expected for the revoked session.
            }
        }
        expect(refreshable).toEqual([keepRaw]);
    });

    /**
     * Revoke-all removes every refresh-token session for the caller and each
     * revoked session is no longer refreshable.
     */
    test('revoke-all invalidates access and refresh tokens across multiple devices', async () => {
        const { user, accessToken } = await seedAuthenticatedUser('revoke-all');
        const firstRaw = crypto.randomBytes(40).toString('hex');
        const secondRaw = crypto.randomBytes(40).toString('hex');
        const firstAccessToken = signAccessToken(user);
        const secondAccessToken = signAccessToken(user);
        await authService.createRefreshToken(firstRaw, user.id, '127.0.0.1', null, 'device-one');
        await authService.createRefreshToken(secondRaw, user.id, '192.168.1.5', null, 'device-two');

        const response = await request(app)
            .delete('/api/v1/auth/sessions')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        expect(updated.tokenVersion).toBe(user.tokenVersion + 1);

        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${firstAccessToken}`)
            .expect(401);
        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${secondAccessToken}`)
            .expect(401);

        await expect(authService.rotateRefreshToken(firstRaw)).rejects.toMatchObject({
            statusCode: 401,
        });
        await expect(authService.rotateRefreshToken(secondRaw)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    /**
     * A user cannot revoke another user's session; the request is a 404 and
     * the victim's refresh token remains valid.
     */
    test('does not let a user revoke another user session', async () => {
        const owner = await seedAuthenticatedUser('session-victim');
        const attacker = await seedAuthenticatedUser('session-attacker');
        const ownerRaw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(ownerRaw, owner.user.id, '127.0.0.1');

        const stored = await prisma.refreshToken.findFirst({
            where: { token: authService.hashToken(ownerRaw) },
            select: { id: true },
        });

        const response = await request(app)
            .delete(`/api/v1/auth/sessions/${stored.id}`)
            .set('Authorization', `Bearer ${attacker.accessToken}`);

        expect(response.status).toBe(404);
        await expect(authService.rotateRefreshToken(ownerRaw)).resolves.toHaveProperty('refreshToken');
    });

    /**
     * Listing sessions without an access token must be rejected with 401.
     */
    test('rejects session listing without authentication', async () => {
        const response = await request(app).get('/api/v1/auth/sessions');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});
