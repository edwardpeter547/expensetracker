/**
 * Controller-level regression tests for the logout endpoint.
 *
 * These tests drive the exported `logout` handler directly with mocked
 * services and verify that logout revokes only the authenticated user's
 * presented token, remains idempotent, and never leaks token material.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const mockAuthService = {
    confirmVerification: jest.fn(),
    createLoginAttempt: jest.fn(),
    createRefreshToken: jest.fn(),
    createUser: jest.fn(),
    createVerificationToken: jest.fn(),
    getSafeUser: jest.fn(),
    getUser: jest.fn(),
    getAccountLockout: jest.fn(),
    resetFailedLogins: jest.fn(),
    getVerificationToken: jest.fn(),
    refreshRecord: jest.fn(),
    removeVerificationToken: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    rotateRefreshToken: jest.fn(),
    sanitizeResponse: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    updateLastLogin: jest.fn(),
    updateUserPassword: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
    resetPasswordWithCode: jest.fn(),
    listUserSessions: jest.fn(),
    revokeUserSession: jest.fn(),
};

const mockEmailService = {
    sendRegistrationComplete: jest.fn(),
    sendVerificationConfirmation: jest.fn(),
    resendEmailVerificationLink: jest.fn(),
    sendPasswordResetCode: jest.fn(),
};

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(path.join(servicesDirectory, 'email.service.js'), () => ({ default: mockEmailService }));

const authController = await import('../auth.controller.js');

/**
 * Build a minimal Express-like response with a spyable `status`/`json` chain.
 *
 * @returns {{ json: jest.Mock, status: jest.Mock }} A response spy pair.
 */
const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status };
};

/**
 * Flush pending promise microtasks after invoking a `catchAsync` handler.
 *
 * `catchAsync` starts the handler without returning its promise, so tests must
 * yield to the event loop before asserting on `json` or `status`.
 *
 * @returns {Promise<void>}
 */
const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('auth controller logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * A valid logout must revoke the presented token for the authenticated
     * user and return a 200 envelope with no token material.
     */
    test('revokes the presented token for the authenticated user', async () => {
        mockAuthService.revokeRefreshTokenByHash.mockResolvedValue({ count: 1 });
        const { json, status } = makeResponse();
        const token = 'a'.repeat(80);
        const req = {
            body: { refreshToken: token },
            user: { id: 1, email: 'a@b.c' },
            __: (key) => key,
        };

        await authController.logout(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.revokeRefreshTokenByHash).toHaveBeenCalledWith(token, 1);
        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0]).toMatchObject({ success: true, errors: null });
    });

    /**
     * Logout must be idempotent: an unknown or already-revoked token still
     * returns a successful 200 response rather than an error.
     */
    test('is idempotent when the token is unknown or already revoked', async () => {
        mockAuthService.revokeRefreshTokenByHash.mockResolvedValue({ count: 0 });
        const { json, status } = makeResponse();
        const req = {
            body: { refreshToken: 'a'.repeat(80) },
            user: { id: 1, email: 'a@b.c' },
            __: (key) => key,
        };

        await authController.logout(req, { status, json }, jest.fn());
        await flushAsync();

        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0].success).toBe(true);
    });

    /**
     * Ownership must come from the trusted authentication context. A
     * client-supplied `userId` in the body must be ignored.
     */
    test('derives userId from request.user and ignores a client-supplied userId', async () => {
        mockAuthService.revokeRefreshTokenByHash.mockResolvedValue({ count: 1 });
        const { json, status } = makeResponse();
        const req = {
            body: { refreshToken: 'a'.repeat(80), userId: 999 },
            user: { id: 7, email: 'a@b.c' },
            __: (key) => key,
        };

        await authController.logout(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.revokeRefreshTokenByHash).toHaveBeenCalledWith('a'.repeat(80), 7);
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * The logout response must never include the raw refresh token or echo the
     * authenticated user back to the client.
     */
    test('does not leak token material and returns no user payload', async () => {
        mockAuthService.revokeRefreshTokenByHash.mockResolvedValue({ count: 1 });
        const { json, status } = makeResponse();
        const token = 'b'.repeat(80);
        const safeUser = { id: 1, email: 'a@b.c', username: 'a', firstname: 'A', lastname: 'B' };
        const req = {
            body: { refreshToken: token },
            user: safeUser,
            __: (key) => key,
        };

        await authController.logout(req, { status, json }, jest.fn());
        await flushAsync();

        const payload = json.mock.calls[0][0];
        expect(JSON.stringify(payload)).not.toContain(token);
        expect(payload.data).toBeNull();
    });
});
