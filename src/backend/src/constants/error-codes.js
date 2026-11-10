/**
 * Stable, machine-readable API error-code registry.
 *
 * This module is the single source of truth for the identifiers emitted in
 * the additive error envelope (`{ success, status, code, message, params,
 * errors }`). Codes are UPPER_SNAKE_CASE, language-independent, and additive
 * only: an existing value must never be renamed or reused for a different
 * meaning. The mobile client mirrors the identifiers in
 * `src/mobile/src/localization/error-codes.ts`; a contract test keeps the two
 * catalogues aligned.
 */

/**
 * Stable error-code identifiers grouped by domain.
 *
 * The object maps a symbolic name to its wire value. Keeping them identical
 * (name === value) makes the wire value self-describing while still allowing
 * the names to be used as safe import-time references.
 */
export const ERROR_CODES = Object.freeze({
    // Transport and generic fallbacks.
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',

    // Field-level validation codes mapped from Joi detail types.
    VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
    VALIDATION_EMPTY: 'VALIDATION_EMPTY',
    VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',
    VALIDATION_INVALID_VALUE: 'VALIDATION_INVALID_VALUE',
    VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    VALIDATION_TOO_SHORT: 'VALIDATION_TOO_SHORT',
    VALIDATION_TOO_LONG: 'VALIDATION_TOO_LONG',
    VALIDATION_TOO_SMALL: 'VALIDATION_TOO_SMALL',
    VALIDATION_TOO_LARGE: 'VALIDATION_TOO_LARGE',
    VALIDATION_NOT_ALLOWED: 'VALIDATION_NOT_ALLOWED',

    // Authentication, tokens, and sessions.
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_ACCOUNT_DEACTIVATED: 'AUTH_ACCOUNT_DEACTIVATED',
    AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
    REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    VERIFICATION_TOKEN_INVALID: 'VERIFICATION_TOKEN_INVALID',
    VERIFICATION_TOKEN_EXPIRED: 'VERIFICATION_TOKEN_EXPIRED',
    RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
    RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
    PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',
    PASSWORD_SAME_AS_CURRENT: 'PASSWORD_SAME_AS_CURRENT',
    PASSWORD_PREVIOUSLY_USED: 'PASSWORD_PREVIOUSLY_USED',

    // Financial domain resources.
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
    BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
    CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
    BUDGET_ALREADY_EXISTS: 'BUDGET_ALREADY_EXISTS',
    CATEGORY_ALREADY_EXISTS: 'CATEGORY_ALREADY_EXISTS',
    CATEGORY_IN_USE: 'CATEGORY_IN_USE',
    BUDGET_LIMIT_EXCEEDED: 'BUDGET_LIMIT_EXCEEDED',
    INVALID_DATE: 'INVALID_DATE',

    // Avatar / file handling.
    AVATAR_REQUIRED: 'AVATAR_REQUIRED',
    AVATAR_INVALID: 'AVATAR_INVALID',
    AVATAR_TOO_LARGE: 'AVATAR_TOO_LARGE',
    AVATAR_STORAGE_UNAVAILABLE: 'AVATAR_STORAGE_UNAVAILABLE',

    // Account deletion.
    DELETION_REQUEST_NOT_FOUND: 'DELETION_REQUEST_NOT_FOUND',
    DELETION_ALREADY_IN_PROGRESS: 'DELETION_ALREADY_IN_PROGRESS',
    DELETION_NOT_CANCELLABLE: 'DELETION_NOT_CANCELLABLE',
});

/**
 * Resolve the stable code used when a thrown error carries no explicit code.
 *
 * The fallback is deliberately generic (derived from the HTTP status) so the
 * envelope always has a machine-readable `code` while remaining backwards
 * compatible with the existing uncoded `AppError` throw sites. Issue #205
 * migrates those sites to their precise domain codes.
 *
 * @param {number|string|undefined} status The HTTP status code.
 * @returns {string} A stable error-code identifier.
 */
export const defaultErrorCodeForStatus = (status) => {
    const code = Number(status);

    if (code === 400) return ERROR_CODES.BAD_REQUEST;
    if (code === 401) return ERROR_CODES.UNAUTHORIZED;
    if (code === 403) return ERROR_CODES.FORBIDDEN;
    if (code === 404) return ERROR_CODES.NOT_FOUND;
    if (code === 409) return ERROR_CODES.CONFLICT;
    if (code === 413) return ERROR_CODES.PAYLOAD_TOO_LARGE;
    if (code === 415) return ERROR_CODES.UNSUPPORTED_MEDIA_TYPE;
    if (code === 429) return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    if (code === 503) return ERROR_CODES.SERVICE_UNAVAILABLE;
    if (Number.isFinite(code) && code >= 500) return ERROR_CODES.INTERNAL_SERVER_ERROR;

    return ERROR_CODES.UNKNOWN_ERROR;
};

/**
 * Report whether a value is one of the registered stable error codes.
 *
 * @param {*} value The candidate error code.
 * @returns {boolean} True when the value is a registered error code.
 */
export const isKnownErrorCode = (value) => {
    return typeof value === 'string' && Object.values(ERROR_CODES).includes(value);
};
