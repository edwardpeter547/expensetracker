/**
 * HTTP-level integration test for the resend-verification endpoint limiter.
 *
 * The endpoint limiter is configured to a tiny limit so the test can exhaust
 * it against the real Express app without waiting for the production window.
 */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import request from 'supertest';

const RUN_DB = process.env.RUN_DB_INTEGRATION === '1';
const describeDb = RUN_DB ? describe : describe.skip;
const originalMax = process.env.AUTH_RATE_LIMIT_RESEND_MAX;
const originalWindow = process.env.AUTH_RATE_LIMIT_RESEND_WINDOW_MS;
const ADMIN_DATABASE_URL = process.env.TEST_DATABASE_URL;
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('resend-verification rate limiting', () => {
    let adminClient;
    let prisma;
    const createdDatabases = new Set();

    beforeAll(() => {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
        process.env.AUTH_RATE_LIMIT_RESEND_MAX = '2';
        process.env.AUTH_RATE_LIMIT_RESEND_WINDOW_MS = '60000';
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
        if (originalMax === undefined) {
            delete process.env.AUTH_RATE_LIMIT_RESEND_MAX;
        } else {
            process.env.AUTH_RATE_LIMIT_RESEND_MAX = originalMax;
        }
        if (originalWindow === undefined) {
            delete process.env.AUTH_RATE_LIMIT_RESEND_WINDOW_MS;
        } else {
            process.env.AUTH_RATE_LIMIT_RESEND_WINDOW_MS = originalWindow;
        }
    }, 15000);

    /**
     * The third request from the same IP within the window must receive 429.
     */
    test('enforces the resend-verification endpoint rate limit', async () => {
        adminClient = new Client({ connectionString: ADMIN_DATABASE_URL });
        await adminClient.connect();
        const dbName = uniqueDbName('resend_rate_limit_test');
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        createdDatabases.add(dbName);

        const dbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, dbName);
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'ignore',
        });
        process.env.DATABASE_URL = dbUrl;

        const { default: app } = await import('../../app.js');
        prisma = (await import('../../configurations/prisma.connect.js')).default;

        await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({ email: 'unknown-one@example.com' })
            .expect(200);
        await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({ email: 'unknown-two@example.com' })
            .expect(200);

        const limited = await request(app)
            .post('/api/v1/auth/resend-verification')
            .send({ email: 'unknown-three@example.com' });

        expect(limited.status).toBe(429);
        expect(limited.body.success).toBe(false);
        expect(limited.headers['retry-after']).toBeDefined();
    });
});
