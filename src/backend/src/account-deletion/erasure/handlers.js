import { ErasureHandler } from './handler.js';

/**
 * Erase a user's financial transactions.
 */
export class TransactionErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'transactions' });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.transaction.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's budgets.
 */
export class BudgetErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'budgets' });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.budget.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's own categories.
 *
 * Depends on transactions and budgets being erased first because both hold
 * `RESTRICT` foreign keys to categories.
 */
export class CategoryErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'categories', dependencies: ['transactions', 'budgets'] });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.category.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's notifications.
 */
export class NotificationErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'notifications' });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.notification.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's login-attempt records.
 */
export class LoginAttemptErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'login-attempts' });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.loginAttempt.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's authentication artifacts: refresh tokens, verification
 * tokens, password-reset tokens, and password history.
 */
export class AuthenticationErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({ name: 'authentication' });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
        await this.prisma.verificationToken.deleteMany({ where: { userId } });
        await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
        await this.prisma.passwordHistory.deleteMany({ where: { userId } });
    }
}

/**
 * Erase a user's stored avatar object through the storage abstraction.
 *
 * The avatar key is captured in the deletion context at claim time, so this
 * handler never performs a user-key lookup. A missing object is tolerated.
 */
export class AvatarErasureHandler extends ErasureHandler {
    /**
     * @param {{storageAdapter: object|null}} deps The active storage adapter.
     */
    constructor({ storageAdapter }) {
        super({ name: 'avatar' });
        this.storageAdapter = storageAdapter;
    }

    /**
     * @param {{avatarKey?: string|null}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ avatarKey }) {
        if (!avatarKey || !this.storageAdapter) return;
        try {
            await this.storageAdapter.delete(avatarKey);
        } catch (error) {
            if (error?.code === 'NOT_FOUND' || error?.statusCode === 404) return;
            throw error;
        }
    }
}

/**
 * Erase the user profile row itself.
 *
 * Declares every other category as a dependency so the user row is always
 * deleted last.
 */
export class ProfileErasureHandler extends ErasureHandler {
    /**
     * @param {{prisma: object}} deps The Prisma client.
     */
    constructor({ prisma }) {
        super({
            name: 'profile',
            dependencies: [
                'transactions',
                'budgets',
                'categories',
                'notifications',
                'login-attempts',
                'authentication',
                'avatar',
            ],
        });
        this.prisma = prisma;
    }

    /**
     * @param {{userId: number}} context The deletion context.
     * @returns {Promise<void>}
     */
    async erase({ userId }) {
        await this.prisma.user.deleteMany({ where: { id: userId } });
    }
}
