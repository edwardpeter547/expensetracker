/**
 * Regression tests for sensitive-data exposure in auth controller responses.
 *
 * These tests drive the exported controller handlers directly with mocked
 * services and assert that no password hash, reset token, or other credential
 * material appears in the serialized response data.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockAuthService = {
    getSafeUser: jest.fn(),
    getUser: jest.fn(),
    getVerificationToken: jest.fn(),
    confirmVerification: jest.fn(),
    removeVerificationToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
    createUser: jest.fn(),
    createLoginAttempt: jest.fn(),
    createRefreshToken: jest.fn(),
    createVerificationToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
    getRefreshToken: jest.fn(),
    refreshRecord: jest.fn(),
    sanitizeResponse: jest.fn(),
    updateLastLogin: jest.fn(),
    updateUserPassword: jest.fn(),
};

const mockEmailService = {
    sendRegistrationComplete: jest.fn(),
    sendVerificationConfirmation: jest.fn(),
    resendEmailVerificationLink: jest.fn(),
    sendPasswordResetCode: jest.fn(),
};

const mockProfileService = {
    revokeRefreshToken: jest.fn(),
};

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(path.join(servicesDirectory, 'email.service.js'), () => ({ default: mockEmailService }));
jest.unstable_mockModule(path.join(servicesDirectory, 'profile.service.js'), () => mockProfileService);

const authController = await import('../auth.controller.js');

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status };
};

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('auth.controller sensitive-data responses', () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('verifyEmail returns a user without a password hash', async () => {
        mockAuthService.getVerificationToken.mockResolvedValue({
            id: 'v1',
            token: 'raw-verification-token',
            expiresAt: new Date(Date.now() + 60 * 1000),
            user: { id: 1, email: 'a@b.c', language: 'en', username: 'a', firstname: 'A', lastname: 'B' },
        });
        mockAuthService.confirmVerification.mockResolvedValue(undefined);
        mockEmailService.sendVerificationConfirmation.mockResolvedValue(undefined);

        const { json, status } = makeResponse();
        const req = { query: { token: 'tok' }, __: (key) => key };

        await authController.verifyEmail(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.getVerificationToken).toHaveBeenCalledWith('tok');
        expect(status).toHaveBeenCalledWith(200);
        const payload = json.mock.calls[0][0];
        expect(payload.data.user).not.toHaveProperty('password');
        expect(payload.data.user).not.toHaveProperty('dateOfBirth');
        expect(payload.data.user).not.toHaveProperty('mobileNumber');
        expect(payload.data.user).toHaveProperty('email', 'a@b.c');
        expect(payload.data).not.toHaveProperty('token');
        expect(payload.data).not.toHaveProperty('verification');
    });

    test('resendVerification uses getSafeUser and omits the password hash', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({
            id: 1,
            email: 'a@b.c',
            username: 'a',
            firstname: 'A',
            lastname: 'B',
            language: 'en',
            isEmailVerified: false,
            isActive: false,
        });
        mockAuthService.saveVerificationToken.mockResolvedValue(undefined);
        mockEmailService.resendEmailVerificationLink.mockResolvedValue(undefined);

        const { json, status } = makeResponse();
        const req = { body: { email: 'a@b.c' }, __: (key) => key };

        await authController.resendVerification(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.getSafeUser).toHaveBeenCalledWith({ email: 'a@b.c' });
        expect(mockAuthService.getUser).not.toHaveBeenCalled();
        const payload = json.mock.calls[0][0];
        expect(payload.data.user).not.toHaveProperty('password');
        expect(payload.data.user).not.toHaveProperty('dateOfBirth');
        expect(payload.data.user).not.toHaveProperty('mobileNumber');
        expect(payload.data.user).toHaveProperty('email', 'a@b.c');
    });

    test('verifyToken returns a user without a password hash', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({ id: 1, email: 'a@b.c', language: 'en' });
        mockAuthService.verifyResetPasswordToken.mockResolvedValue({ valid: true });

        const { json, status } = makeResponse();
        const req = { body: { code: '123456', email: 'a@b.c' }, __: (key) => key };

        await authController.verifyToken(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.getSafeUser).toHaveBeenCalledWith({ email: 'a@b.c' });
        const payload = json.mock.calls[0][0];
        expect(payload.data.user).not.toHaveProperty('password');
        expect(payload.data.user).not.toHaveProperty('dateOfBirth');
        expect(payload.data.user).not.toHaveProperty('mobileNumber');
        expect(payload.data.user).toHaveProperty('email', 'a@b.c');
    });

    test('forgotPassword returns a user without a password hash or reset-token material', async () => {
        mockAuthService.getSafeUser.mockResolvedValue({
            id: 1,
            email: 'a@b.c',
            username: 'a',
            firstname: 'A',
            lastname: 'B',
            language: 'en',
        });
        mockAuthService.savePasswordResetToken.mockResolvedValue(undefined);
        mockEmailService.sendPasswordResetCode.mockResolvedValue(undefined);

        const { json, status } = makeResponse();
        const req = { body: { email: 'a@b.c' }, __: (key) => key };

        await authController.forgotPassword(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.getSafeUser).toHaveBeenCalledWith({ email: 'a@b.c' });
        const payload = json.mock.calls[0][0];
        expect(payload.data.user).not.toHaveProperty('password');
        expect(payload.data.user).not.toHaveProperty('dateOfBirth');
        expect(payload.data.user).not.toHaveProperty('mobileNumber');
        expect(payload.data.user).not.toHaveProperty('resetToken');
        expect(payload.data.user).not.toHaveProperty('passwordResetToken');
        expect(payload.data.user).not.toHaveProperty('verificationToken');
    });

    test('verifyEmail error path does not serialize user data', async () => {
        mockAuthService.getVerificationToken.mockResolvedValue(null);

        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { query: { token: 'bad' }, __: (key) => key };

        await authController.verifyEmail(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(400);
    });
});
