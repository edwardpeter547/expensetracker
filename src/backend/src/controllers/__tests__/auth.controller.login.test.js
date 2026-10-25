/**
 * Unit tests for the login controller's uniform failure responses, temporary
 * lockout behavior, and successful-login counter reset.
 */
import { describe, expect, jest, test } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import { StatusCodes } from 'http-status-codes';

// A non-secret value so token generation works regardless of the local
// gitignored test.env file. env.config never overrides an existing value.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockAuthService = {
    confirmVerification: jest.fn(),
    createUser: jest.fn(),
    createVerificationToken: jest.fn(),
    getUser: jest.fn(),
    getVerificationToken: jest.fn(),
    removeVerificationToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
    resetPasswordWithCode: jest.fn(),
    updateUserPassword: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    rotateRefreshToken: jest.fn(),
    getAccountLockout: jest.fn(),
    resetFailedLogins: jest.fn(),
    getSafeUser: jest.fn(),
    createRefreshToken: jest.fn(),
    updateLastLogin: jest.fn(),
    createLoginAttempt: jest.fn(),
    listUserSessions: jest.fn(),
    revokeUserSession: jest.fn(),
};

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(
    path.join(servicesDirectory, 'email.service.js'),
    () => ({default: {}})
);

const { login } = await import('../auth.controller.js');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const passwordHash = bcrypt.hashSync('CorrectPass123', 4);

const makeRequest = (email, password) => ({
    body: {email, password},
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

describe('auth login controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthService.getAccountLockout.mockResolvedValue({locked: false, lockedUntil: null});
    });

    test('unknown email returns 401', async () => {
        mockAuthService.getUser.mockResolvedValue(null);
        const next = jest.fn();

        await login(makeRequest('unknown@example.com', 'whatever'), makeResponse(), next);
        // The fixed-cost dummy bcrypt comparison is intentionally slow to
        // equalize timing; wait for it to settle before asserting.
        await new Promise((resolve) => setTimeout(resolve, 800));

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(mockAuthService.createLoginAttempt).toHaveBeenCalledWith(
            expect.objectContaining({email: 'unknown@example.com', loginAttemptStatus: false})
        );
    });

    test('wrong password returns the same 401 as unknown email', async () => {
        mockAuthService.getUser.mockResolvedValue({
            id: 1, email: 'known@example.com', password: passwordHash, isActive: true,
        });
        const next = jest.fn();

        await login(makeRequest('known@example.com', 'WrongPass123'), makeResponse(), next);
        await flushAsync();

        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('deactivated account returns 401 without revealing status', async () => {
        mockAuthService.getUser.mockResolvedValue({
            id: 1, email: 'known@example.com', password: passwordHash, isActive: false,
        });
        const next = jest.fn();

        await login(makeRequest('known@example.com', 'CorrectPass123'), makeResponse(), next);
        await flushAsync();

        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
    });

    test('a locked account rejects even correct credentials with 401', async () => {
        mockAuthService.getUser.mockResolvedValue({
            id: 1, email: 'known@example.com', password: passwordHash, isActive: true,
        });
        mockAuthService.getAccountLockout.mockResolvedValue({locked: true, lockedUntil: new Date(Date.now() + 60000)});
        const next = jest.fn();

        await login(makeRequest('known@example.com', 'CorrectPass123'), makeResponse(), next);
        await flushAsync();

        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(mockAuthService.resetFailedLogins).not.toHaveBeenCalled();
    });

    /**
     * A wrong password is persisted as a failed attempt even when the account is
     * already locked, so the request is audited before the lockout gate returns 401.
     */
    test('a wrong password on a locked account still records the failed attempt', async () => {
        mockAuthService.getUser.mockResolvedValue({
            id: 1, email: 'known@example.com', password: passwordHash, isActive: true,
        });
        mockAuthService.getAccountLockout.mockResolvedValue({locked: true, lockedUntil: new Date(Date.now() + 60000)});
        const next = jest.fn();

        await login(makeRequest('known@example.com', 'WrongPass123'), makeResponse(), next);
        await flushAsync();

        expect(next.mock.calls[0][0].statusCode).toBe(StatusCodes.UNAUTHORIZED);
        expect(mockAuthService.createLoginAttempt).toHaveBeenCalledWith(
            expect.objectContaining({email: 'known@example.com', loginAttemptStatus: false})
        );
    });

    test('successful login resets failures and issues tokens', async () => {
        mockAuthService.getUser.mockResolvedValue({
            id: 1, email: 'known@example.com', password: passwordHash, isActive: true,
        });
        mockAuthService.getSafeUser.mockResolvedValue({id: 1, email: 'known@example.com'});
        const response = makeResponse();

        await login(makeRequest('known@example.com', 'CorrectPass123'), response, jest.fn());
        await flushAsync();

        expect(mockAuthService.resetFailedLogins).toHaveBeenCalledWith('known@example.com');
        expect(mockAuthService.createRefreshToken).toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
});
