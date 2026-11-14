/**
 * Database-gated integration tests for registration, six-digit email
 * verification, resend cooldown, and the unverified-account login/refresh
 * restrictions.
 *
 * The email service is mocked so the six-digit code can be captured without
 * delivering real mail. The suite is skipped unless `RUN_DB_INTEGRATION=1`
 * and `TEST_DATABASE_URL` points at a disposable localhost database.
 */
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.AUTH_RATE_LIMIT_REGISTER_MAX = '1000';
process.env.AUTH_RATE_LIMIT_RESEND_MAX = '1000';
process.env.VERIFICATION_ATTEMPT_LIMIT = '3';
process.env.VERIFICATION_RESEND_COOLDOWN_MINUTES = '1';

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
const servicesDirectory = path.resolve(backendRoot, 'src/services');

const capturedCodes = { registration: [], resend: [] };

const mockEmailService = {
    sendRegistrationComplete: jest.fn(async (user, code) => {
        capturedCodes.registration.push({ email: user.email, code });
    }),
    sendVerificationConfirmation: jest.fn(async () => {}),
    resendEmailVerificationCode: jest.fn(async (user, code) => {
        capturedCodes.resend.push({ email: user.email, code });
    }),
    sendPasswordResetCode: jest.fn(async () => {}),
};

jest.unstable_mockModule(
    path.join(servicesDirectory, 'email.service.js'),
    () => ({ default: mockEmailService })
);

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
    let hashVerificationCode;
    let hashToken;
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
        const authService = await import('../../services/auth.service.js');
        hashVerificationCode = authService.hashVerificationCode;
        hashToken = authService.hashToken;
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

    test('registration returns a safe projection without issuing tokens', async () => {
        const body = credentials();
        const response = await request(app).post('/api/v1/auth/register').send(body).expect(201);

        expect(response.body.data.user).not.toHaveProperty('password');
        expect(response.body.data).not.toHaveProperty('accessToken');
        expect(response.body.data).not.toHaveProperty('refreshToken');

        const user = await prisma.user.findUnique({where: {email: body.email}});
        expect(user.isActive).toBe(false);
        expect(user.isEmailVerified).toBe(false);

        const code = await prisma.verificationToken.findFirst({where: {userId: user.id}});
        expect(code.tokenHash).not.toContain(capturedCodes.registration.at(-1).code);
        expect(code.usedAt).toBeNull();
        expect(code.attempts).toBe(0);
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

    /**
     * The code delivered to the captured registration email must activate the
     * account exactly once, and a second use must be rejected.
     */
    test('a captured six-digit code activates the user exactly once', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const code = capturedCodes.registration.at(-1).code;

        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: body.email, code })
            .expect(200);

        const user = await prisma.user.findUnique({where: {email: body.email}});
        expect(user.isActive).toBe(true);
        expect(user.isEmailVerified).toBe(true);

        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: body.email, code })
            .expect(400);
    });

    test('invalid and expired verification codes are rejected', async () => {
        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: 'unknown@example.com', code: '123456' })
            .expect(400);

        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});

        await prisma.verificationToken.create({
            data: {
                userId: user.id,
                tokenHash: hashVerificationCode('123456'),
                expiresAt: new Date(Date.now() - 60000),
                attempts: 0,
                usedAt: null,
            },
        });

        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: body.email, code: '123456' })
            .expect(400);
    });

    /**
     * A code with leading zeros must verify because it is hashed as a string.
     */
    test('verification preserves leading-zero codes', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});
        await prisma.verificationToken.updateMany({
            where: {userId: user.id},
            data: {usedAt: new Date()},
        });
        await prisma.verificationToken.create({
            data: {
                userId: user.id,
                tokenHash: hashVerificationCode('012345'),
                expiresAt: new Date(Date.now() + 60000),
                attempts: 0,
                usedAt: null,
            },
        });

        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: body.email, code: '012345' })
            .expect(200);
    });

    /**
     * After the configured number of wrong attempts, the code is invalidated
     * and even the correct value is rejected.
     */
    test('verification enforces the attempt limit', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});
        await prisma.verificationToken.updateMany({
            where: {userId: user.id},
            data: {usedAt: new Date()},
        });
        await prisma.verificationToken.create({
            data: {
                userId: user.id,
                tokenHash: hashVerificationCode('123456'),
                expiresAt: new Date(Date.now() + 60000),
                attempts: 0,
                usedAt: null,
            },
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
            await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ email: body.email, code: '000000' })
                .expect(400);
        }

        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: body.email, code: '123456' })
            .expect(400);

        const token = await prisma.verificationToken.findFirst({where: {userId: user.id}});
        expect(token.usedAt).not.toBeNull();
    });

    /**
     * Resend must return a uniform response for unknown accounts, suppress a
     * new code during the cooldown, and deliver a fresh code once the
     * cooldown has elapsed.
     */
    test('resend returns a uniform response and enforces a per-account cooldown', async () => {
        const unknown = await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: 'missing@example.com'})
            .expect(200);
        expect(unknown.body.data).toBeNull();

        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});

        await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: body.email})
            .expect(200);
        expect(capturedCodes.resend).toHaveLength(0);

        await prisma.verificationToken.updateMany({
            where: {userId: user.id},
            data: {createdAt: new Date(Date.now() - 2 * 60 * 1000)},
        });

        await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({email: body.email})
            .expect(200);
        expect(capturedCodes.resend).toHaveLength(1);
    });

    /**
     * An unverified account cannot log in, and after verification it can log
     * in and refresh normally.
     */
    test('login is blocked before verification and allowed after', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);

        const blocked = await request(app)
            .post('/api/v1/auth/login')
            .send({email: body.email, password: body.password})
            .expect(401);
        expect(blocked.body.code).toBe('AUTH_INVALID_CREDENTIALS');

        const code = capturedCodes.registration.at(-1).code;
        await request(app)
            .post('/api/v1/auth/verify-email')
            .send({email: body.email, code})
            .expect(200);

        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({email: body.email, password: body.password})
            .expect(200);
        expect(login.body.data.accessToken).toBeDefined();
        expect(login.body.data.refreshToken).toBeDefined();

        await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({refreshToken: login.body.data.refreshToken})
            .expect(200);
    });

    /**
     * A refresh token previously issued to an unverified account must not
     * obtain a new token pair, even if the account was never activated.
     */
    test('refresh tokens issued to unverified accounts are rejected', async () => {
        const body = credentials();
        await request(app).post('/api/v1/auth/register').send(body).expect(201);
        const user = await prisma.user.findUnique({where: {email: body.email}});

        const legacyRefreshToken = crypto.randomBytes(40).toString('hex');
        await prisma.refreshToken.create({
            data: {
                token: hashToken(legacyRefreshToken),
                familyId: crypto.randomUUID(),
                userId: user.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isRevoked: false,
            },
        });

        const response = await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({refreshToken: legacyRefreshToken})
            .expect(401);
        expect(response.body.code).toBe('AUTH_EMAIL_NOT_VERIFIED');
    });
});
