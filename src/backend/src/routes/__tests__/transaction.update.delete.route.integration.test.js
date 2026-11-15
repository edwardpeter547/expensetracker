/**
 * Database-gated HTTP tests for the transaction update and delete routes.
 *
 * These tests exercise `PUT /api/v1/transactions/:id` and
 * `DELETE /api/v1/transactions/:id` against the real Express application and a
 * disposable PostgreSQL database. They verify persistence, ownership scoping,
 * validation, and that budget spending is recomputed from the authoritative
 * transaction rows after an amount change or deletion.
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

/**
 * Report whether an integration database URL targets the local machine.
 *
 * Integration tests may only run against a disposable local database, so the
 * guard refuses remote administration URLs before any connection is made.
 *
 * @param {string|undefined} url The candidate administration URL.
 * @returns {boolean} True when the hostname is a loopback address.
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

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Build a unique disposable database name for one test run.
 *
 * @param {string} prefix The database-name prefix.
 * @returns {string} A collision-resistant database name.
 */
const uniqueDbName = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

/**
 * Replace the database component of a connection URL.
 *
 * @param {string} url The source URL.
 * @param {string} name The replacement database name.
 * @returns {string} The rewritten URL.
 */
const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('transaction update/delete routes (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let adminClient;
    let ownerToken;
    let otherToken;
    let ownerId;
    const createdDatabases = new Set();

    /**
     * Connect a PostgreSQL client using an administration URL.
     *
     * @param {string} url The PostgreSQL connection URL.
     * @returns {Promise<Client>} The connected client.
     */
    const connectPg = async (url) => {
        const client = new Client({connectionString: url});
        await client.connect();
        return client;
    };

    /**
     * Create a verified, active user row through the Prisma client.
     *
     * @param {string} email The unique email address.
     * @param {string} username The unique username.
     * @param {string} firstname The user's first name.
     * @param {string} lastname The user's last name.
     * @returns {Promise<object>} The created user.
     */
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
        const dbName = uniqueDbName('transaction_update_delete_test');
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
     * Create a transaction through the API and return its persisted record.
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
        expect(response.body.data.record).toBeDefined();
        return response.body.data.record;
    };

    /**
     * Create a user-owned category fixture directly through Prisma.
     *
     * The category creation API is exercised elsewhere; this fixture only
     * prepares a scoped category for the budget-spending regression check.
     *
     * @param {string} name The category name.
     * @returns {Promise<object>} The created category.
     */
    const createCategoryFixture = async (name) => {
        return prisma.category.create({
            data: {name, icon: null, userId: ownerId},
        });
    };

    /**
     * Create a monthly budget fixture directly through Prisma.
     *
     * Budget creation is tracked by issue #226 and its API path is out of
     * scope here, so the fixture bypasses the broken create endpoint while the
     * spending read still goes through the real `GET /api/v1/budgets` route.
     *
     * @param {string} amount The budget limit as a canonical decimal string.
     * @param {string} categoryId The budget category id.
     * @returns {Promise<object>} The created budget.
     */
    const createBudgetFixture = async (amount, categoryId) => {
        return prisma.budget.create({
            data: {
                amount,
                currency: 'USD',
                period: 'MONTHLY',
                userId: ownerId,
                categoryId,
            },
        });
    };

    /**
     * List the owner's budgets with their computed spending.
     *
     * @returns {Promise<object[]>} The budget view models.
     */
    const listBudgetsThroughApi = async () => {
        const response = await request(app)
            .get('/api/v1/budgets')
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);
        return response.body.data;
    };

    test('update persists amount, type, category, description, and date and returns the public record', async () => {
        const created = await createThroughApi({
            amount: '25.50',
            title: 'Lunch',
            type: 'EXPENSE',
            category: 'Food',
            description: 'Lunch',
            date: '2026-10-27T12:00:00.000Z',
        });

        const response = await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({
                amount: '30.25',
                title: 'Dinner',
                type: 'EXPENSE',
                category: 'Dining',
                description: 'Dinner',
                date: '2026-10-28T18:30:00.000Z',
            })
            .expect(200);

        const updated = response.body.data.transaction;
        expect(response.body.success).toBe(true);
        expect(updated.amount).toBe('30.25');
        expect(updated.transType).toBe('EXPENSE');
        expect(updated.title).toBe('Dinner');
        expect(updated.category).toBe('Dining');
        expect(updated.description).toBe('Dinner');
        expect(updated.transactionDate).toBe('2026-10-28T18:30:00.000Z');

        const readBack = await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);
        expect(readBack.body.data.transaction.amount).toBe('30.25');
        expect(readBack.body.data.transaction.title).toBe('Dinner');
        expect(readBack.body.data.transaction.category).toBe('Dining');

        const list = await request(app)
            .get('/api/v1/transactions')
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);
        const listed = list.body.data.transactions.find((item) => item.id === created.id);
        expect(listed.amount).toBe('30.25');
        expect(listed.title).toBe('Dinner');
        expect(listed.category).toBe('Dining');
    });

    test('update can clear a nullable description', async () => {
        const created = await createThroughApi({
            amount: '8',
            title: 'Coffee',
            type: 'EXPENSE',
            category: 'Food',
            description: 'Coffee',
            date: '2026-10-27T08:00:00.000Z',
        });

        const response = await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({description: null})
            .expect(200);

        expect(response.body.data.transaction.description).toBeNull();

        const readBack = await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);
        expect(readBack.body.data.transaction.description).toBeNull();
    });

    test('delete removes the transaction and a subsequent retrieval returns 404', async () => {
        const created = await createThroughApi({
            amount: '15',
            title: 'Salary',
            type: 'INCOME',
            category: 'Salary',
            date: '2026-10-27T09:00:00.000Z',
        });

        const response = await request(app)
            .delete(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeNull();

        await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(404);

        const list = await request(app)
            .get('/api/v1/transactions')
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);
        expect(
            list.body.data.transactions.find((item) => item.id === created.id),
        ).toBeUndefined();
    });

    test('invalid update payloads are rejected with a validation error', async () => {
        const created = await createThroughApi({
            amount: '10',
            title: 'Lunch',
            type: 'EXPENSE',
            category: 'Food',
            date: '2026-10-27T10:00:00.000Z',
        });

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({amount: 'not-a-number'})
            .expect(400);

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({})
            .expect(400);
    });

    test('unauthenticated update and delete requests return 401', async () => {
        const created = await createThroughApi({
            amount: '11',
            title: 'Lunch',
            type: 'EXPENSE',
            category: 'Food',
            date: '2026-10-27T10:00:00.000Z',
        });

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .send({amount: '12'})
            .expect(401);

        await request(app)
            .delete(`/api/v1/transactions/${created.id}`)
            .expect(401);
    });

    test('a different user cannot update or delete a transaction', async () => {
        const created = await createThroughApi({
            amount: '13',
            title: 'Lunch',
            type: 'EXPENSE',
            category: 'Food',
            date: '2026-10-27T10:00:00.000Z',
        });

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${otherToken}`})
            .send({amount: '99'})
            .expect(404);

        await request(app)
            .delete(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${otherToken}`})
            .expect(404);
    });

    test('budget spending is recomputed after an update and a deletion', async () => {
        const category = await createCategoryFixture('Integration Dining');
        const budget = await createBudgetFixture('100', category.id);
        const created = await createThroughApi({
            amount: '25.50',
            title: 'Integration Dining',
            type: 'EXPENSE',
            category: category.name,
            categoryId: category.id,
            date: new Date().toISOString(),
        });

        const before = (await listBudgetsThroughApi()).find((item) => item.id === budget.id);
        expect(before.spent).toBe('25.5');

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({amount: '30.25'})
            .expect(200);

        const afterUpdate = (await listBudgetsThroughApi()).find((item) => item.id === budget.id);
        expect(afterUpdate.spent).toBe('30.25');

        await request(app)
            .delete(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);

        const afterDelete = (await listBudgetsThroughApi()).find((item) => item.id === budget.id);
        expect(afterDelete.spent).toBe('0');
    });

    test('merchant details, line items, and budget link round-trip through create and update', async () => {
        const category = await createCategoryFixture('Integration Groceries');
        const budget = await createBudgetFixture('100', category.id);
        const created = await createThroughApi({
            amount: '42.50',
            title: 'Weekly groceries',
            type: 'EXPENSE',
            category: category.name,
            categoryId: category.id,
            description: 'Family shop',
            date: new Date().toISOString(),
            budgetId: budget.id,
            merchant: {
                name: 'FreshMart',
                address: '4 Market Lane\nLondon',
                purchaseTime: '16:10',
                paymentMethod: 'Card',
                reference: 'FM-2231',
            },
            items: [
                { name: 'Milk', quantity: '2', unitPrice: '1.20', category: 'Food' },
                { name: 'Bread', quantity: '1', unitPrice: '2.10', category: 'Food' },
            ],
        });

        expect(created.merchant).toEqual({
            name: 'FreshMart',
            address: '4 Market Lane\nLondon',
            purchaseTime: '16:10',
            paymentMethod: 'Card',
            reference: 'FM-2231',
        });
        expect(created.items).toHaveLength(2);
        expect(created.items[0]).toMatchObject({ name: 'Milk', quantity: '2', unitPrice: '1.2' });
        expect(created.budgetId).toBe(budget.id);
        expect(created.budget?.category?.name).toBe(category.name);

        await request(app)
            .put(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .send({
                merchant: {
                    name: 'FreshMart Updated',
                    address: null,
                    purchaseTime: '17:05',
                    paymentMethod: 'Cash',
                    reference: null,
                },
                items: [{ name: 'Eggs', quantity: '1', unitPrice: '3.40', category: null }],
            })
            .expect(200);

        const readBack = await request(app)
            .get(`/api/v1/transactions/${created.id}`)
            .set({Authorization: `Bearer ${ownerToken}`})
            .expect(200);

        expect(readBack.body.data.transaction.merchant).toEqual({
            name: 'FreshMart Updated',
            address: null,
            purchaseTime: '17:05',
            paymentMethod: 'Cash',
            reference: null,
        });
        expect(readBack.body.data.transaction.items).toEqual([
            expect.objectContaining({
                name: 'Eggs',
                quantity: '1',
                unitPrice: '3.4',
                category: null,
            }),
        ]);
        expect(readBack.body.data.transaction.budgetId).toBe(budget.id);
    });
});
