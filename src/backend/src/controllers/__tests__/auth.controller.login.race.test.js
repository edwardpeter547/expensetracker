/**
 * Deterministic ordering test for the login controller: once the lockout
 * threshold has committed, a correct-password request is rejected even if its
 * password verification resolves successfully afterward.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import bcryptjs from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import { StatusCodes } from 'http-status-codes';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockAuthService = {
    confirmVerification: jest.fn(),
    createLoginAttempt: jest.fn(),
    createRefreshToken: jest.fn(),
    createUser: jest.fn(),
    createVerificationToken: jest.fn(),
    getAccountLockout: jest.fn(),
    getSafeUser: jest.fn(),
    getUser: jest.fn(),
    getVerificationToken: jest.fn(),
    removeVerificationToken: jest.fn(),
    resetFailedLogins: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    rotateRefreshToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    updateLastLogin: jest.fn(),
    updateUserPassword: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
    listUserSessions: jest.fn(),
    revokeUserSession: jest.fn(),
};

const mockedCompare = jest.fn();

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(
    path.join(servicesDirectory, 'email.service.js'),
    () => ({default: {}})
);
jest.unstable_mockModule('bcryptjs', () => ({
    default: {compare: mockedCompare, hashSync: bcryptjs.hashSync},
}));

const { login } = await import('../auth.controller.js');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const makeRequest = () => ({
    body: {email: 'known@example.com', password: 'CorrectPass123'},
    ip: '127.0.0.1',
    headers: {},
    query: {},
    __: (phrase) => phrase,
});

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({json}));
    return {status, json};
};

describe('auth login lockout ordering', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthService.getUser.mockResolvedValue({
            id: 1,
            email: 'known@example.com',
            password: 'irrelevant',
            isActive: true,
        });
        mockAuthService.getSafeUser.mockResolvedValue({id: 1, email: 'known@example.com'});
        mockAuthService.getAccountLockout.mockResolvedValue({locked: false, lockedUntil: null});
    });

    test('a correct password is rejected when the lockout commits during verification', async () => {
        let resolveCompare;
        mockedCompare.mockImplementation(
            () => new Promise((resolve) => {
                resolveCompare = resolve;
            })
        );

        const next = jest.fn();
        const pending = login(makeRequest(), makeResponse(), next);

        // Allow the controller to reach (and pause inside) bcrypt.compare.
        await flushAsync();

        // The threshold commits while the (controlled) password check is still
        // pending; the controller performs its lockout check after the hash.
        mockAuthService.getAccountLockout.mockResolvedValue({
            locked: true,
            lockedUntil: new Date(Date.now() + 60000),
        });
        resolveCompare(true);

        await pending;
        await flushAsync();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(mockAuthService.resetFailedLogins).not.toHaveBeenCalled();
        expect(mockAuthService.createRefreshToken).not.toHaveBeenCalled();
    });

    test('a correct password is admitted when the lockout has not committed', async () => {
        mockedCompare.mockResolvedValue(true);
        const response = makeResponse();

        await login(makeRequest(), response, jest.fn());
        await flushAsync();

        expect(response.status).toHaveBeenCalledWith(StatusCodes.OK);
        expect(mockAuthService.resetFailedLogins).toHaveBeenCalled();
    });
});
