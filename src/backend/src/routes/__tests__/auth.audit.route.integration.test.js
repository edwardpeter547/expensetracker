/**
 * Database-gated HTTP tests for the authentication audit trail.
 *
 * These tests exercise the real Express app against a disposable PostgreSQL
 * database and verify that every required authentication action persists a
 * secret-safe, correlation-tagged audit event.
 */
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { Client } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.AUTH_RATE_LIMIT_LOGIN_MAX = '1000';
process.env.AUTH_RATE_LIMIT_REGISTER_MAX = '1000';
process.env.AUTH_RATE_LIMIT_FORGOT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_REFRESH_MAX = '1000';
process.env.AUTH_LOCKOUT_FAILURE_LIMIT = '3';
process.env.AUTH_LOCKOUT_BASE_WINDOW_MS = '1000';
process.env.AUTH_LOCKOUT_MAX_WINDOW_MS = '300000';

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
const replaceDatabaseName = (url, name) => {
    const parsed = new URL(url);
    parsed.pathname = `/${name}`;
    return parsed.toString();
};

describeDb('authentication audit trail (HTTP, real PostgreSQL)', () => {
    const registrationCredentials = () => ({
        email: `audit-reg-${crypto.randomUUID()}@example.com`,
        username: `auditreg${crypto.randomBytes(6).toString('hex')}`,
        password: 'Password123',
        firstName: 'Audit',
        lastName: 'Register',
    });

    let app;
    let prisma;
    let emailService;
    let adminClient;
    const createdDatabases = new Set();

    /**
     * Open a `pg` client against a connection string.
     *
     * @param {string} url The connection string.
     * @returns {Promise<Client>} A connected client.
     */
    const connectPg = async (url) => {
        const client = new Client({connectionString: url});
        await client.connect();
        return client;
    };

    /**
     * Create an active user with a known password hash.
     *
     * @param {string} [password='Password123'] The plaintext password.
     * @returns {Promise<{user: object, password: string}>} The user and password.
     */
    const seedActiveUser = async (password = 'Password123') => {
        const user = await prisma.user.create({
            data: {
                email: `audit-${crypto.randomUUID()}@example.com`,
                username: `audit${crypto.randomBytes(6).toString('hex')}`,
                password: bcrypt.hashSync(password, 4),
                firstname: 'Audit',
                lastname: 'User',
                isActive: true,
                isEmailVerified: true,
                isPhoneVerified: false,
            },
        });
        return {user, password};
    };

    /**
     * Fetch every audit event for a user, oldest first.
     *
     * @param {number} userId The owning user id.
     * @returns {Promise<object[]>} The audit events.
     */
    const eventsFor = (userId) => prisma.authAuditEvent.findMany({
        where: {userId},
        orderBy: {createdAt: 'asc'},
    });

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('auth_audit_test');
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
        emailService = (await import('../../services/email.service.js')).default;
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
     * A successful registration must persist a REGISTRATION/SUCCESS event
     * carrying the correlation id from the response header and a timestamp.
     */
    test('successful registration produces an audited event', async () => {
        const body = registrationCredentials();
        const response = await request(app).post('/api/v1/auth/register').send(body).expect(201);

        const correlationId = response.headers['x-request-id'];
        expect(correlationId).toBeDefined();

        const event = await prisma.authAuditEvent.findFirst({
            where: {eventType: 'REGISTRATION', outcome: 'SUCCESS'},
        });
        expect(event).not.toBeNull();
        expect(event.correlationId).toBe(correlationId);
        expect(event.createdAt).toBeInstanceOf(Date);
        expect(event.userId).toEqual(expect.any(Number));
        expect(event.ipAddress).toEqual(expect.any(String));
    });

    /**
     * A successful login must persist a LOGIN/SUCCESS event with the resolved
     * user id, while failed and unknown-account logins must persist FAILURE
     * events that never store the submitted email address.
     */
    test('login success and failure are audited without storing unknown emails', async () => {
        const {user, password} = await seedActiveUser();
        const unknownEmail = 'missing-audit@example.com';

        await request(app).post('/api/v1/auth/login').send({email: user.email, password}).expect(200);

        const success = await prisma.authAuditEvent.findFirst({
            where: {eventType: 'LOGIN', outcome: 'SUCCESS', userId: user.id},
        });
        expect(success).not.toBeNull();

        await request(app).post('/api/v1/auth/login').send({email: user.email, password: 'WrongPass123'}).expect(401);
        const unknownResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({email: unknownEmail, password: 'WrongPass123'})
            .expect(401);

        const knownFailure = await prisma.authAuditEvent.findFirst({
            where: {eventType: 'LOGIN', outcome: 'FAILURE', userId: user.id},
        });
        expect(knownFailure).not.toBeNull();
        expect(knownFailure.metadata).toEqual({reason: 'INVALID_CREDENTIALS'});

        const unknownFailure = await prisma.authAuditEvent.findFirst({
            where: {eventType: 'LOGIN', outcome: 'FAILURE', userId: null},
            orderBy: {createdAt: 'desc'},
        });
        expect(unknownFailure).not.toBeNull();
        expect(JSON.stringify(unknownFailure)).not.toContain(unknownEmail);
        expect(unknownFailure.metadata).toEqual({reason: 'INVALID_CREDENTIALS'});
        expect(unknownResponse.body.message).not.toContain(unknownEmail);
    });

    /**
     * A logout must persist a LOGOUT/SUCCESS event for the authenticated user.
     */
    test('logout produces an audited event', async () => {
        const {user, password} = await seedActiveUser();
        const login = await request(app).post('/api/v1/auth/login').send({email: user.email, password}).expect(200);

        await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${login.body.data.accessToken}`)
            .send({refreshToken: login.body.data.refreshToken})
            .expect(200);

        const event = await prisma.authAuditEvent.findFirst({
            where: {eventType: 'LOGOUT', outcome: 'SUCCESS', userId: user.id},
        });
        expect(event).not.toBeNull();
    });

    /**
     * A password-reset request must be recorded as REQUESTED and a completed
     * reset must be recorded as SUCCESS for the same user.
     */
    test('password reset request and completion are recorded', async () => {
        const {user} = await seedActiveUser();
        let capturedCode;
        const sendSpy = jest.spyOn(emailService, 'sendPasswordResetCode')
            .mockImplementation(async (recipient, code) => {
                capturedCode = code;
            });

        await request(app).post('/api/v1/auth/forgot-password').send({email: user.email}).expect(200);
        sendSpy.mockRestore();

        expect(capturedCode).toMatch(/^\d{6}$/);
        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'PASSWORD_RESET_REQUEST', outcome: 'REQUESTED', userId: user.id},
        })).not.toBeNull();

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({code: capturedCode, email: user.email, password: 'NewPassword123'})
            .expect(200);

        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'PASSWORD_RESET_COMPLETE', outcome: 'SUCCESS', userId: user.id},
        })).not.toBeNull();
    });

    /**
     * A password change must persist a PASSWORD_CHANGE/SUCCESS event written in
     * the same transaction as the credential update.
     */
    test('password change produces an audited event', async () => {
        const {user, password} = await seedActiveUser();
        const login = await request(app).post('/api/v1/auth/login').send({email: user.email, password}).expect(200);

        await request(app)
            .post('/api/v1/user/change-password')
            .set('Authorization', `Bearer ${login.body.data.accessToken}`)
            .send({currentPassword: password, newPassword: 'BrandNewPass1'})
            .expect(200);

        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'PASSWORD_CHANGE', outcome: 'SUCCESS', userId: user.id},
        })).not.toBeNull();
    });

    /**
     * Token refresh must persist a SUCCESS event, and an invalid refresh token
     * must persist a FAILURE event.
     */
    test('token refresh success and failure are handled', async () => {
        const {user, password} = await seedActiveUser();
        const login = await request(app).post('/api/v1/auth/login').send({email: user.email, password}).expect(200);

        await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({refreshToken: login.body.data.refreshToken})
            .expect(200);
        await request(app)
            .post('/api/v1/auth/refresh-token')
            .send({refreshToken: 'a'.repeat(80)})
            .expect(401);

        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'TOKEN_REFRESH', outcome: 'SUCCESS', userId: user.id},
        })).not.toBeNull();
        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'TOKEN_REFRESH', outcome: 'FAILURE'},
        })).not.toBeNull();
    });

    /**
     * A request rejected by the authentication middleware must persist an
     * AUTHORIZATION_DENIED event without exposing another user's resources.
     */
    test('authorization denials are recorded', async () => {
        await request(app).get('/api/v1/user/profile').expect(401);

        expect(await prisma.authAuditEvent.findFirst({
            where: {eventType: 'AUTHORIZATION_DENIED', outcome: 'DENIED'},
        })).not.toBeNull();
    });

    /**
     * Crossing the configured lockout threshold must produce exactly one
     * SUSPICIOUS_ACTIVITY event, not one event per subsequent failed attempt.
     */
    test('repeated failures generate a single suspicious-activity event', async () => {
        const {user, password} = await seedActiveUser();

        for (let index = 0; index < 4; index += 1) {
            await request(app)
                .post('/api/v1/auth/login')
                .send({email: user.email, password: 'WrongPass123'})
                .expect(401);
        }

        const suspicious = await prisma.authAuditEvent.findMany({
            where: {eventType: 'REPEATED_AUTH_FAILURES', outcome: 'SUSPICIOUS_ACTIVITY', userId: user.id},
        });
        expect(suspicious).toHaveLength(1);
        expect(suspicious[0].metadata.attemptCount).toBeGreaterThanOrEqual(3);
        expect(suspicious[0].metadata.reason).toBe('REPEATED_FAILURES');
    });

    /**
     * Stored audit records must carry correlation ids and timestamps, and must
     * never contain passwords, access tokens, or refresh tokens.
     */
    test('audit records are correlation-tagged and free of secrets', async () => {
        const {user, password} = await seedActiveUser();
        const login = await request(app).post('/api/v1/auth/login').send({email: user.email, password}).expect(200);

        const events = await prisma.authAuditEvent.findMany({});
        expect(events.length).toBeGreaterThan(0);

        for (const event of events) {
            expect(event.correlationId).toEqual(expect.any(String));
            expect(event.createdAt).toBeInstanceOf(Date);
            expect(JSON.stringify(event)).not.toContain(password);
            expect(JSON.stringify(event)).not.toContain(login.body.data.accessToken);
            expect(JSON.stringify(event)).not.toContain(login.body.data.refreshToken);
        }
    });
});
