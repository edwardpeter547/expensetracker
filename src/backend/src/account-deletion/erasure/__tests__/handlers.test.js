import { describe, expect, jest, test } from '@jest/globals';
import {
    AuthenticationErasureHandler,
    AvatarErasureHandler,
    BudgetErasureHandler,
    CategoryErasureHandler,
    LoginAttemptErasureHandler,
    NotificationErasureHandler,
    ProfileErasureHandler,
    TransactionErasureHandler,
} from '../handlers.js';

const makePrisma = () => ({
    transaction: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    budget: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    category: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    notification: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    loginAttempt: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    refreshToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    verificationToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    passwordResetToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    passwordHistory: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    user: { deleteMany: jest.fn(async () => ({ count: 1 })) },
});

describe('concrete erasure handlers', () => {
    /**
     * Each database handler deletes only the owning user's rows.
     */
    test('delete the owning user rows by model', async () => {
        const prisma = makePrisma();

        await new TransactionErasureHandler({ prisma }).erase({ userId: 7 });
        await new BudgetErasureHandler({ prisma }).erase({ userId: 7 });
        await new CategoryErasureHandler({ prisma }).erase({ userId: 7 });
        await new NotificationErasureHandler({ prisma }).erase({ userId: 7 });
        await new LoginAttemptErasureHandler({ prisma }).erase({ userId: 7 });
        await new ProfileErasureHandler({ prisma }).erase({ userId: 7 });

        expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.budget.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.category.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    /**
     * The authentication handler erases all credential artifacts.
     */
    test('erases authentication artifacts', async () => {
        const prisma = makePrisma();

        await new AuthenticationErasureHandler({ prisma }).erase({ userId: 7 });

        expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(prisma.passwordHistory.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
    });

    /**
     * The avatar handler deletes through the storage adapter, tolerates missing
     * objects, and does nothing when there is no key or adapter.
     */
    test('erases the avatar object through the storage adapter', async () => {
        const storageAdapter = { delete: jest.fn(async () => {}) };
        const handler = new AvatarErasureHandler({ storageAdapter });

        await handler.erase({ avatarKey: 'avatars/7/x.webp' });
        expect(storageAdapter.delete).toHaveBeenCalledWith('avatars/7/x.webp');

        storageAdapter.delete.mockRejectedValue(Object.assign(new Error('missing'), { code: 'NOT_FOUND', statusCode: 404 }));
        await expect(handler.erase({ avatarKey: 'avatars/7/x.webp' })).resolves.toBeUndefined();

        storageAdapter.delete.mockClear();
        await handler.erase({ avatarKey: null });
        expect(storageAdapter.delete).not.toHaveBeenCalled();

        await new AvatarErasureHandler({ storageAdapter: null }).erase({ avatarKey: 'avatars/7/x.webp' });
    });
});
