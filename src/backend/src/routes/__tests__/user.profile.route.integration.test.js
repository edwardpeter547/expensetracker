/**
 * Database-gated HTTP tests for the authenticated user profile routes.
 *
 * Exercises GET/PUT `/api/v1/user/profile` against the real Express app and a
 * disposable PostgreSQL database, verifying safe projections, field updates,
 * validation, and authentication requirements.
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

describeDb('user profile routes (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
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
     * Create an active user and sign a versioned bearer JWT for it.
     *
     * @returns {Promise<{user: object, accessToken: string}>} The user and JWT.
     */
    const seedAuthenticatedUser = async () => {
        const suffix = crypto.randomUUID();
        const user = await prisma.user.create({
            data: {
                email: `profile-${suffix}@example.com`,
                username: `profile-${suffix}`,
                password: await bcrypt.hash('Password123', 10),
                firstname: 'Profile',
                lastname: 'User',
                language: 'en',
                currency: 'USD',
                timezone: 'UTC',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
            Config.jwtSecret,
            {
                expiresIn: '15m',
                algorithm: 'HS256',
                issuer: Config.jwtIssuer,
                audience: Config.jwtAudience,
            }
        );
        return { user, accessToken };
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('profile_test');
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
     * The authenticated user can read their own profile, which must not
     * include password or credential material.
     */
    test('returns the authenticated user safe profile', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();

        const response = await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.data.profile.id).toBe(user.id);
        expect(response.body.data.profile.email).toBe(user.email);
        expect(JSON.stringify(response.body)).not.toContain(user.password);
        expect(response.body.data.profile).not.toHaveProperty('password');
    });

    /**
     * The authenticated user can update editable profile fields and receives
     * a safe projection.
     */
    test('updates the authenticated user profile', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();

        const response = await request(app)
            .put('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ firstname: 'Updated', timezone: 'Europe/London', currency: 'GBP' })
            .expect(200);

        expect(response.body.data.profile.firstname).toBe('Updated');
        expect(response.body.data.profile.timezone).toBe('Europe/London');
        expect(response.body.data.profile.currency).toBe('GBP');
        expect(response.body.data.profile).not.toHaveProperty('password');

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(stored.firstname).toBe('Updated');
        expect(stored.timezone).toBe('Europe/London');
        expect(stored.currency).toBe('GBP');
    });

    /**
     * Invalid profile input is rejected by the validation layer before any
     * write occurs.
     */
    test('rejects invalid profile updates', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();

        await request(app)
            .put('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ username: 'x' })
            .expect(400);

        const stored = await prisma.user.findUnique({ where: { id: user.id } });
        expect(stored.username).toBe(user.username);
    });

    /**
     * The profile DTO exposes derived display-name/avatar fields and must not
     * leak credential metadata or unneeded personal identifiers.
     */
    test('profile DTO omits credentials and personal identifiers', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();

        const response = await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        const profile = response.body.data.profile;
        expect(profile.displayName).toBe('Profile User');
        expect(profile.avatar).toMatchObject({ isDefault: true, initials: 'PU' });
        expect(profile).not.toHaveProperty('tokenVersion');
        expect(profile).not.toHaveProperty('dateOfBirth');
        expect(profile).not.toHaveProperty('mobileNumber');
        expect(profile).not.toHaveProperty('password');
    });

    /**
     * A username update that collides with another user's normalized username
     * must be rejected with 409 and leave the row unchanged.
     */
    test('rejects a duplicate username with 409', async () => {
        const { accessToken } = await seedAuthenticatedUser();
        const other = await seedAuthenticatedUser();
        const target = `taken${crypto.randomBytes(4).toString('hex')}`;
        await prisma.user.update({ where: { id: other.user.id }, data: { username: target } });

        await request(app)
            .put('/api/v1/user/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ username: target.toUpperCase() })
            .expect(409);
    });

    /**
     * Profile routes require a valid access token.
     */
    test('rejects unauthenticated profile access', async () => {
        await request(app).get('/api/v1/user/profile').expect(401);
        await request(app).put('/api/v1/user/profile').send({ firstname: 'Nope' }).expect(401);
    });
});
