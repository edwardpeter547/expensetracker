/**
 * Unit tests for the JWT authentication middleware.
 *
 * These tests verify HS256 pinning, issuer/audience enforcement, token
 * versioning, and the safe 401 behavior for missing or invalid tokens. The
 * profile service is mocked so the tests exercise only the middleware.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockUserProfile = jest.fn();

jest.unstable_mockModule(
    path.join(servicesDirectory, 'profile.service.js'),
    () => ({ userProfile: mockUserProfile })
);

const jwt = (await import('jsonwebtoken')).default;
const Config = (await import('../../configurations/env.config.js')).default;
const { authenticate } = await import('../auth.middleware.js');

/**
 * Sign a bearer token with the given payload and options.
 *
 * @param {object} payload JWT claims.
 * @param {object} options `jsonwebtoken` signing options.
 * @returns {string} The signed JWT.
 */
const signToken = (payload, options = {}) => jwt.sign(payload, Config.jwtSecret, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: Config.jwtIssuer,
    audience: Config.jwtAudience,
    ...options,
});

describe('authenticate middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserProfile.mockResolvedValue({
            id: 1,
            email: 'a@b.c',
            isActive: true,
            tokenVersion: 0,
        });
    });

    test('accepts a valid HS256 token with matching issuer, audience, and token version', async () => {
        const request = {
            headers: {
                authorization: `Bearer ${signToken({ userId: 1, email: 'a@b.c', tokenVersion: 0 })}`,
            },
        };
        const next = jest.fn();

        await authenticate(request, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(mockUserProfile).toHaveBeenCalledWith({ userId: 1 });
        expect(request.user).toEqual(expect.objectContaining({ id: 1, tokenVersion: 0 }));
    });

    test('rejects a missing bearer token with 401', async () => {
        const next = jest.fn();

        await authenticate({ headers: {} }, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects a token signed with a non-HS256 algorithm with 401', async () => {
        const token = signToken(
            { userId: 1, email: 'a@b.c', tokenVersion: 0 },
            { algorithm: 'HS384' }
        );
        const next = jest.fn();

        await authenticate(
            { headers: { authorization: `Bearer ${token}` } },
            {},
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects a token with an unexpected issuer with 401', async () => {
        const token = signToken(
            { userId: 1, email: 'a@b.c', tokenVersion: 0 },
            { issuer: 'wrong-issuer' }
        );
        const next = jest.fn();

        await authenticate(
            { headers: { authorization: `Bearer ${token}` } },
            {},
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects a token with an unexpected audience with 401', async () => {
        const token = signToken(
            { userId: 1, email: 'a@b.c', tokenVersion: 0 },
            { audience: 'wrong-audience' }
        );
        const next = jest.fn();

        await authenticate(
            { headers: { authorization: `Bearer ${token}` } },
            {},
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    test('rejects a token whose version no longer matches the user with 401', async () => {
        mockUserProfile.mockResolvedValue({
            id: 1,
            email: 'a@b.c',
            isActive: true,
            tokenVersion: 1,
        });
        const token = signToken({ userId: 1, email: 'a@b.c', tokenVersion: 0 });
        const next = jest.fn();

        await authenticate(
            { headers: { authorization: `Bearer ${token}` } },
            {},
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(401);
    });
});
