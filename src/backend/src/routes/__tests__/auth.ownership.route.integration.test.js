/**
 * Database-gated HTTP tests verifying cross-user ownership denial for
 * transactions, budgets, and categories.
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

describeDb('cross-user ownership denial (HTTP, real PostgreSQL)', () => {
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
        const dbName = uniqueDbName('ownership_test');
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
        const owner = await createUser('owner@example.com', 'owneruser', 'Owner', 'User');
        const other = await createUser('other@example.com', 'otheruser', 'Other', 'User');
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

    test('a user cannot read, update, or delete another user transaction', async () => {
        const category = await prisma.category.create({
            data: {name: 'Owner Category', userId: ownerId, isSystem: false},
        });
        const transaction = await prisma.transaction.create({
            data: {
                amount: '10.00',
                currency: 'USD',
                transType: 'EXPENSE',
                category: 'Owner Category',
                categoryId: category.id,
                transactionDate: new Date(),
                userId: ownerId,
            },
        });

        const auth = {Authorization: `Bearer ${otherToken}`};
        await request(app).get(`/api/v1/transactions/${transaction.id}`).set(auth).expect(404);
        await request(app).put(`/api/v1/transactions/${transaction.id}`).set(auth).send({description: 'hijack'}).expect(404);
        await request(app).delete(`/api/v1/transactions/${transaction.id}`).set(auth).expect(404);
    });

    test('a user cannot read, update, or delete another user budget', async () => {
        const category = await prisma.category.create({
            data: {name: 'Budget Category', userId: ownerId, isSystem: false},
        });
        const budget = await prisma.budget.create({
            data: {
                amount: '100.00',
                currency: 'USD',
                period: 'MONTHLY',
                userId: ownerId,
                categoryId: category.id,
            },
        });

        const auth = {Authorization: `Bearer ${otherToken}`};
        await request(app).get(`/api/v1/budgets/${budget.id}`).set(auth).expect(404);
        await request(app).put(`/api/v1/budgets/${budget.id}`).set(auth).send({amount: '999.00'}).expect(404);
        await request(app).delete(`/api/v1/budgets/${budget.id}`).set(auth).expect(404);
    });

    test('a user cannot read, update, or delete another user category', async () => {
        const category = await prisma.category.create({
            data: {name: 'Private Category', userId: ownerId, isSystem: false},
        });

        const auth = {Authorization: `Bearer ${otherToken}`};
        await request(app).get(`/api/v1/categories/${category.id}`).set(auth).expect(404);
        await request(app).put(`/api/v1/categories/${category.id}`).set(auth).send({name: 'Hijacked'}).expect(404);
        await request(app).delete(`/api/v1/categories/${category.id}`).set(auth).expect(404);
    });
});
