import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const prismaModulePath = path.resolve(directory, '../../../configurations/prisma.connect.js');
const authServiceModulePath = path.resolve(directory, '../../../services/auth.service.js');
const profileServiceModulePath = path.resolve(directory, '../../../services/profile.service.js');

const mockTx = {
    accountDeletionRequest: { create: jest.fn() },
    user: { update: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
};

const mockPrisma = {
    $transaction: jest.fn(async (callback) => callback(mockTx)),
    user: { findUnique: jest.fn(), update: jest.fn() },
    accountDeletionRequest: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
    },
    deletionStep: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    budget: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
};

const mockAuthService = { getUser: jest.fn() };
const mockProfileService = { getUserProfileDto: jest.fn() };

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));
jest.unstable_mockModule(authServiceModulePath, () => mockAuthService);
jest.unstable_mockModule(profileServiceModulePath, () => mockProfileService);

const deletionService = await import('../service.js');

describe('deletion.service voluntary lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTx.accountDeletionRequest.create.mockResolvedValue({
            id: 'req-1',
            userId: 7,
            requestType: 'VOLUNTARY',
            recoveryDeadline: new Date(),
        });
        mockTx.user.update.mockResolvedValue({});
        mockTx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
        mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
    });

    /**
     * Requesting closure verifies the password, deactivates the account, bumps
     * the token version, revokes sessions, and schedules a 14-day deadline.
     */
    test('requests closure with a 14-day recovery deadline', async () => {
        const now = new Date('2026-10-26T10:00:00Z');
        const passwordHash = bcrypt.hashSync('Password123', 4);
        mockAuthService.getUser.mockResolvedValue({ id: 7, password: passwordHash, isActive: true });

        const result = await deletionService.requestVoluntaryDeletion({ userId: 7, password: 'Password123', now });

        expect(mockTx.accountDeletionRequest.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    requestType: 'VOLUNTARY',
                    status: 'PENDING_DELETION',
                }),
            })
        );
        expect(mockTx.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ isActive: false, tokenVersion: { increment: 1 } }),
            })
        );
        expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 7, isRevoked: false } })
        );
        expect(result.recoveryDeadline.getTime()).toBe(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    });

    /**
     * An incorrect password is rejected with 401 before any write.
     */
    test('rejects an incorrect password', async () => {
        const passwordHash = bcrypt.hashSync('Password123', 4);
        mockAuthService.getUser.mockResolvedValue({ id: 7, password: passwordHash, isActive: true });

        await expect(
            deletionService.requestVoluntaryDeletion({ userId: 7, password: 'wrong-password' })
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    /**
     * A concurrent duplicate request is rejected with 409 through the unique
     * active-request constraint.
     */
    test('rejects a concurrent duplicate request with 409', async () => {
        const passwordHash = bcrypt.hashSync('Password123', 4);
        mockAuthService.getUser.mockResolvedValue({ id: 7, password: passwordHash, isActive: true });
        mockTx.accountDeletionRequest.create.mockRejectedValueOnce(
            Object.assign(new Error('duplicate'), { code: 'P2002' })
        );

        await expect(
            deletionService.requestVoluntaryDeletion({ userId: 7, password: 'Password123' })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    /**
     * Cancellation is atomic and reactivates the account.
     */
    test('cancels an eligible closure atomically', async () => {
        const passwordHash = bcrypt.hashSync('Password123', 4);
        mockAuthService.getUser.mockResolvedValue({ id: 7, password: passwordHash });
        mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue({ id: 'req-1' });
        mockPrisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.user.update.mockResolvedValue({});

        const result = await deletionService.cancelDeletion({
            email: 'a@b.c',
            password: 'Password123',
            now: new Date('2026-10-27T00:00:00Z'),
        });

        expect(mockPrisma.accountDeletionRequest.updateMany).toHaveBeenCalledWith({
            where: { id: 'req-1', status: 'PENDING_DELETION' },
            data: { status: 'CANCELLED' },
        });
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: 7 },
            data: { isActive: true },
        });
        expect(result.requestId).toBe('req-1');
    });
});

describe('deletion.service statutory and retention', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * A statutory request is scheduled immediately with no recovery delay.
     */
    test('schedules a statutory erasure request immediately', async () => {
        const now = new Date('2026-10-26T10:00:00Z');
        mockPrisma.user.findUnique.mockResolvedValue({ id: 7 });
        mockPrisma.accountDeletionRequest.create.mockResolvedValue({
            id: 'req-1',
            status: 'PENDING_DELETION',
            requestType: 'STATUTORY',
            scheduledFor: now,
        });

        const result = await deletionService.createStatutoryErasureRequest({ userId: 7, now });

        expect(mockPrisma.accountDeletionRequest.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    requestType: 'STATUTORY',
                    scheduledFor: now,
                }),
            })
        );
        expect(mockPrisma.accountDeletionRequest.create.mock.calls[0][0].data.recoveryDeadline).toBeUndefined();
        expect(result.status).toBe('PENDING_DELETION');
    });

    /**
     * A statutory request with a scope other than ALL requires human review.
     */
    test('requires review for a partial statutory scope', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 7 });
        mockPrisma.accountDeletionRequest.create.mockResolvedValue({
            id: 'req-1',
            status: 'REVIEW_REQUIRED',
        });

        const result = await deletionService.createStatutoryErasureRequest({ userId: 7, scope: 'PARTIAL' });

        expect(result.status).toBe('REVIEW_REQUIRED');
    });

    /**
     * Recording a RETAIN decision marks the step retained.
     */
    test('records a retention decision', async () => {
        mockPrisma.deletionStep.findUnique.mockResolvedValue({ id: 's1', category: 'transactions', status: 'PENDING' });
        mockPrisma.deletionStep.update.mockResolvedValue({});

        await deletionService.recordRetentionDecision({
            requestId: 'req-1',
            category: 'transactions',
            action: 'RETAIN',
            reason: 'lawful basis',
            reviewer: 'privacy-officer',
        });

        expect(mockPrisma.deletionStep.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'RETAINED', retentionReason: 'lawful basis' }),
            })
        );
    });
});

describe('deletion.service failure and export', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Failures increment the counter, schedule a bounded retry, and eventually
     * fail the request permanently.
     */
    test('records failure and eventually fails permanently', async () => {
        mockPrisma.accountDeletionRequest.findUnique.mockResolvedValue({ failureCount: 4 });
        mockPrisma.accountDeletionRequest.update.mockResolvedValue({});

        const result = await deletionService.recordFailure({ requestId: 'req-1', error: new Error('boom') });

        expect(result.status).toBe('FAILED');
        expect(mockPrisma.accountDeletionRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'FAILED', lastError: 'boom' }),
            })
        );
    });

    /**
     * The export contains profile and financial data but never credentials.
     */
    test('exports financial data without secrets', async () => {
        mockProfileService.getUserProfileDto.mockResolvedValue({ id: 7, email: 'a@b.c' });
        mockPrisma.transaction.findMany.mockResolvedValue([]);
        mockPrisma.budget.findMany.mockResolvedValue([]);
        mockPrisma.category.findMany.mockResolvedValue([]);

        const result = await deletionService.exportUserData({ userId: 7 });

        expect(result.schemaVersion).toBe(1);
        expect(JSON.stringify(result)).not.toContain('password');
        expect(JSON.stringify(result)).not.toContain('tokenVersion');
    });
});
