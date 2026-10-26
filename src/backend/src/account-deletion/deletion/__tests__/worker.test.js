import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const prismaModulePath = path.resolve(directory, '../../../configurations/prisma.connect.js');
const serviceModulePath = path.resolve(directory, '../service.js');

const mockPrisma = {
    accountDeletionRequest: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
};
const mockCaptureDeletionContext = jest.fn();

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));
jest.unstable_mockModule(serviceModulePath, () => ({
    buildDeletionCoordinator: jest.fn(),
    captureDeletionContext: mockCaptureDeletionContext,
    recordFailure: jest.fn(),
}));

const worker = await import('../worker.js');

describe('deletion.worker claim', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Due requests are claimed atomically; a request whose update matches zero
     * rows (claimed by another worker) is not returned.
     */
    test('atomically claims only requests it wins', async () => {
        const now = new Date();
        mockPrisma.accountDeletionRequest.findMany.mockResolvedValue([
            { id: 'r1', userId: 1, context: null },
            { id: 'r2', userId: 2, context: { userId: 2, avatarKey: 'avatars/2/x.webp' } },
        ]);
        mockPrisma.accountDeletionRequest.updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 0 });
        mockCaptureDeletionContext.mockResolvedValue({ userId: 1, avatarKey: null });

        const claimed = await worker.claimDueDeletionRequests({ now });

        expect(claimed).toEqual([{ id: 'r1' }]);
        expect(mockPrisma.accountDeletionRequest.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: 'r1' }),
                data: expect.objectContaining({
                    status: 'DELETION_IN_PROGRESS',
                    leaseOwner: expect.any(String),
                }),
            })
        );
    });

    /**
     * A first-time claim captures the deletion context before persisting it.
     */
    test('captures the context on first claim', async () => {
        const now = new Date();
        mockPrisma.accountDeletionRequest.findMany.mockResolvedValue([
            { id: 'r1', userId: 1, context: null },
        ]);
        mockPrisma.accountDeletionRequest.updateMany.mockResolvedValue({ count: 1 });
        mockCaptureDeletionContext.mockResolvedValue({ userId: 1, avatarKey: 'avatars/1/x.webp' });

        await worker.claimDueDeletionRequests({ now });

        expect(mockCaptureDeletionContext).toHaveBeenCalledWith(1);
        expect(mockPrisma.accountDeletionRequest.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    context: { userId: 1, avatarKey: 'avatars/1/x.webp' },
                }),
            })
        );
    });
});
