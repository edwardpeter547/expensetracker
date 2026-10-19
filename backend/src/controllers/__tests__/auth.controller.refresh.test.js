/**
 * Controller-level tests for the refresh-token and logout endpoints.
 *
 * These verify the endpoint wiring: the refresh response returns only the new
 * token pair, invalid tokens map to 401, missing tokens map to 400, and logout
 * revokes the presented token by its hash.
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
    getVerificationToken: jest.fn(),
    refreshRecord: jest.fn(),
    removeVerificationToken: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    rotateRefreshToken: jest.fn(),
    sanitizeResponse: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    updateLastLogin: jest.fn(),
    updateUserPassword: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
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

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status };
};

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('auth controller refresh-token endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('refreshToken returns only the new token pair', async () => {
        mockAuthService.rotateRefreshToken.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            userId: 1,
        });
        const { json, status } = makeResponse();
        const req = { body: { refreshToken: 'a'.repeat(80) } };

        await authController.refreshToken(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.rotateRefreshToken).toHaveBeenCalledWith('a'.repeat(80));
        expect(status).toHaveBeenCalledWith(200);
        expect(json.mock.calls[0][0].data).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });
        expect(json.mock.calls[0][0].data).not.toHaveProperty('userId');
    });

    test('refreshToken maps an invalid token to 401', async () => {
        const error = new Error('Invalid Refresh Token');
        error.statusCode = 401;
        mockAuthService.rotateRefreshToken.mockRejectedValue(error);
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { body: { refreshToken: 'a'.repeat(80) } };

        await authController.refreshToken(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('refreshToken requires a refresh token body field', async () => {
        const { json, status } = makeResponse();
        const next = jest.fn();
        const req = { body: {} };

        await authController.refreshToken(req, { status, json }, next);
        await flushAsync();

        expect(json).not.toHaveBeenCalled();
        expect(next.mock.calls[0][0].statusCode).toBe(400);
    });

    test('logout revokes the presented token by its hash', async () => {
        mockAuthService.revokeRefreshTokenByHash.mockResolvedValue({ count: 1 });
        const { json, status } = makeResponse();
        const req = { body: { refreshToken: 'a'.repeat(80) }, user: { id: 1, email: 'a@b.c' }, __: (key) => key };

        await authController.logout(req, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAuthService.revokeRefreshTokenByHash).toHaveBeenCalledWith('a'.repeat(80), 1);
        expect(status).toHaveBeenCalledWith(200);
    });
});
