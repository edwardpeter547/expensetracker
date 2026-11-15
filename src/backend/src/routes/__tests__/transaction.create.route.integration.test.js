/**
 * Database-gated HTTP tests for the transaction create response contract.
 *
 * These tests verify that `POST /api/v1/transactions` returns the complete
 * public transaction record (including `amount` and `transactionDate`), that
 * amount precision and date semantics survive the round trip through the real
 * Express API and PostgreSQL, and that no internal-only fields leak into the
 * response.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

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

describeDb('transaction create route (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let adminClient;
    let ownerToken;
    let otherToken;
    let ownerId;
    const createdDatabases = new Set();

    const connectPg = async (url) => {
        const client = new Client({connectionString: url});
        await client.connect();
        return client;
    };

    const createUser = async (email, username, firstname, lastname) => {
        return prisma.user.create({
            data: {
                email,
                username,
                password: bcrypt.hashSync('Password123', 4),
                firstname,
                lastname,
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: false,
            },
        });
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('transaction_create_test');
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
        const owner = await createUser('transaction.owner@example.com', 'txowner', 'Tx', 'Owner');
        const other = await createUser('transaction.other@example.com', 'txother', 'Tx', 'Other');
        ownerId = owner.id;
        ownerToken = jwt.sign(
            {userId: owner.id, email: owner.email, tokenVersion: owner.tokenVersion},
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
                algorithm: 'HS256',
                issuer: 'expensetracker-api',
                audience: 'expensetracker',
            }
        );
        otherToken = jwt.sign(
            {userId: other.id, email: other.email, tokenVersion: other.tokenVersion},
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
                algorithm: 'HS256',
                issuer: 'expensetracker-api',
                audience: 'expensetracker',
            }
        );

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
     * Create a transaction through the API and assert the complete public
     * response envelope.
     *
     * @param {object} payload The transaction fields.
     * @returns {Promise<object>} The created record from the response body.
     */
    const createThroughApi = async (payload) => {
        const response = await request(app)
            .post('/api/v1/transactions')
            .set({Authorization: `Bearer ${ownerToken}`})
            .send(payload)
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.errors).toBeNull();
        expect(response.body.data.record).toBeDefined();
        return response.body.data.record;
    };

    test('create returns amount and transactionDate with the complete public record', async () => {
        const record = await createThroughApi({
            amount: '1234.5600',
            type: 'EXPENSE',
            category: 'Food',
            description: 'Lunch',
            location: 'London',
            date: '2026-10-27T12:00:00.000Z',
        });

        expect(record.amount).toBe('1234.56');
        expect(record.transactionDate).toBe('2026-10-27T12:00:00.000Z');
        expect(record.id).toEqual(expect.any(String));
        expect(record.userId).toBe(ownerId);
        expect(record.transType).toBe('EXPENSE');
        expect(record.category).toBe('Food');
        expect(record.categoryId).toBeNull();
        expect(record.currency).toBe('USD');
        expect(record.description).toBe('Lunch');
        expect(record.receiptUrl).toBeNull();
        expect(record.location).toBe('London');
        expect(record.createdAt).toEqual(expect.any(String));
        expect(record.updatedAt).toEqual(expect.any(String));

        // The nested owner is the allowlisted projection, never the full user.
        expect(record.user).toEqual({
            id: ownerId,
            email: 'transaction.owner@example.com',
            username: 'txowner',
            firstname: 'Tx',
            lastname: 'Owner',
            avatar: null,
        });
        expect(record.user).not.toHaveProperty('password');
        expect(record.user).not.toHaveProperty('dateOfBirth');
        expect(record.user).not.toHaveProperty('mobileNumber');
    });

    test('the create response matches a subsequent read-back of the same transaction', async () => {
        const created = await createThroughApi({
            amount: '50',
            type: 'INCOME',
            category: 'Salary',
            date: '2026-10-26T23:59:59.999Z',
        });

        const readBack = await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);

        expect(readBack.body.data.transaction.amount).toBe(created.amount);
        expect(readBack.body.data.transaction.transactionDate).toBe(created.transactionDate);
        expect(readBack.body.data.transaction.amount).toBe('50');
    });

    test('create preserves large fractional amounts without floating-point loss', async () => {
        const record = await createThroughApi({
            amount: '999999999999999.9999',
            type: 'EXPENSE',
            category: 'Rent',
            date: '2026-10-27T00:00:00.000Z',
        });

        expect(record.amount).toBe('999999999999999.9999');
    });

    test('a different user cannot read the created transaction', async () => {
        const created = await createThroughApi({
            amount: '12.34',
            type: 'EXPENSE',
            category: 'Food',
            date: '2026-10-27T12:00:00.000Z',
        });

        await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${otherToken}`})
            .expect(404);
    });
});
