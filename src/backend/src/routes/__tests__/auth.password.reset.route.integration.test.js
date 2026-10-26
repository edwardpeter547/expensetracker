/**
 * Database-gated HTTP tests for the password recovery flow.
 *
 * Exercises forgot-password, verify-otp, and reset-password against the real
 * Express app and a disposable PostgreSQL database, verifying generic
 * unknown-email responses, valid reset, expired-token rejection, session
 * revocation, and password/token-version changes.
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
process.env.AUTH_RATE_LIMIT_FORGOT_MAX = '1000';

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

describeDb('auth password reset routes (HTTP, real PostgreSQL)', () => {
    let app;
    let prisma;
    let authService;
    let Config;
    let jwt;
    let emailService;
    let adminClient;
    let testDbUrl;
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
     * Create an active user with a known password hash.
     *
     * @returns {Promise<object>} The created user record.
     */
    const seedUser = async () => {
        const suffix = crypto.randomUUID();
        return prisma.user.create({
            data: {
                email: `reset-${suffix}@example.com`,
                username: `reset-${suffix}`,
                password: await bcrypt.hash('OldPassword123', 10),
                firstname: 'Reset',
                lastname: 'User',
                language: 'en',
                isEmailVerified: true,
                isPhoneVerified: false,
                isActive: true,
            },
        });
    };

    /**
     * Trigger forgot-password for a user and capture the code passed to the
     * email transport.
     *
     * @param {object} user The user to request a reset for.
     * @returns {Promise<string>} The six-digit reset code.
     */
    const requestResetCode = async (user) => {
        let capturedCode;
        const sendSpy = jest.spyOn(emailService, 'sendPasswordResetCode')
            .mockImplementation(async (recipient, code) => {
                capturedCode = code;
            });

        await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: user.email })
            .expect(200);

        sendSpy.mockRestore();
        expect(capturedCode).toMatch(/^\d{6}$/);
        return capturedCode;
    };

    /**
     * Execute a raw SQL statement against the disposable test database.
     *
     * @param {string} sql The SQL statement to execute.
     * @returns {Promise<number>} The number of affected rows.
     */
    const executeSql = (sql) => prisma.$executeRawUnsafe(sql);

    /**
     * Install a BEFORE INSERT failure trigger on PasswordHistory.
     *
     * @returns {Promise<void>}
     */
    const failPasswordHistoryInsert = async () => {
        await executeSql(`
            CREATE OR REPLACE FUNCTION fail_password_history_insert()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'password_history write failed';
            END;
            $$ LANGUAGE plpgsql
        `);
        await executeSql(`
            CREATE TRIGGER trg_fail_password_history
            BEFORE INSERT ON "PasswordHistory"
            FOR EACH ROW EXECUTE FUNCTION fail_password_history_insert()
        `);
    };

    /**
     * Remove the PasswordHistory failure trigger.
     *
     * @returns {Promise<void>}
     */
    const removePasswordHistoryFailure = async () => {
        await executeSql('DROP TRIGGER IF EXISTS trg_fail_password_history ON "PasswordHistory"');
        await executeSql('DROP FUNCTION IF EXISTS fail_password_history_insert()');
    };

    /**
     * Install a BEFORE UPDATE failure trigger on the user table.
     *
     * @returns {Promise<void>}
     */
    const failUserUpdate = async () => {
        await executeSql(`
            CREATE OR REPLACE FUNCTION fail_user_update()
            RETURNS trigger AS $$
            BEGIN
                IF NEW."tokenVersion" IS DISTINCT FROM OLD."tokenVersion" THEN
                    RAISE EXCEPTION 'user update failed';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
        await executeSql(`
            CREATE TRIGGER trg_fail_user_update
            BEFORE UPDATE ON "user"
            FOR EACH ROW EXECUTE FUNCTION fail_user_update()
        `);
    };

    /**
     * Remove the user-table failure trigger.
     *
     * @returns {Promise<void>}
     */
    const removeUserFailure = async () => {
        await executeSql('DROP TRIGGER IF EXISTS trg_fail_user_update ON "user"');
        await executeSql('DROP FUNCTION IF EXISTS fail_user_update()');
    };

    /**
     * Install a BEFORE UPDATE failure trigger on refresh_token.
     *
     * @returns {Promise<void>}
     */
    const failRefreshRevocation = async () => {
        await executeSql(`
            CREATE OR REPLACE FUNCTION fail_refresh_revoke()
            RETURNS trigger AS $$
            BEGIN
                IF NEW."isRevoked" AND NOT OLD."isRevoked" THEN
                    RAISE EXCEPTION 'refresh revocation failed';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
        await executeSql(`
            CREATE TRIGGER trg_fail_refresh_revoke
            BEFORE UPDATE ON "refresh_token"
            FOR EACH ROW EXECUTE FUNCTION fail_refresh_revoke()
        `);
    };

    /**
     * Remove the refresh-token failure trigger.
     *
     * @returns {Promise<void>}
     */
    const removeRefreshFailure = async () => {
        await executeSql('DROP TRIGGER IF EXISTS trg_fail_refresh_revoke ON "refresh_token"');
        await executeSql('DROP FUNCTION IF EXISTS fail_refresh_revoke()');
    };

    /**
     * Create a user, reset code, and two active refresh sessions, then return
     * the values needed to assert rollback invariants.
     *
     * @returns {Promise<object>} The seeded test fixture.
     */
    const seedRollbackFixture = async () => {
        const user = await seedUser();
        const code = crypto.randomInt(100000, 1000000).toString();
        await authService.savePasswordResetToken(user, code);
        const firstRefresh = crypto.randomBytes(40).toString('hex');
        const secondRefresh = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(firstRefresh, user.id, '127.0.0.1');
        await authService.createRefreshToken(secondRefresh, user.id, '127.0.0.1');

        return { user, code };
    };

    /**
     * Assert no security-sensitive write survived a failed reset transaction.
     *
     * @param {object} fixture The seeded reset fixture.
     * @returns {Promise<void>}
     */
    const assertResetRollback = async (fixture) => {
        const { user, code } = fixture;
        const token = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id, token: authService.hashResetCode(code) },
        });
        expect(token.usedAt).toBeNull();

        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        expect(updatedUser.password).toBe(user.password);
        expect(updatedUser.tokenVersion).toBe(user.tokenVersion);

        expect(
            await prisma.refreshToken.count({
                where: { userId: user.id, isRevoked: false },
            })
        ).toBe(2);
        expect(await prisma.passwordHistory.count({ where: { userId: user.id } })).toBe(0);
    };

    beforeAll(async () => {
        adminClient = await connectPg(ADMIN_DATABASE_URL);
        const dbName = uniqueDbName('password_reset_test');
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        createdDatabases.add(dbName);

        const dbUrl = replaceDatabaseName(ADMIN_DATABASE_URL, dbName);
        testDbUrl = dbUrl;
        execSync('npx prisma db push', {
            cwd: backendRoot,
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'ignore',
        });
        process.env.DATABASE_URL = dbUrl;

        prisma = (await import('../../configurations/prisma.connect.js')).default;
        authService = await import('../../services/auth.service.js');
        emailService = (await import('../../services/email.service.js')).default;
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
     * Requesting a reset for an unknown email returns the same generic 200 and
     * creates no reset token.
     */
    test('forgot-password returns a generic response for unknown email', async () => {
        const response = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: 'missing@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const tokenCount = await prisma.passwordResetToken.count();
        expect(tokenCount).toBe(0);
    });

    /**
     * A valid code verifies the account and then changes the password exactly
     * through the reset flow, revoking sessions and bumping tokenVersion.
     */
    test('verify-otp and reset-password complete a valid reset', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');
        const oldAccessToken = jwt.sign(
            { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
            Config.jwtSecret,
            {
                expiresIn: '15m',
                algorithm: 'HS256',
                issuer: Config.jwtIssuer,
                audience: Config.jwtAudience,
            }
        );

        const code = await requestResetCode(user);

        const resetRecord = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
        expect(resetRecord).toBeTruthy();
        expect(resetRecord.token).toBe(authService.hashResetCode(code));
        expect(resetRecord.token).not.toBe(code);
        expect(resetRecord.usedAt).toBeNull();

        const verify = await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code, email: user.email })
            .expect(200);
        expect(verify.body.data.user).not.toHaveProperty('password');

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({ code, email: user.email, password: 'NewPassword123' })
            .expect(200);

        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        expect(await bcrypt.compare('NewPassword123', updated.password)).toBe(true);
        expect(updated.tokenVersion).toBe(user.tokenVersion + 1);

        const activeRefreshTokens = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(activeRefreshTokens).toBe(0);

        await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${oldAccessToken}`)
            .expect(401);

        const consumedRecord = await prisma.passwordResetToken.findUnique({
            where: { id: resetRecord.id },
        });
        expect(consumedRecord.usedAt).not.toBeNull();

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({ code, email: user.email, password: 'SecondNewPassword1' })
            .expect(401);
    });

    /**
     * Expired and unknown reset codes are rejected without changing the
     * password or user token version.
     */
    test('expired or unknown reset codes are rejected', async () => {
        const user = await seedUser();
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: authService.hashResetCode('654321'),
                expiresAt: new Date(Date.now() - 60 * 1000),
            },
        });

        await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code: '654321', email: user.email })
            .expect(401);

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({ code: '654321', email: user.email, password: 'NewPassword123' })
            .expect(401);

        await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({ code: '000000', email: user.email })
            .expect(401);

        const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
        expect(unchanged.tokenVersion).toBe(user.tokenVersion);
        expect(await bcrypt.compare('OldPassword123', unchanged.password)).toBe(true);
    });

    /**
     * A reset code is consumed on the first successful reset-password and
     * must be rejected on every later attempt.
     */
    test('a reset code can be used only once', async () => {
        const user = await seedUser();
        const code = await requestResetCode(user);

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({ code, email: user.email, password: 'FirstNewPassword1' })
            .expect(200);

        await request(app)
            .post('/api/v1/auth/reset-password')
            .send({ code, email: user.email, password: 'SecondNewPassword1' })
            .expect(401);
    });

    /**
     * Two concurrent reset requests using the same code must produce exactly
     * one successful password change, and the losing request must not
     * overwrite the winning password.
     */
    test('concurrent resets with the same code cannot both succeed', async () => {
        const user = await seedUser();
        const code = '123456';
        await authService.savePasswordResetToken(user, code);

        const [first, second] = await Promise.all([
            authService.resetPasswordWithCode({
                userId: user.id,
                code,
                password: 'FirstNewPassword1',
            }),
            authService.resetPasswordWithCode({
                userId: user.id,
                code,
                password: 'SecondNewPassword1',
            }),
        ]);

        expect([first, second].filter((result) => result.success)).toHaveLength(1);

        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        const winningPassword = first.success ? 'FirstNewPassword1' : 'SecondNewPassword1';
        const losingPassword = first.success ? 'SecondNewPassword1' : 'FirstNewPassword1';
        expect(await bcrypt.compare(winningPassword, updated.password)).toBe(true);
        expect(await bcrypt.compare(losingPassword, updated.password)).toBe(false);
        expect(updated.tokenVersion).toBe(user.tokenVersion + 1);

        const active = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(active).toBe(0);
    });

    /**
     * A refresh rotation racing a successful password reset must never leave
     * an active refresh-token session behind.
     */
    test('concurrent refresh rotation cannot bypass reset invalidation', async () => {
        const user = await seedUser();
        const raw = crypto.randomBytes(40).toString('hex');
        await authService.createRefreshToken(raw, user.id, '127.0.0.1');
        const code = '777777';
        await authService.savePasswordResetToken(user, code);

        const [resetResult, rotateResult] = await Promise.allSettled([
            authService.resetPasswordWithCode({
                userId: user.id,
                code,
                password: 'NewPassword123',
            }),
            authService.rotateRefreshToken(raw),
        ]);

        expect(resetResult.status).toBe('fulfilled');
        expect(resetResult.value.success).toBe(true);

        if (rotateResult.status === 'fulfilled') {
            await expect(
                authService.rotateRefreshToken(rotateResult.value.refreshToken)
            ).rejects.toMatchObject({ statusCode: 401 });
        } else {
            expect(rotateResult.reason).toMatchObject({ statusCode: 401 });
        }

        const active = await prisma.refreshToken.count({
            where: { userId: user.id, isRevoked: false },
        });
        expect(active).toBe(0);
    });

    /**
     * A failure while writing password history must roll back the entire
     * reset, and the same code must still work after the failure is removed.
     */
    test('passwordHistory.create failure rolls back the whole reset', async () => {
        const fixture = await seedRollbackFixture();
        await failPasswordHistoryInsert();

        try {
            await expect(authService.resetPasswordWithCode({
                userId: fixture.user.id,
                code: fixture.code,
                password: 'NewPassword123',
            })).rejects.toThrow('password_history write failed');
        } finally {
            await removePasswordHistoryFailure();
        }

        await assertResetRollback(fixture);
        const retry = await authService.resetPasswordWithCode({
            userId: fixture.user.id,
            code: fixture.code,
            password: 'NewPassword123',
        });
        expect(retry.success).toBe(true);
    });

    /**
     * A failure while updating the user row must roll back the entire reset,
     * and the same code must still work after the failure is removed.
     */
    test('user.update failure rolls back the whole reset', async () => {
        const fixture = await seedRollbackFixture();
        await failUserUpdate();

        try {
            await expect(authService.resetPasswordWithCode({
                userId: fixture.user.id,
                code: fixture.code,
                password: 'NewPassword123',
            })).rejects.toThrow('user update failed');
        } finally {
            await removeUserFailure();
        }

        await assertResetRollback(fixture);
        const retry = await authService.resetPasswordWithCode({
            userId: fixture.user.id,
            code: fixture.code,
            password: 'NewPassword123',
        });
        expect(retry.success).toBe(true);
    });

    /**
     * A failure while revoking refresh sessions must roll back the entire
     * reset, and the same code must still work after the failure is removed.
     */
    test('refreshToken.updateMany failure rolls back the whole reset', async () => {
        const fixture = await seedRollbackFixture();
        await failRefreshRevocation();

        try {
            await expect(authService.resetPasswordWithCode({
                userId: fixture.user.id,
                code: fixture.code,
                password: 'NewPassword123',
            })).rejects.toThrow('refresh revocation failed');
        } finally {
            await removeRefreshFailure();
        }

        await assertResetRollback(fixture);
        const retry = await authService.resetPasswordWithCode({
            userId: fixture.user.id,
            code: fixture.code,
            password: 'NewPassword123',
        });
        expect(retry.success).toBe(true);
    });
});
