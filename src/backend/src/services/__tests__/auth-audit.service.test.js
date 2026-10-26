/**
 * Unit tests for the authentication audit service.
 *
 * Prisma is mocked so these tests verify validation, the metadata allowlist,
 * and the documented persistence-failure policy without a live database.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const mockAuthAuditEvent = {
    create: jest.fn(),
    findFirst: jest.fn(),
};

const mockPrisma = {
    authAuditEvent: mockAuthAuditEvent,
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({default: mockPrisma}));

const auditService = await import('../auth-audit.service.js');
const {
    AUTH_AUDIT_EVENT_TYPES,
    AUTH_AUDIT_OUTCOMES,
    AUTH_AUDIT_REASONS,
} = await import('../../constants/auth-audit.constants.js');

describe('auth audit service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthAuditEvent.create.mockResolvedValue({id: 'evt-1'});
        mockAuthAuditEvent.findFirst.mockResolvedValue(null);
    });

    /**
     * A valid event must persist only the allowlisted metadata and coerce the
     * nullable request fields to null when absent.
     */
    test('persists a valid event with sanitized metadata', async () => {
        await auditService.recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.LOGIN,
            outcome: AUTH_AUDIT_OUTCOMES.FAILURE,
            userId: 1,
            ipAddress: '127.0.0.1',
            correlationId: 'corr-1',
            metadata: {
                reason: AUTH_AUDIT_REASONS.INVALID_CREDENTIALS,
                attemptCount: 3,
                unsupported: 'dropped',
                password: 'secret',
            },
        });

        expect(mockAuthAuditEvent.create).toHaveBeenCalledWith({
            data: {
                eventType: AUTH_AUDIT_EVENT_TYPES.LOGIN,
                outcome: AUTH_AUDIT_OUTCOMES.FAILURE,
                userId: 1,
                ipAddress: '127.0.0.1',
                correlationId: 'corr-1',
                metadata: {reason: AUTH_AUDIT_REASONS.INVALID_CREDENTIALS, attemptCount: 3},
            },
        });
    });

    /**
     * An unsupported event type must be rejected without throwing, and nothing
     * must be written to the database.
     */
    test('rejects an unsupported event type without persisting', async () => {
        const result = await auditService.recordAuthAuditEvent({
            eventType: 'NOT_REAL',
            outcome: AUTH_AUDIT_OUTCOMES.SUCCESS,
        });

        expect(result).toBeNull();
        expect(mockAuthAuditEvent.create).not.toHaveBeenCalled();
    });

    /**
     * A critical event whose write fails must throw a 500 so the caller can
     * fail closed rather than silently losing required audit evidence.
     */
    test('throws a 500 for a critical persistence failure', async () => {
        mockAuthAuditEvent.create.mockRejectedValue(new Error('db down'));

        await expect(auditService.recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.PASSWORD_CHANGE,
            outcome: AUTH_AUDIT_OUTCOMES.SUCCESS,
            userId: 1,
        }, {critical: true})).rejects.toMatchObject({statusCode: 500});
    });

    /**
     * A non-critical persistence failure must be swallowed (returning null) so
     * a degraded audit store never changes an authentication response.
     */
    test('swallows a non-critical persistence failure', async () => {
        mockAuthAuditEvent.create.mockRejectedValue(new Error('db down'));

        const result = await auditService.recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.LOGIN,
            outcome: AUTH_AUDIT_OUTCOMES.FAILURE,
            userId: null,
        });

        expect(result).toBeNull();
    });

    /**
     * `hasRecentEvent` must report whether a matching event exists since the
     * given instant, backed by the Prisma query rather than in-memory state.
     */
    test('hasRecentEvent reflects the matching query result', async () => {
        mockAuthAuditEvent.findFirst.mockResolvedValue({id: 'evt-1'});

        await expect(auditService.hasRecentEvent({
            userId: 1,
            eventType: AUTH_AUDIT_EVENT_TYPES.REPEATED_AUTH_FAILURES,
            since: new Date(0),
        })).resolves.toBe(true);

        expect(mockAuthAuditEvent.findFirst).toHaveBeenCalledWith({
            where: {
                userId: 1,
                eventType: AUTH_AUDIT_EVENT_TYPES.REPEATED_AUTH_FAILURES,
                createdAt: {gte: new Date(0)},
            },
            select: {id: true},
        });
    });
});
