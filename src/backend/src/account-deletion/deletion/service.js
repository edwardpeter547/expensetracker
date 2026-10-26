import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import logger from '../../configurations/logger.config.js';
import prisma from '../../configurations/prisma.connect.js';
import { getStorageAdapter } from '../../configurations/storage.config.js';
import { USER_ACTIONS } from '../../constants/audit.actions.js';
import { getUser } from '../../services/auth.service.js';
import { getUserProfileDto } from '../../services/profile.service.js';
import AppError from '../../utils/appError.js';
import { DEFAULT_POLICY_VERSION, DELETE_CONFIRMATION_TEXT, VOLUNTARY_RECOVERY_DAYS } from '../../constants/deletion.constants.js';
import { DeletionCoordinator } from './coordinator.js';
import { createDefaultDeletionPolicy } from '../policies/policy.js';
import { ErasureRegistry } from '../erasure/registry.js';
import {
    AuthenticationErasureHandler,
    AvatarErasureHandler,
    BudgetErasureHandler,
    CategoryErasureHandler,
    LoginAttemptErasureHandler,
    NotificationErasureHandler,
    ProfileErasureHandler,
    TransactionErasureHandler,
} from '../erasure/handlers.js';

export { DEFAULT_POLICY_VERSION, DELETE_CONFIRMATION_TEXT, VOLUNTARY_RECOVERY_DAYS } from '../../constants/deletion.constants.js';

/**
 * Add a number of calendar days to a date (14 days == 14 * 24 hours).
 *
 * @param {Date} date The starting instant.
 * @param {number} days The number of days to add.
 * @returns {Date} The resulting instant.
 */
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Assemble the concrete erasure handlers into a registry.
 *
 * @param {{prisma: object, storageAdapter: object|null}} deps Dependencies.
 * @returns {ErasureRegistry} The configured registry.
 */
export const createDeletionRegistry = ({ prisma, storageAdapter }) => {
    return new ErasureRegistry([
        new TransactionErasureHandler({ prisma }),
        new BudgetErasureHandler({ prisma }),
        new CategoryErasureHandler({ prisma }),
        new NotificationErasureHandler({ prisma }),
        new LoginAttemptErasureHandler({ prisma }),
        new AuthenticationErasureHandler({ prisma }),
        new AvatarErasureHandler({ storageAdapter }),
        new ProfileErasureHandler({ prisma }),
    ]);
};

/**
 * Build the durable progress repository used by the coordinator.
 *
 * @param {{prisma: object}} deps The Prisma client.
 * @returns {object} The progress repository.
 */
export const createProgressRepository = ({ prisma }) => ({
    /**
     * Load the minimal deletion context from the surviving request record.
     *
     * @param {string} requestId The request id.
     * @returns {Promise<object>} The deletion context.
     */
    async loadContext(requestId) {
        const request = await prisma.accountDeletionRequest.findUnique({ where: { id: requestId } });
        if (!request) {
            throw new AppError('Deletion request not found', StatusCodes.NOT_FOUND);
        }
        return {
            userId: request.context?.userId ?? request.userId,
            avatarKey: request.context?.avatarKey ?? null,
            requestType: request.requestType,
            scope: request.scope,
        };
    },

    /**
     * Fetch or create the progress step for a category.
     *
     * @param {string} requestId The request id.
     * @param {string} category The handler name.
     * @returns {Promise<object>} The step record.
     */
    async getOrCreateStep(requestId, category) {
        return prisma.deletionStep.upsert({
            where: { requestId_category: { requestId, category } },
            update: {},
            create: { requestId, category, status: 'PENDING' },
        });
    },

    /**
     * Mark a category step completed.
     *
     * @param {string} requestId The request id.
     * @param {string} category The handler name.
     * @returns {Promise<void>}
     */
    async markCompleted(requestId, category) {
        await prisma.deletionStep.update({
            where: { requestId_category: { requestId, category } },
            data: { status: 'COMPLETED', completedAt: new Date(), attemptCount: { increment: 1 } },
        });
    },

    /**
     * Mark a category step as requiring human review.
     *
     * @param {string} requestId The request id.
     * @param {string} category The handler name.
     * @returns {Promise<void>}
     */
    async markReviewRequired(requestId, category) {
        await prisma.deletionStep.update({
            where: { requestId_category: { requestId, category } },
            data: { status: 'REVIEW_REQUIRED' },
        });
    },

    /**
     * Record an approved retention decision for a category.
     *
     * @param {string} requestId The request id.
     * @param {string} category The handler name.
     * @param {{reason?: string, reviewer?: string, reviewDue?: Date}} decision Retention details.
     * @returns {Promise<void>}
     */
    async recordRetained(requestId, category, decision) {
        await prisma.deletionStep.update({
            where: { requestId_category: { requestId, category } },
            data: {
                status: 'RETAINED',
                retentionReason: decision.reason ?? null,
                retentionReviewedBy: decision.reviewer ?? null,
                retentionReviewedAt: new Date(),
                retentionReviewDue: decision.reviewDue ?? null,
            },
        });
    },

    /**
     * Record a per-step failure message without changing step status.
     *
     * @param {string} requestId The request id.
     * @param {string} category The handler name.
     * @param {string} message The failure message.
     * @returns {Promise<void>}
     */
    async recordStepError(requestId, category, message) {
        await prisma.deletionStep.update({
            where: { requestId_category: { requestId, category } },
            data: { lastError: message, attemptCount: { increment: 1 } },
        }).catch(() => {});
    },

    /**
     * Finalize the request when every step is resolved or review is required.
     *
     * @param {string} requestId The request id.
     * @returns {Promise<{status: string}|null>} The resulting status.
     */
    async finalizeIfComplete(requestId) {
        const request = await prisma.accountDeletionRequest.findUnique({
            where: { id: requestId },
            include: { steps: { select: { status: true } } },
        });
        if (!request) return null;

        const statuses = request.steps.map((step) => step.status);
        const hasReview = statuses.includes('REVIEW_REQUIRED');
        const allResolved = statuses.length > 0 && statuses.every((s) => s === 'COMPLETED' || s === 'RETAINED');

        if (hasReview) {
            await prisma.accountDeletionRequest.update({
                where: { id: requestId },
                data: { status: 'REVIEW_REQUIRED', leaseOwner: null, leaseExpiresAt: null },
            });
            return { status: 'REVIEW_REQUIRED' };
        }

        if (allResolved) {
            await prisma.accountDeletionRequest.update({
                where: { id: requestId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    leaseOwner: null,
                    leaseExpiresAt: null,
                    nextRetryAt: null,
                },
            });
            return { status: 'COMPLETED' };
        }

        return { status: request.status };
    },

    /**
     * Fetch the request with its step summary.
     *
     * @param {string} requestId The request id.
     * @returns {Promise<object|null>} The request status.
     */
    async getStatus(requestId) {
        return prisma.accountDeletionRequest.findUnique({
            where: { id: requestId },
            include: { steps: { select: { category: true, status: true, retentionReason: true } } },
        });
    },
});

/**
 * Build a ready-to-run deletion coordinator.
 *
 * @param {{prisma: object, storageAdapter?: object|null, policy?: object}} [deps]
 *   Dependencies; the active storage adapter and default policy are resolved
 *   when omitted.
 * @returns {DeletionCoordinator} The coordinator.
 */
export const buildDeletionCoordinator = ({ prisma, storageAdapter, policy } = {}) => {
    const registry = createDeletionRegistry({
        prisma,
        storageAdapter: storageAdapter === undefined ? getStorageAdapter() : storageAdapter,
    });
    return new DeletionCoordinator({
        registry,
        policy: policy ?? createDefaultDeletionPolicy(),
        progressRepository: createProgressRepository({ prisma }),
    });
};

/**
 * Capture the minimal deletion context for a user at claim time.
 *
 * @param {number} userId The user id.
 * @returns {Promise<{userId: number, avatarKey: string|null}>} The context.
 */
export const captureDeletionContext = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    return { userId, avatarKey: user?.avatar ?? null };
};

/**
 * Accept a verified voluntary closure request.
 *
 * Deactivates the account, revokes all refresh sessions, invalidates access
 * tokens via `tokenVersion`, and schedules durable erasure 14 calendar days
 * later.
 *
 * @param {{userId: number, password: string, now?: Date}} params Request inputs.
 * @returns {Promise<{requestId: string, recoveryDeadline: Date}>} The request.
 */
export const requestVoluntaryDeletion = async ({ userId, password, now = new Date() }) => {
    const user = await getUser({ id: userId });
    if (!user || !user.isActive) {
        throw new AppError('User not found or account deactivated', StatusCodes.NOT_FOUND);
    }
    if (!(await bcrypt.compare(password, user.password))) {
        throw new AppError('Current password is incorrect', StatusCodes.UNAUTHORIZED);
    }

    const existing = await prisma.accountDeletionRequest.findFirst({
        where: { userId, status: { in: ['PENDING_DELETION', 'DELETION_IN_PROGRESS'] } },
        select: { id: true },
    });
    if (existing) {
        throw new AppError('A deletion request is already in progress', StatusCodes.CONFLICT);
    }

    const recoveryDeadline = addDays(now, VOLUNTARY_RECOVERY_DAYS);
    const request = await prisma.$transaction(async (tx) => {
        let created;
        try {
            created = await tx.accountDeletionRequest.create({
                data: {
                    userId,
                    requestType: 'VOLUNTARY',
                    scope: 'ALL',
                    status: 'PENDING_DELETION',
                    acceptedAt: now,
                    recoveryDeadline,
                    scheduledFor: recoveryDeadline,
                    policyVersion: DEFAULT_POLICY_VERSION,
                },
            });
        } catch (error) {
            if (error?.code === 'P2002') {
                throw new AppError('A deletion request is already in progress', StatusCodes.CONFLICT);
            }
            throw error;
        }
        await tx.user.update({
            where: { id: userId },
            data: { isActive: false, tokenVersion: { increment: 1 } },
        });
        await tx.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
        return created;
    });

    logger.info('Account deletion requested', {
        userId,
        requestId: request.id,
        action: USER_ACTIONS.USER_DELETION_REQUESTED,
    });
    return { requestId: request.id, recoveryDeadline };
};

/**
 * Cancel an eligible voluntary closure after reauthentication.
 *
 * Cancellation is atomic with the worker's claim transition: it only succeeds
 * while the request is still `PENDING_DELETION`.
 *
 * @param {{email: string, password: string, now?: Date}} params Reauth inputs.
 * @returns {Promise<{requestId: string}>} The cancelled request id.
 */
export const cancelDeletion = async ({ email, password, now = new Date() }) => {
    const user = await getUser({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED);
    }

    const request = await prisma.accountDeletionRequest.findFirst({
        where: { userId: user.id, status: 'PENDING_DELETION', recoveryDeadline: { gt: now } },
        select: { id: true },
    });
    if (!request) {
        throw new AppError('No eligible deletion request to cancel', StatusCodes.CONFLICT);
    }

    const cancelled = await prisma.accountDeletionRequest.updateMany({
        where: { id: request.id, status: 'PENDING_DELETION' },
        data: { status: 'CANCELLED' },
    });
    if (cancelled.count !== 1) {
        throw new AppError('Deletion can no longer be cancelled', StatusCodes.CONFLICT);
    }

    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    logger.info('Account deletion cancelled', {
        userId: user.id,
        requestId: request.id,
        action: USER_ACTIONS.USER_DELETION_CANCELLED,
    });
    return { requestId: request.id };
};

/**
 * Record a statutory erasure request through an authorized channel.
 *
 * Statutory requests are scheduled immediately (no recovery delay). A scope
 * other than `ALL` requires human review because scope assessment is a legal
 * decision this code does not automate.
 *
 * @param {{userId: number, scope?: string, now?: Date}} params Request inputs.
 * @returns {Promise<{requestId: string, status: string}>} The request.
 */
export const createStatutoryErasureRequest = async ({ userId, scope = 'ALL', now = new Date() }) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
        throw new AppError('User not found', StatusCodes.NOT_FOUND);
    }

    const requiresReview = scope !== 'ALL';
    const request = await prisma.accountDeletionRequest.create({
        data: {
            userId,
            requestType: 'STATUTORY',
            scope,
            status: requiresReview ? 'REVIEW_REQUIRED' : 'PENDING_DELETION',
            acceptedAt: now,
            scheduledFor: now,
            policyVersion: DEFAULT_POLICY_VERSION,
        },
    });
    return { requestId: request.id, status: request.status };
};

/**
 * Record a human retention decision for a category.
 *
 * @param {object} params Decision inputs.
 * @param {string} params.requestId The request id.
 * @param {string} params.category The category name.
 * @param {string} params.action Either `RETAIN` or `REVIEW`.
 * @param {string|null} [params.reason] Retention justification.
 * @param {string|null} [params.reviewer] Authorized reviewer.
 * @param {Date|null} [params.reviewDue] Review expiry date.
 * @returns {Promise<object>} The updated step.
 */
export const recordRetentionDecision = async ({ requestId, category, action, reason = null, reviewer = null, reviewDue = null }) => {
    if (!['RETAIN', 'REVIEW'].includes(action)) {
        throw new AppError('Invalid retention decision', StatusCodes.BAD_REQUEST);
    }

    const step = await prisma.deletionStep.findUnique({
        where: { requestId_category: { requestId, category } },
    });
    if (!step) {
        throw new AppError('Deletion step not found', StatusCodes.NOT_FOUND);
    }

    const data = action === 'RETAIN'
        ? {
            status: 'RETAINED',
            retentionReason: reason,
            retentionReviewedBy: reviewer,
            retentionReviewedAt: new Date(),
            retentionReviewDue: reviewDue,
        }
        : {
            status: 'REVIEW_REQUIRED',
            retentionReviewDue: reviewDue ?? null,
        };

    await prisma.deletionStep.update({
        where: { requestId_category: { requestId, category } },
        data,
    });
    if (action === 'REVIEW') {
        await prisma.accountDeletionRequest.update({
            where: { id: requestId },
            data: { status: 'REVIEW_REQUIRED' },
        });
    }
    return prisma.deletionStep.findUnique({ where: { requestId_category: { requestId, category } } });
};

/**
 * Retrieve the latest deletion request status for a user.
 *
 * @param {{userId: number}} params The user id.
 * @returns {Promise<object|null>} A status summary, or null.
 */
export const getDeletionStatus = async ({ userId }) => {
    const request = await prisma.accountDeletionRequest.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { steps: { select: { category: true, status: true, retentionReason: true } } },
    });
    if (!request) return null;

    return {
        requestId: request.id,
        requestType: request.requestType,
        scope: request.scope,
        status: request.status,
        acceptedAt: request.acceptedAt,
        recoveryDeadline: request.recoveryDeadline,
        completedAt: request.completedAt,
        steps: request.steps,
    };
};

/**
 * Collect a user's data for a versioned, secret-free export.
 *
 * @param {{userId: number}} params The user id.
 * @returns {Promise<object>} The export document.
 */
export const exportUserData = async ({ userId }) => {
    const [profile, transactions, budgets, categories] = await Promise.all([
        getUserProfileDto(userId),
        prisma.transaction.findMany({ where: { userId }, orderBy: { transactionDate: 'asc' } }),
        prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    ]);

    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        profile,
        categories,
        budgets,
        transactions,
    };
};

/**
 * Record a durable failure and schedule a bounded retry.
 *
 * @param {object} params Failure inputs.
 * @param {string} params.requestId The request id.
 * @param {Error} params.error The error that failed the sweep.
 * @param {Date} [params.now] The current instant.
 * @param {number} [params.maxRetries] Maximum attempts before failing.
 * @param {number} [params.baseBackoffMs] Initial backoff.
 * @param {number} [params.maxBackoffMs] Backoff cap.
 * @returns {Promise<{status: string, failureCount: number}>} The new state.
 */
export const recordFailure = async ({ requestId, error, now = new Date(), maxRetries = 5, baseBackoffMs = 1000, maxBackoffMs = 300000 }) => {
    const request = await prisma.accountDeletionRequest.findUnique({
        where: { id: requestId },
        select: { failureCount: true },
    });
    const failureCount = (request?.failureCount ?? 0) + 1;
    const shouldFail = failureCount >= maxRetries;
    const backoffMs = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, Math.min(failureCount - 1, 10)));

    await prisma.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
            failureCount,
            lastError: error?.message ?? String(error),
            nextRetryAt: shouldFail ? null : new Date(now.getTime() + backoffMs),
            leaseOwner: null,
            leaseExpiresAt: null,
            status: shouldFail ? 'FAILED' : 'DELETION_IN_PROGRESS',
        },
    });
    return { status: shouldFail ? 'FAILED' : 'DELETION_IN_PROGRESS', failureCount };
};
