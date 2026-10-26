/**
 * Database-gated HTTP tests for the avatar upload, retrieval, replacement, and
 * removal lifecycle.
 *
 * Runs against the real Express app with a disposable PostgreSQL database and
 * the local filesystem storage adapter writing to a temporary directory.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
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

describeDb('user avatar routes (HTTP, real PostgreSQL, local storage)', () => {
    let app;
    let prisma;
    let Config;
    let jwt;
    let adminClient;
    let storageRoot;
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
     * @returns {Promise<{user: object, accessToken: string}>} The user and JWT.
     */
    const seedAuthenticatedUser = async () => {
        const suffix = crypto.randomUUID();
        const user = await prisma.user.create({
            data: {
                email: `avatar-${suffix}@example.com`,
                username: `avatar-${suffix}`,
                password: await bcrypt.hash('Password123', 10),
                firstname: 'Avatar',
                lastname: 'Route',
                language: 'en',
                currency: 'USD',
                timezone: 'UTC',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
        return { user, accessToken: signAccessToken(user) };
    };

    /**
     * Read the stored avatar key for a user.
     *
     * @param {number} userId The owning user id.
     * @returns {Promise<string|null>} The stored key.
     */
    const storedAvatarKey = async (userId) => {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
        return user.avatar ?? null;
    };

    beforeAll(async () => {
        storageRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'expensetracker-avatar-'));
        process.env.STORAGE_DRIVER = 'local';
        process.env.STORAGE_LOCAL_ROOT = storageRoot;
        process.env.AVATAR_UPLOAD_LIMIT_BYTES = '1024';

        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('avatar_test');
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
        await fs.promises.rm(storageRoot, { recursive: true, force: true }).catch(() => {});
    });

    /**
     * Uploading a valid image stores it, atomically references it, and returns
     * the updated profile DTO.
     */
    test('uploads an avatar and returns the updated profile', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();

        const response = await request(app)
            .post('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', png, { filename: 'avatar.png', contentType: 'image/png' })
            .expect(200);

        expect(response.body.data.profile.avatar.isDefault).toBe(false);
        expect(response.body.data.profile.avatar.url).toContain('/api/v1/user/avatar');
        const key = await storedAvatarKey(user.id);
        expect(key).toMatch(/^avatars\/\d+\/[0-9a-f-]{36}\.webp$/);
    });

    /**
     * Retrieving the authenticated user's avatar returns the normalized WebP
     * image with cache and ETag headers.
     */
    test('retrieves the uploaded avatar as WebP', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
        await request(app)
            .post('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', png, { filename: 'avatar.png', contentType: 'image/png' })
            .expect(200);

        const response = await request(app)
            .get('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.headers['content-type']).toContain('image/webp');
        expect(response.headers.etag).toBeDefined();
        const metadata = await sharp(response.body).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(512);
    });

    /**
     * Replacing an avatar writes a new object and removes the previous object
     * from storage after the database reference changes.
     */
    test('replaces an avatar and cleans up the previous object', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();

        await request(app).post('/api/v1/user/avatar').set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', png, { filename: 'one.png', contentType: 'image/png' }).expect(200);
        const firstKey = await storedAvatarKey(user.id);

        await request(app).post('/api/v1/user/avatar').set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', png, { filename: 'two.png', contentType: 'image/png' }).expect(200);
        const secondKey = await storedAvatarKey(user.id);

        expect(secondKey).not.toBe(firstKey);
        const files = await fs.promises.readdir(path.join(storageRoot, 'avatars', String(user.id)));
        expect(files).toHaveLength(1);
        expect(files[0]).toBe(secondKey.split('/').pop());
    });

    /**
     * Removing a custom avatar clears the reference, deletes the object, and
     * restores the default avatar.
     */
    test('removes a custom avatar and restores the default', async () => {
        const { user, accessToken } = await seedAuthenticatedUser();
        const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
        await request(app).post('/api/v1/user/avatar').set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', png, { filename: 'avatar.png', contentType: 'image/png' }).expect(200);

        const response = await request(app)
            .delete('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.data.profile.avatar.isDefault).toBe(true);
        expect(await storedAvatarKey(user.id)).toBeNull();
        const getResponse = await request(app)
            .get('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        expect(getResponse.headers['content-type']).toContain('image/svg+xml');
    });

    /**
     * A file larger than the configured limit is rejected with 413.
     */
    test('rejects an oversized file with 413', async () => {
        const { accessToken } = await seedAuthenticatedUser();

        await request(app)
            .post('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', Buffer.alloc(2048), { filename: 'big.png', contentType: 'image/png' })
            .expect(413);
    });

    /**
     * A non-image content type is rejected with 415.
     */
    test('rejects an unsupported media type with 415', async () => {
        const { accessToken } = await seedAuthenticatedUser();

        await request(app)
            .post('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', Buffer.from('plain text'), { filename: 'avatar.txt', contentType: 'text/plain' })
            .expect(415);
    });

    /**
     * Corrupt bytes declared as an image are rejected by content inspection
     * with 415.
     */
    test('rejects a corrupt image with 415', async () => {
        const { accessToken } = await seedAuthenticatedUser();

        await request(app)
            .post('/api/v1/user/avatar')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('avatar', Buffer.from('not-a-real-image'), { filename: 'bad.png', contentType: 'image/png' })
            .expect(415);
    });

    /**
     * Avatar routes require authentication.
     */
    test('rejects unauthenticated avatar access', async () => {
        await request(app).post('/api/v1/user/avatar').expect(401);
        await request(app).get('/api/v1/user/avatar').expect(401);
        await request(app).delete('/api/v1/user/avatar').expect(401);
    });
});
