/**
 * Constants for the persistent authentication audit trail.
 *
 * These values are the single source of truth for event naming and the strict
 * metadata allowlist. The audit service validates every recorded event against
 * these sets and silently discards unsupported metadata keys or values.
 */

/**
 * Supported authentication audit event types.
 *
 * @constant
 * @type {Readonly<Record<string, string>>}
 */
export const AUTH_AUDIT_EVENT_TYPES = Object.freeze({
    REGISTRATION: 'REGISTRATION',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    TOKEN_REFRESH: 'TOKEN_REFRESH',
    AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
    REPEATED_AUTH_FAILURES: 'REPEATED_AUTH_FAILURES',
});

/**
 * Supported authentication audit outcomes.
 *
 * @constant
 * @type {Readonly<Record<string, string>>}
 */
export const AUTH_AUDIT_OUTCOMES = Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    REQUESTED: 'REQUESTED',
    DENIED: 'DENIED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
});

/**
 * Supported metadata `reason` values.
 *
 * @constant
 * @type {Readonly<Record<string, string>>}
 */
export const AUTH_AUDIT_REASONS = Object.freeze({
    DUPLICATE_ACCOUNT: 'DUPLICATE_ACCOUNT',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
    INVALID_RESET_CODE: 'INVALID_RESET_CODE',
    INVALID_CURRENT_PASSWORD: 'INVALID_CURRENT_PASSWORD',
    PASSWORD_REUSE: 'PASSWORD_REUSE',
    INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
    REPEATED_FAILURES: 'REPEATED_FAILURES',
});

/**
 * Metadata keys permitted on an audit event.
 *
 * The service ignores any other key, so arbitrary request bodies or error
 * objects can never be persisted through this channel.
 *
 * @constant
 * @type {Readonly<Record<string, true>>}
 */
export const AUTH_AUDIT_METADATA_KEYS = Object.freeze({
    reason: true,
    attemptCount: true,
});
