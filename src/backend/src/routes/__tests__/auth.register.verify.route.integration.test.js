/**
 * Database-gated integration tests for registration, email verification, and
 * verification resend behavior.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.AUTH_RATE_LIMIT_REGISTER_MAX = '1000';
process.env.AUTH_RATE_LIMIT_RESEND_MAX = '1000';

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
    throw new Error('Refusing to run integration tests: TEST_DATABASE_URL must be localhost');
}

const describeDb = RUN_DB ? describe : describe.skip;
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

const credentials = () => ({
    email: `${crypto.randomBytes(6).toString('hex')}@example.com`,
    username: `user${crypto.randomBytes(6).toString('hex')}`,
    password: 'Password123',
    firstName: 'First',
    lastName: 'Last',
});

describeDb('auth registration and verification (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let adminClient;
    const createdDatabases = new Set();

    const connectPg = async (url) => {
        const client = new Client({connectionString: url});
        await client.connect();
        return client;
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('register_test');
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        createdDatabases.add(dbName);

        const dbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, dbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: {...process.env, DATABASE_URL: dbUrl},
            stdio: 'ignore',
        });
        process.env.DATABASE_URL = dbUrl;

        prisma = (await import('../../configurations/prisma.connect.js')).default;
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

    test('registration returns a safe projection and an inactive session', async () => {
        const body = credentials();
        const response = await request(app).post('/api/v1/auth/register').send(body).expect(201);

        expect(response.body.data.user).not.toHaveProperty('password');
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();

        const protectedResponse = await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${response.body.data.accessToken}`)
            .expect(401);
        expect(protectedResponse.body.success).toBe(false);
    });

    test('duplicate email registration is rejected', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        await request(app).post('/api/v1/auth/register').send(body).expect(409);
    });

    test('invalid registration input is rejected', async () => {
        const body = credentials();
        delete body.password;
        await request(app).post('/api/v1/auth/register').send(body).expect(400);
    });

    test('a valid verification token activates the user exactly once', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});
        const token = await prisma.verificationToken.findFirst({where: {userId: user.id}});

        await request(app).get(`/api/v1/auth/verify-email?token=${token.token}`).expect(200);

        const refreshed = await prisma.user.findUnique({where: {id: user.id}});
        expect(refreshed.isActive).toBe(true);
        expect(refreshed.isEmailVerified).toBe(true);

        await request(app).get(`/api/v1/auth/verify-email?token=${token.token}`).expect(400);
    });

    test('invalid and expired verification tokens are rejected', async () => {
        await request(app).get('/api/v1/auth/verify-email?token=invalid-token').expect(400);

        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});
        await prisma.verificationToken.create({
            data: {userId: user.id, token: 'expired-token', expiresAt: new Date(Date.now() - 60000)},
        });
        await request(app).get('/api/v1/auth/verify-email?token=expired-token').expect(400);
    });

    test('resend verification returns a uniform response without enumeration', async () => {
        const unknown = await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: 'missing@example.com'})
            .expect(200);

        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});
        const beforeToken = await prisma.verificationToken.findFirst({where: {userId: user.id}});

        const unverified = await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: body.email})
            .expect(200);
        const afterToken = await prisma.verificationToken.findFirst({where: {userId: user.id}});

        await prisma.user.create({
            data: {
                email: 'verified@example.com',
                username: 'verifieduser',
                password: 'irrelevant',
                firstname: 'Verified',
                lastname: 'User',
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: false,
            },
        });

        const already = await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: 'verified@example.com'});

        expect(unknown.body.message).toBe(unverified.body.message);
        expect(unknown.body.data).toBeNull();
        expect(unverified.body.data).toBeNull();
        expect(already.status).toBe(200);
        expect(already.body.message).toBe(unverified.body.message);
        expect(afterToken.token).not.toBe(beforeToken.token);
    });
});
