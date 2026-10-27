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

const mockAuthAuditService = {
    recordAuthAuditEvent: jest.fn(),
    hasRecentEvent: jest.fn(),
};

jest.unstable_mockModule(
    path.join(servicesDirectory, 'auth-audit.service.js'),
    () => mockAuthAuditService
);

const jwt = (await import('jsonwebtoken')).default;
const Config = (await import('../../configurations/env.config.js')).default;
const { authenticate, authorize } = await import('../auth.middleware.js');

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
        mockAuthAuditService.recordAuthAuditEvent.mockResolvedValue(null);
        mockAuthAuditService.hasRecentEvent.mockResolvedValue(false);
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

describe('authorize middleware', () => {
    /**
     * Reset mock state and return the audit service to its success path
     * before every authorization test.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthAuditService.recordAuthAuditEvent.mockResolvedValue(null);
    });

    /**
     * An unauthenticated request must be rejected with the same 401 error
     * contract as `authenticate` and produce one authorization-denied audit
     * event carrying the correlation id.
     */
    test('rejects unauthenticated requests with the existing 401 contract and audits the denial', async () => {
        const request = { id: 'corr-1', ip: '127.0.0.1', headers: {} };
        const next = jest.fn();

        await authorize('ADMIN')(request, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({
            message: 'Access denied. No token provided.',
            statusCode: 401,
        });
        expect(mockAuthAuditService.recordAuthAuditEvent).toHaveBeenCalledTimes(1);
        expect(mockAuthAuditService.recordAuthAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'AUTHORIZATION_DENIED',
                outcome: 'DENIED',
                userId: null,
                correlationId: 'corr-1',
                metadata: {reason: 'INSUFFICIENT_PERMISSION'},
            })
        );
    });

    /**
     * With no required roles the factory degrades to an authentication-only
     * guard, allowing an authenticated principal without recording an audit
     * event.
     */
    test('acts as an authentication-only guard when no roles are provided', async () => {
        const request = { user: { id: 1 } };
        const next = jest.fn();

        await authorize()(request, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(mockAuthAuditService.recordAuthAuditEvent).not.toHaveBeenCalled();
    });

    /**
     * An authenticated principal with no established roles must be denied with
     * a 403 and audited against its resolved user id.
     */
    test('rejects an authenticated user without an established role with 403 and audits the denial', async () => {
        const request = { id: 'corr-2', ip: '127.0.0.1', user: { id: 1 } };
        const next = jest.fn();

        await authorize('ADMIN')(request, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({
            message: 'Access denied. Insufficient permissions.',
            statusCode: 403,
        });
        expect(mockAuthAuditService.recordAuthAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 1,
                correlationId: 'corr-2',
                metadata: {reason: 'INSUFFICIENT_PERMISSION'},
            })
        );
    });

    /**
     * A principal whose server-established roles include a required role is
     * allowed through without a denial audit event.
     */
    test('allows an authenticated user whose established role matches a required role', async () => {
        const request = { user: { id: 1, roles: ['ADMIN'] } };
        const next = jest.fn();

        await authorize('ADMIN')(request, {}, next);

        expect(next).toHaveBeenCalledWith();
        expect(mockAuthAuditService.recordAuthAuditEvent).not.toHaveBeenCalled();
    });

    /**
     * Multiple required roles use any-of semantics, so a principal holding one
     * of them is authorized.
     */
    test('allows access when any one of several required roles is established', async () => {
        const request = { user: { id: 1, roles: ['MEMBER'] } };
        const next = jest.fn();

        await authorize('ADMIN', 'MEMBER')(request, {}, next);

        expect(next).toHaveBeenCalledWith();
    });

    /**
     * A non-array role claim is malformed and must fail closed with a 403
     * rather than being coerced into a matching role.
     */
    test('fails closed when the established role claim is malformed', async () => {
        const request = { user: { id: 1, roles: 'ADMIN' } };
        const next = jest.fn();

        await authorize('ADMIN')(request, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    /**
     * Role claims supplied in the request body are ignored; only the
     * server-established principal is trusted.
     */
    test('never trusts a client-supplied role claim', async () => {
        const request = { user: { id: 1 }, body: { roles: ['ADMIN'] } };
        const next = jest.fn();

        await authorize('ADMIN')(request, {}, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
});
