import AppError from '../utils/appError.js';
import prisma from '../configurations/prisma.connect.js';
import logger from '../configurations/logger.config.js';
import {
    AUTH_AUDIT_EVENT_TYPES,
    AUTH_AUDIT_METADATA_KEYS,
    AUTH_AUDIT_OUTCOMES,
    AUTH_AUDIT_REASONS,
} from '../constants/auth-audit.constants.js';

const EVENT_TYPE_VALUES = new Set(Object.values(AUTH_AUDIT_EVENT_TYPES));
const OUTCOME_VALUES = new Set(Object.values(AUTH_AUDIT_OUTCOMES));
const REASON_VALUES = new Set(Object.values(AUTH_AUDIT_REASONS));

/**
 * Reduce a caller-supplied metadata object to the strict allowlist.
 *
 * Only the `reason` (a known reason value) and `attemptCount` (a non-negative
 * integer) keys are retained. Everything else — including arbitrary request
 * bodies, error objects, or token material — is discarded before persistence.
 *
 * @param {object|undefined|null} metadata The caller-supplied metadata.
 * @returns {object} The sanitized metadata object.
 */
const sanitizeMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    const sanitized = {};

    if (AUTH_AUDIT_METADATA_KEYS.reason && typeof metadata.reason === 'string' && REASON_VALUES.has(metadata.reason)) {
        sanitized.reason = metadata.reason;
    }

    if (
        AUTH_AUDIT_METADATA_KEYS.attemptCount
        && Number.isInteger(metadata.attemptCount)
        && metadata.attemptCount >= 0
    ) {
        sanitized.attemptCount = metadata.attemptCount;
    }

    return sanitized;
};

/**
 * Persist one structured authentication audit event.
 *
 * Event type and outcome are validated against the fixed enums; unknown
 * metadata keys and values are discarded. On persistence failure the error is
 * always logged with its correlation id. By default the failure is swallowed so
 * a degraded audit store never changes authentication behavior or leaks account
 * existence through timing. When `critical` is true the failure is rethrown as
 * a 500 so security-critical operations fail closed (typically inside the same
 * transaction as the security mutation).
 *
 * @param {object} event The event to record.
 * @param {string} event.eventType One of {@link AUTH_AUDIT_EVENT_TYPES}.
 * @param {string} event.outcome One of {@link AUTH_AUDIT_OUTCOMES}.
 * @param {number|null} [event.userId=null] The resolved user id, if any.
 * @param {string|null} [event.ipAddress=null] The client IP address.
 * @param {string|null} [event.correlationId=null] The request correlation id.
 * @param {object} [event.metadata={}] Allowlisted metadata.
 * @param {object} [options] Persistence options.
 * @param {object} [options.tx=prisma] The Prisma client or transaction client.
 * @param {boolean} [options.critical=false] Whether a failed write must throw.
 * @returns {Promise<object|null>} The created record, or null when a
 *   non-critical write fails.
 * @throws {AppError} When the event is invalid and `critical` is true, or when
 *   persistence fails and `critical` is true.
 */
export const recordAuthAuditEvent = async (event, {tx = prisma, critical = false} = {}) => {
    const eventType = event?.eventType;
    const outcome = event?.outcome;

    if (!EVENT_TYPE_VALUES.has(eventType)) {
        logger.error('Auth audit rejected: unsupported event type', {eventType});
        if (critical) {
            throw new AppError('Unsupported audit event type', 500);
        }
        return null;
    }

    if (!OUTCOME_VALUES.has(outcome)) {
        logger.error('Auth audit rejected: unsupported outcome', {eventType, outcome});
        if (critical) {
            throw new AppError('Unsupported audit outcome', 500);
        }
        return null;
    }

    const data = {
        eventType,
        outcome,
        userId: Number.isInteger(event.userId) ? event.userId : null,
        ipAddress: typeof event.ipAddress === 'string' ? event.ipAddress : null,
        correlationId: typeof event.correlationId === 'string' ? event.correlationId : null,
        metadata: sanitizeMetadata(event.metadata),
    };

    try {
        const record = await tx.authAuditEvent.create({data});
        logger.info('Authentication audit event recorded', {
            eventType,
            outcome,
            userId: data.userId,
            correlationId: data.correlationId,
            metadata: data.metadata,
        });
        return record;
    } catch (error) {
        logger.error('Authentication audit persistence failed', {
            eventType,
            outcome,
            userId: data.userId,
            correlationId: data.correlationId,
            error: error.message,
        });
        if (critical) {
            throw new AppError('Audit persistence unavailable', 500);
        }
        return null;
    }
};

/**
 * Determine whether a matching audit event exists since a point in time.
 *
 * This is the durable dedup guard for repeated-failure detection; it relies on
 * PostgreSQL rather than unbounded in-memory state.
 *
 * @param {object} params Query parameters.
 * @param {number} params.userId The owning user id.
 * @param {string} params.eventType The event type to look for.
 * @param {Date} params.since The earliest `createdAt` to consider.
 * @returns {Promise<boolean>} True when a matching event exists.
 */
export const hasRecentEvent = async ({userId, eventType, since}) => {
    const record = await prisma.authAuditEvent.findFirst({
        where: {
            userId,
            eventType,
            createdAt: {gte: since},
        },
        select: {id: true},
    });
    return Boolean(record);
};

/**
 * Default export shaped as the small `authAudit` service facade.
 */
const authAudit = {
    record: recordAuthAuditEvent,
    hasRecentEvent,
};

export default authAudit;
