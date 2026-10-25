/**
 * Database-gated integration tests for login enumeration resistance and
 * failed-login protection.
 *
 * The `.integration.test.js` suffix marks this suite for `task test:integration`.
 * It runs only when RUN_DB_INTEGRATION=1 against a disposable local PostgreSQL.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

// Configure before the app/config modules load so the lockout and rate-limit
// values used by this suite are deterministic and fast.
process.env.AUTH_RATE_LIMIT_LOGIN_MAX = '1000';
process.env.AUTH_LOCKOUT_FAILURE_LIMIT = '5';
process.env.AUTH_LOCKOUT_BASE_WINDOW_MS = '1000';
process.env.AUTH_LOCKOUT_MAX_WINDOW_MS = '300000';

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
        'disposable local PostgreSQL (localhost, 127.0.0.1, or ::1).'
    );
}

const describeDb = RUN_DB ? describe : describe.skip;

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('auth login route (HTTP, real PostgreSQL)', () => {
    const email = 'login-test@example.com';
    const raceEmail = 'login-race@example.com';
    const password = 'CorrectPass123';

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
        const dbName = uniqueDbName('login_test');
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
        await prisma.user.create({
            data: {
                email,
                username: 'logintest',
                password: bcrypt.hashSync(password, 4),
                firstname: 'Login',
                lastname: 'Test',
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: false,
            },
        });
        await prisma.user.create({
            data: {
                email: raceEmail,
                username: 'loginracetest',
                password: bcrypt.hashSync(password, 4),
                firstname: 'Race',
                lastname: 'Test',
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: false,
            },
        });

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

    test('unknown email and wrong password return identical 401 responses', async () => {
        const unknown = await request(app)
            .post('/api/v1/auth/login')
            .send({email: 'missing@example.com', password});
        const wrong = await request(app)
            .post('/api/v1/auth/login')
            .send({email, password: 'WrongPass123'});

        expect(unknown.status).toBe(401);
        expect(wrong.status).toBe(401);
        expect(unknown.body.success).toBe(false);
        expect(unknown.body.message).toBe(wrong.body.message);
    });

    test('repeated failures trigger a temporary restriction', async () => {
        for (let i = 0; i < 5; i += 1) {
            await request(app)
                .post('/api/v1/auth/login')
                .send({email, password: 'WrongPass123'})
                .expect(401);
        }

        const locked = await request(app)
            .post('/api/v1/auth/login')
            .send({email, password})
            .expect(401);

        expect(locked.body.success).toBe(false);
    });

    test('the restriction expires after the configured window', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const ok = await request(app).post('/api/v1/auth/login').send({email, password});

        expect(ok.status).toBe(200);
        expect(ok.body.data.accessToken).toBeDefined();
        expect(ok.body.data.refreshToken).toBeDefined();
    });

    test('simultaneous failed logins are all recorded and lock the account', async () => {
        const attempts = await Promise.all(
            Array.from({length: 6}, () =>
                request(app)
                    .post('/api/v1/auth/login')
                    .send({email: raceEmail, password: 'WrongPass123'})
            )
        );

        for (const attempt of attempts) {
            expect(attempt.status).toBe(401);
        }

        const failedCount = await prisma.loginAttempt.count({
            where: {email: raceEmail, wasSuccess: false},
        });
        expect(failedCount).toBe(6);

        const after = await request(app)
            .post('/api/v1/auth/login')
            .send({email: raceEmail, password});
        expect(after.status).toBe(401);
    });
});
