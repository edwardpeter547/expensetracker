/**
 * Unit tests for registration language persistence.
 *
 * Registration is anonymous, so it must persist only a supported, canonical
 * language. An explicit validated body language wins, otherwise the
 * `Accept-Language` header is negotiated with an English fallback.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockAuthService = {
    confirmVerification: jest.fn(),
    countRecentFailedLogins: jest.fn(),
    createLoginAttempt: jest.fn(),
    createRefreshToken: jest.fn(),
    createUser: jest.fn(),
    createVerificationToken: jest.fn(),
    getAccountLockout: jest.fn(),
    getUser: jest.fn(),
    getSafeUser: jest.fn(),
    getVerificationToken: jest.fn(),
    listUserSessions: jest.fn(),
    removeVerificationToken: jest.fn(),
    resetFailedLogins: jest.fn(),
    resetPasswordWithCode: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    revokeRefreshTokenByHash: jest.fn(),
    revokeUserSession: jest.fn(),
    rotateRefreshToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    saveVerificationToken: jest.fn(),
    updateLastLogin: jest.fn(),
    verifyResetPasswordToken: jest.fn(),
};

const mockAuthAuditService = {
    recordAuthAuditEvent: jest.fn(),
    hasRecentEvent: jest.fn(),
};

const mockEmailService = {
    sendRegistrationComplete: jest.fn(async () => {}),
};

jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(path.join(servicesDirectory, 'auth-audit.service.js'), () => mockAuthAuditService);
jest.unstable_mockModule(path.join(servicesDirectory, 'email.service.js'), () => ({default: mockEmailService}));

const { register } = await import('../auth.controller.js');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const makeRequest = (body, headers = {}) => ({
    body,
    ip: '127.0.0.1',
    headers: {'user-agent': 'test-agent', ...headers},
    query: {},
    id: 'corr-1',
    __: (phrase) => phrase,
});

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({json}));
    return {status, json};
};

describe('auth register controller language persistence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthService.createUser.mockResolvedValue({
            id: 1,
            email: 'a@b.c',
            firstname: 'Ada',
            unsubscribeToken: 'unsub-token',
        });
        mockAuthService.createRefreshToken.mockResolvedValue(null);
        mockAuthService.createLoginAttempt.mockResolvedValue(null);
        mockAuthService.createVerificationToken.mockResolvedValue(null);
        mockAuthAuditService.recordAuthAuditEvent.mockResolvedValue(null);
        mockAuthAuditService.hasRecentEvent.mockResolvedValue(false);
    });

    /**
     * An unsupported header must canonicalise to the English fallback rather
     * than persisting its raw primary subtag.
     */
    test('falls back to English for an unsupported header', async () => {
        const next = jest.fn();

        await register(makeRequest({
            email: 'a@b.c',
            username: 'ada',
            password: 'Password123',
            firstName: 'Ada',
            lastName: 'Lovelace',
            currency: 'USD',
        }, {'accept-language': 'de-DE'}), makeResponse(), next);
        await flushAsync();

        expect(mockAuthService.createUser).toHaveBeenCalledWith(
            'a@b.c',
            'ada',
            'Password123',
            'Ada',
            'Lovelace',
            'en',
            'USD',
        );
    });

    /**
     * A supported regional header must resolve to its base catalogue language.
     */
    test('canonicalises a supported regional header to its base language', async () => {
        const next = jest.fn();

        await register(makeRequest({
            email: 'a@b.c',
            username: 'ada',
            password: 'Password123',
            firstName: 'Ada',
            lastName: 'Lovelace',
            currency: 'USD',
        }, {'accept-language': 'fr-CA'}), makeResponse(), next);
        await flushAsync();

        expect(mockAuthService.createUser).toHaveBeenCalledWith(
            'a@b.c',
            'ada',
            'Password123',
            'Ada',
            'Lovelace',
            'fr',
            'USD',
        );
    });

    /**
     * An explicit, validated body language must win over the request header.
     */
    test('prefers an explicit body language over the header', async () => {
        const next = jest.fn();

        await register(makeRequest({
            email: 'a@b.c',
            username: 'ada',
            password: 'Password123',
            firstName: 'Ada',
            lastName: 'Lovelace',
            language: 'fr',
            currency: 'USD',
        }, {'accept-language': 'en'}), makeResponse(), next);
        await flushAsync();

        expect(mockAuthService.createUser).toHaveBeenCalledWith(
            'a@b.c',
            'ada',
            'Password123',
            'Ada',
            'Lovelace',
            'fr',
            'USD',
        );
    });
});
