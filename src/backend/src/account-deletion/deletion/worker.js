import crypto from 'crypto';
import logger from '../../configurations/logger.config.js';
import prisma from '../../configurations/prisma.connect.js';
import { getStorageAdapter } from '../../configurations/storage.config.js';
import { DEFAULT_LEASE_TTL_MS, DEFAULT_WORKER_INTERVAL_MS } from '../../constants/deletion.constants.js';
import { createDefaultDeletionPolicy } from '../policies/policy.js';
import { buildDeletionCoordinator, captureDeletionContext, recordFailure } from './service.js';

/**
 * Build the eligibility predicate for a due deletion request.
 *
 * A voluntary request becomes due at its recovery deadline; a request already
 * in progress becomes due again when its lease has expired and any retry
 * backoff has elapsed.
 *
 * @param {Date} now The current instant.
 * @returns {object} A Prisma `where` clause.
 */
const buildDueWhere = (now) => ({
    OR: [
        { status: 'PENDING_DELETION', scheduledFor: { lte: now } },
        {
            status: 'DELETION_IN_PROGRESS',
            leaseExpiresAt: { lt: now },
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        },
    ],
});

/**
 * Atomically claim due deletion requests with a worker lease.
 *
 * Only requests whose state still matches the due predicate at update time are
 * claimed, so concurrent workers cannot both take the same job.
 *
 * @param {{now?: Date, limit?: number, leaseTtlMs?: number}} [options] Sweep options.
 * @returns {Promise<Array<{id: string}>>} The claimed request ids.
 */
export const claimDueDeletionRequests = async ({ now = new Date(), limit = 10, leaseTtlMs = DEFAULT_LEASE_TTL_MS } = {}) => {
    const leaseOwner = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + leaseTtlMs);

    const candidates = await prisma.accountDeletionRequest.findMany({
        where: buildDueWhere(now),
        orderBy: { createdAt: 'asc' },
        take: limit,
    });

    const claimed = [];
    for (const candidate of candidates) {
        const context = candidate.context ?? (await captureDeletionContext(candidate.userId));
        const result = await prisma.accountDeletionRequest.updateMany({
            where: { id: candidate.id, ...buildDueWhere(now) },
            data: { status: 'DELETION_IN_PROGRESS', leaseOwner, leaseExpiresAt, context },
        });
        if (result.count === 1) {
            claimed.push({ id: candidate.id });
        }
    }
    return claimed;
};

/**
 * Claim and process all due deletion requests once.
 *
 * @param {{now?: Date, limit?: number, leaseTtlMs?: number}} [options] Sweep options.
 * @returns {Promise<Array<{requestId: string, status: string}>>} Per-request outcomes.
 */
export const processDueDeletionRequests = async ({ now = new Date(), limit = 10, leaseTtlMs = DEFAULT_LEASE_TTL_MS } = {}) => {
    const claimed = await claimDueDeletionRequests({ now, limit, leaseTtlMs });
    const coordinator = buildDeletionCoordinator({
        prisma,
        storageAdapter: getStorageAdapter(),
        policy: createDefaultDeletionPolicy(),
    });

    const results = [];
    for (const { id } of claimed) {
        try {
            const status = await coordinator.execute(id);
            results.push({ requestId: id, status: status?.status ?? 'COMPLETED' });
        } catch (error) {
            logger.warn('Deletion worker step failed', { requestId: id, error: error.message });
            const failure = await recordFailure({ requestId: id, error });
            results.push({ requestId: id, status: failure.status });
        }
    }
    return results;
};

/**
 * Start a process-local polling loop for durable deletion work.
 *
 * The interval is only a trigger; all durable state, leasing, and progress live
 * in PostgreSQL, so a crash between ticks resumes safely on restart.
 *
 * @param {{intervalMs?: number, limit?: number, leaseTtlMs?: number}} [options] Worker options.
 * @returns {object} The interval handle.
 */
export const startDeletionWorker = ({ intervalMs = DEFAULT_WORKER_INTERVAL_MS, limit = 10, leaseTtlMs = DEFAULT_LEASE_TTL_MS } = {}) => {
    const timer = setInterval(async () => {
        try {
            await processDueDeletionRequests({ limit, leaseTtlMs });
        } catch (error) {
            logger.error('Deletion worker sweep failed', { error: error.message });
        }
    }, intervalMs);
    timer.unref?.();
    return timer;
};
