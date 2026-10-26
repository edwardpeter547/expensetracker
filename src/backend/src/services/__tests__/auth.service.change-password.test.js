import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

const mockTx = {
    $queryRaw: jest.fn(),
    passwordHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
    user: {
        update: jest.fn(),
    },
    refreshToken: {
        updateMany: jest.fn(),
    },
};

const mockPrisma = {
    $transaction: jest.fn(async (callback) => callback(mockTx)),
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const authService = await import('../auth.service.js');

describe('auth.service changeUserPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTx.passwordHistory.findMany.mockResolvedValue([]);
        mockTx.passwordHistory.create.mockResolvedValue({});
        mockTx.user.update.mockResolvedValue({});
        mockTx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    });

    /**
     * A correct current password with a fresh new password must record the old
     * hash, store the new hash, increment the token version, and revoke every
     * active refresh token in one transaction.
     */
    test('changes the password and revokes all sessions atomically', async () => {
        const currentHash = bcrypt.hashSync('CurrentPass1', 4);
        mockTx.$queryRaw.mockResolvedValue([{ password: currentHash }]);

        await authService.changeUserPassword(1, 'CurrentPass1', 'BrandNewPass2');

        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockTx.passwordHistory.create).toHaveBeenCalledWith({
            data: { password: currentHash, userId: 1 },
        });
        expect(mockTx.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
            })
        );
        expect(mockTx.refreshToken.updateMany).toHaveBeenCalledWith({
            where: { userId: 1, isRevoked: false },
            data: { isRevoked: true },
        });
    });

    /**
     * An incorrect current password must fail with 401 and perform no writes.
     */
    test('rejects an incorrect current password with 401', async () => {
        const currentHash = bcrypt.hashSync('CurrentPass1', 4);
        mockTx.$queryRaw.mockResolvedValue([{ password: currentHash }]);

        await expect(
            authService.changeUserPassword(1, 'WrongPass123', 'BrandNewPass2')
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(mockTx.user.update).not.toHaveBeenCalled();
        expect(mockTx.passwordHistory.create).not.toHaveBeenCalled();
    });

    /**
     * Reusing the current password as the new password must fail with 409.
     */
    test('rejects current-password reuse with 409', async () => {
        const currentHash = bcrypt.hashSync('CurrentPass1', 4);
        mockTx.$queryRaw.mockResolvedValue([{ password: currentHash }]);

        await expect(
            authService.changeUserPassword(1, 'CurrentPass1', 'CurrentPass1')
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    /**
     * Reusing any previous password must fail with 409.
     */
    test('rejects password-history reuse with 409', async () => {
        const currentHash = bcrypt.hashSync('CurrentPass1', 4);
        const historyHash = bcrypt.hashSync('OldPass123', 4);
        mockTx.$queryRaw.mockResolvedValue([{ password: currentHash }]);
        mockTx.passwordHistory.findMany.mockResolvedValue([{ password: historyHash }]);

        await expect(
            authService.changeUserPassword(1, 'CurrentPass1', 'OldPass123')
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    /**
     * A missing user row under the lock must fail with 401.
     */
    test('rejects a missing user with 401', async () => {
        mockTx.$queryRaw.mockResolvedValue([]);

        await expect(
            authService.changeUserPassword(999, 'CurrentPass1', 'BrandNewPass2')
        ).rejects.toMatchObject({ statusCode: 401 });
    });
});
