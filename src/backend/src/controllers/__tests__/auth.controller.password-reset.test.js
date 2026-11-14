/**
 * Controller tests for password-recovery behaviours added for Issue #224.
 *
 * These cover the per-account resend cooldown and the expired-vs-invalid
 * error-code mapping without requiring a database.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockAuthService = {
    countRecentFailedLogins: jest.fn(),
    createLoginAttempt: jest.fn(),
    createRefreshToken: jest.fn(),
    createUser: jest.fn(),
    createVerificationCode: jest.fn(),
    getAccountLockout: jest.fn(),
    getLatestVerificationCode: jest.fn(),
    getLatestPasswordResetToken: jest.fn(),
    getUser: jest.fn(),
    getSafeUser: jest.fn(),
    listUserSessions: jest.fn(),
    resetFailedLogins: jest.fn(),
    resetPasswordWithCode: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeUserSession: jest.fn(),
    rotateRefreshToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationCode: jest.fn(),
    updateLastLogin: jest.fn(),
    verifyEmailCode: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
};

const mockAuthAuditService = {
    recordAuthAuditEvent: jest.fn(),
    hasRecentEvent: jest.fn(),
};

const mockEmailService = {
    sendPasswordResetCode: jest.fn(),
};

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(path.join(servicesDirectory, 'auth-audit.service.js'), () => mockAuthAuditService);
jest.unstable_mockModule(path.join(servicesDirectory, 'email.service.js'), () => ({default: mockEmailService}));

const authController = await import('../auth.controller.js');

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({json}));
    return {json, status};
};

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('auth.controller password recovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthAuditService.recordAuthAuditEvent.mockResolvedValue(null);
        mockAuthAuditService.hasRecentEvent.mockResolvedValue(false);
    });

    /**
     * A repeat forgot-password request within the per-account cooldown must
     * return the generic response without issuing a fresh code or email.
     */
    test('forgotPassword skips issuing a code during the resend cooldown', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({id: 1, email: 'a@b.c'});
        mockAuthService.getLatestPasswordResetToken.mockResolvedValue({
            id: 'token-1',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            usedAt: null,
            attempts: 0,
        });

        const {json, status} = makeResponse();
        const req = {body: {email: 'a@b.c'}, ip: '127.0.0.1', __: (key) => key};

        await authController.forgotPassword(req, {status, json}, jest.fn());
        await flushAsync();

        expect(mockAuthService.getLatestPasswordResetToken).toHaveBeenCalledWith(1);
        expect(mockAuthService.savePasswordResetToken).not.toHaveBeenCalled();
        expect(mockEmailService.sendPasswordResetCode).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0].data).toBeNull();
    });

    /**
     * Once the cooldown has elapsed, forgot-password must issue and email a
     * fresh code.
     */
    test('forgotPassword issues a fresh code after the cooldown elapses', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({id: 1, email: 'a@b.c'});
        mockAuthService.getLatestPasswordResetToken.mockResolvedValue({
            id: 'token-1',
            createdAt: new Date(Date.now() - 10 * 60 * 1000),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            usedAt: null,
            attempts: 0,
        });
        mockAuthService.savePasswordResetToken.mockResolvedValue(undefined);
        mockEmailService.sendPasswordResetCode.mockResolvedValue(undefined);

        const {json, status} = makeResponse();
        const req = {body: {email: 'a@b.c'}, ip: '127.0.0.1', __: (key) => key};

        await authController.forgotPassword(req, {status, json}, jest.fn());
        await flushAsync();

        expect(mockAuthService.savePasswordResetToken).toHaveBeenCalled();
        expect(mockEmailService.sendPasswordResetCode).toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * An expired OTP must surface the stable RESET_TOKEN_EXPIRED code instead
     * of the generic invalid-code response.
     */
    test('verifyToken returns RESET_TOKEN_EXPIRED for an expired code', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({id: 1, email: 'a@b.c', language: 'en'});
        mockAuthService.verifyResetPasswordToken.mockResolvedValue({
            valid: false,
            code: null,
            reason: 'expired',
        });

        const next = jest.fn();
        const req = {body: {code: '123456', email: 'a@b.c'}, __: (key) => key};

        await authController.verifyToken(req, {status: jest.fn(), json: jest.fn()}, next);
        await flushAsync();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
        expect(next.mock.calls[0][0].code).toBe('RESET_TOKEN_EXPIRED');
    });

    /**
     * A code that expires between verification and reset must also surface
     * RESET_TOKEN_EXPIRED from the reset endpoint.
     */
    test('resetPassword returns RESET_TOKEN_EXPIRED for an expired code', async () => {
        mockAuthService.getUser.mockResolvedValue({id: 1, email: 'a@b.c', language: 'en'});
        mockAuthService.resetPasswordWithCode.mockResolvedValue({
            success: false,
            reason: 'expired',
        });

        const next = jest.fn();
        const req = {
            body: {code: '123456', email: 'a@b.c', password: 'NewPassword123'},
            ip: '127.0.0.1',
            __: (key) => key,
        };

        await authController.resetPassword(req, {status: jest.fn(), json: jest.fn()}, next);
        await flushAsync();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
        expect(next.mock.calls[0][0].code).toBe('RESET_TOKEN_EXPIRED');
    });
});
