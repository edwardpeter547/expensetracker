/**
 * Shared API error normalization and translation-key mapping for the mobile
 * client.
 *
 * This module converts Axios/network errors into a stable shape so screens can
 * distinguish timeouts, authorization failures, server errors, and transport
 * failures without inspecting Axios internals. It also maps the backend's
 * stable error codes to mobile translation keys, so user-facing errors can be
 * translated into the selected application language without exposing raw
 * backend technical prose.
 *
 * The translation-key catalogue below is the client-side mirror of
 * `src/backend/src/constants/error-codes.js`. It stores only key references,
 * not translated strings; the actual `errors` namespace resources arrive with
 * the `i18next` integration (#188). Until then `translateApiError` falls back
 * safely for every key.
 */

import { StatusCodes } from 'http-status-codes';

/**
 * Stable error categories used by callers.
 */
export type ApiErrorKind =
    | 'network'
    | 'timeout'
    | 'unauthorized'
    | 'forbidden'
    | 'validation'
    | 'server'
    | 'unknown';

/**
 * A safe, serialisable interpolation value.
 */
export type ErrorParam = string | number | boolean | null;

/**
 * A contract-shaped field-level validation error.
 */
export interface FieldError {
    field: string;
    code: string | null;
    message: string | null;
    params: Record<string, ErrorParam> | null;
    translationKey: string | null;
}

/**
 * A normalized API error.
 */
export interface NormalizedApiError {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    code?: string;
    params?: Record<string, ErrorParam> | null;
    fieldErrors?: FieldError[];
    translationKey?: string | null;
    serverMessage?: string;
    kindTranslationKey?: string;
    cause?: unknown;
}

/**
 * A translator compatible with the future `i18next` integration.
 *
 * The function returns the translated string for a key, or undefined when the
 * key is unavailable, so callers can apply the documented fallback chain.
 */
export type ErrorTranslator = (
    key: string,
    options?: Record<string, unknown> & { defaultValue?: string },
) => string | undefined;

/**
 * Stable API error code to translation-key mapping.
 *
 * Keys are one-per-line and alphabetically ordered so the backend contract
 * test can parse this file and assert both packages stay in sync.
 */
export const API_ERROR_TRANSLATION_KEYS = {
    'ACCOUNT_ALREADY_EXISTS': 'auth.accountAlreadyExists',
    'AUTH_ACCOUNT_DEACTIVATED': 'auth.accountDeactivated',
    'AUTH_EMAIL_NOT_VERIFIED': 'auth.emailNotVerified',
    'AUTH_INVALID_CREDENTIALS': 'auth.invalidCredentials',
    'AVATAR_INVALID': 'avatar.invalid',
    'AVATAR_REQUIRED': 'avatar.required',
    'AVATAR_STORAGE_UNAVAILABLE': 'avatar.storageUnavailable',
    'AVATAR_TOO_LARGE': 'avatar.tooLarge',
    'BAD_REQUEST': 'badRequest',
    'BUDGET_ALREADY_EXISTS': 'budget.alreadyExists',
    'BUDGET_LIMIT_EXCEEDED': 'budget.limitExceeded',
    'BUDGET_NOT_FOUND': 'budget.notFound',
    'CATEGORY_ALREADY_EXISTS': 'category.alreadyExists',
    'CATEGORY_IN_USE': 'category.inUse',
    'CATEGORY_NOT_FOUND': 'category.notFound',
    'CONFLICT': 'conflict',
    'DELETION_ALREADY_IN_PROGRESS': 'deletion.alreadyInProgress',
    'DELETION_INVALID_RETENTION': 'deletion.invalidRetention',
    'DELETION_NOT_CANCELLABLE': 'deletion.notCancellable',
    'DELETION_REQUEST_NOT_FOUND': 'deletion.notFound',
    'EMAIL_ALREADY_EXISTS': 'auth.emailAlreadyExists',
    'FORBIDDEN': 'forbidden',
    'INTERNAL_SERVER_ERROR': 'internalServerError',
    'INVALID_DATE': 'invalidDate',
    'NOT_FOUND': 'notFound',
    'PASSWORD_INCORRECT': 'auth.passwordIncorrect',
    'PASSWORD_PREVIOUSLY_USED': 'auth.passwordPreviouslyUsed',
    'PASSWORD_SAME_AS_CURRENT': 'auth.passwordSameAsCurrent',
    'PAYLOAD_TOO_LARGE': 'payloadTooLarge',
    'RATE_LIMIT_EXCEEDED': 'rateLimitExceeded',
    'REFRESH_TOKEN_EXPIRED': 'auth.refreshTokenExpired',
    'REFRESH_TOKEN_INVALID': 'auth.refreshTokenInvalid',
    'REFRESH_TOKEN_MISSING': 'auth.refreshTokenMissing',
    'RESET_TOKEN_EXPIRED': 'auth.resetTokenExpired',
    'RESET_TOKEN_INVALID': 'auth.resetTokenInvalid',
    'RESOURCE_NOT_FOUND': 'resource.notFound',
    'SERVICE_UNAVAILABLE': 'serviceUnavailable',
    'SESSION_NOT_FOUND': 'auth.sessionNotFound',
    'TOKEN_EXPIRED': 'auth.tokenExpired',
    'TOKEN_INVALID': 'auth.tokenInvalid',
    'TOKEN_MISSING': 'auth.tokenMissing',
    'TRANSACTION_NOT_FOUND': 'transaction.notFound',
    'UNAUTHORIZED': 'unauthorized',
    'UNIQUE_CONSTRAINT_VIOLATION': 'uniqueConstraintViolation',
    'UNKNOWN_ERROR': 'unknown',
    'UNSUPPORTED_MEDIA_TYPE': 'unsupportedMediaType',
    'USERNAME_ALREADY_EXISTS': 'auth.usernameAlreadyExists',
    'VALIDATION_EMPTY': 'validation.empty',
    'VALIDATION_ERROR': 'validationError',
    'VALIDATION_INVALID_FORMAT': 'validation.invalidFormat',
    'VALIDATION_INVALID_TYPE': 'validation.invalidType',
    'VALIDATION_INVALID_VALUE': 'validation.invalidValue',
    'VALIDATION_NOT_ALLOWED': 'validation.notAllowed',
    'VALIDATION_REQUIRED': 'validation.required',
    'VALIDATION_TOO_LARGE': 'validation.tooLarge',
    'VALIDATION_TOO_LONG': 'validation.tooLong',
    'VALIDATION_TOO_SHORT': 'validation.tooShort',
    'VALIDATION_TOO_SMALL': 'validation.tooSmall',
    'VERIFICATION_TOKEN_EXPIRED': 'auth.verificationTokenExpired',
    'VERIFICATION_TOKEN_INVALID': 'auth.verificationTokenInvalid',
} as const;

/**
 * The set of stable backend error codes the mobile client understands.
 */
export type ApiErrorCode = keyof typeof API_ERROR_TRANSLATION_KEYS;

/**
 * Every known code as a plain string list.
 */
export const KNOWN_API_ERROR_CODES: readonly string[] = Object.keys(API_ERROR_TRANSLATION_KEYS);

/**
 * The translation key used when no specific error key applies.
 */
const GENERIC_ERROR_KEY = 'generic';

/**
 * The hardcoded fallback text used before `i18next` resources exist.
 */
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Report whether a value is a known stable API error code.
 *
 * @param {string} value The candidate code.
 * @returns {boolean} True when the code exists in the catalogue.
 */
export const isKnownApiErrorCode = (value: string): value is ApiErrorCode => {
    return Object.prototype.hasOwnProperty.call(API_ERROR_TRANSLATION_KEYS, value);
};

/**
 * Resolve the mobile translation key for a backend error code.
 *
 * Unknown, missing, or non-string codes resolve to null so callers apply the
 * documented fallback instead of constructing a key from untrusted input.
 *
 * @param {string|null|undefined} code The backend error code.
 * @returns {string|null} The translation key, or null when unmapped.
 */
export const apiErrorTranslationKey = (code: string | null | undefined): string | null => {
    if (typeof code !== 'string' || !isKnownApiErrorCode(code)) return null;
    return (API_ERROR_TRANSLATION_KEYS as Record<string, string>)[code];
};

/**
 * Translation keys for client-generated error kinds that carry no server code.
 */
const API_ERROR_KIND_TRANSLATION_KEYS: Record<ApiErrorKind, string> = {
    network: 'network',
    timeout: 'timeout',
    unauthorized: 'sessionExpired',
    forbidden: 'forbidden',
    validation: 'validationError',
    server: 'internalServerError',
    unknown: 'generic',
};

/**
 * Resolve the translation key for a client-generated error kind.
 *
 * @param {ApiErrorKind} kind The normalized error kind.
 * @returns {string} The `errors`-namespace key for that kind.
 */
export const apiErrorKindTranslationKey = (kind: ApiErrorKind): string => {
    return API_ERROR_KIND_TRANSLATION_KEYS[kind];
};

/**
 * Best-effort extraction of a server-provided message from an error payload.
 *
 * @param {unknown} data The error response body.
 * @returns {string|undefined} A human-readable message, when present.
 */
const readServerMessage = (data: unknown): string | undefined => {
    if (data && typeof data === 'object' && 'message' in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    return undefined;
};

/**
 * Best-effort extraction of the stable server error code from a payload.
 *
 * @param {unknown} data The error response body.
 * @returns {string|undefined} The stable error code, when present.
 */
const readErrorCode = (data: unknown): string | undefined => {
    if (data && typeof data === 'object' && 'code' in data) {
        const code = (data as { code?: unknown }).code;
        if (typeof code === 'string' && code.trim()) return code;
    }
    return undefined;
};

/**
 * Report whether a value is a safe, serialisable interpolation primitive.
 *
 * @param {unknown} value The candidate value.
 * @returns {boolean} True when the value is a finite number, boolean, string,
 *   or null.
 */
const isSafeParam = (value: unknown): value is ErrorParam => {
    if (value === null) return true;
    if (typeof value === 'boolean') return true;
    if (typeof value === 'string') return true;
    return typeof value === 'number' && Number.isFinite(value);
};

/**
 * Reduce an arbitrary value to bounded, serialisable interpolation params.
 *
 * This mirrors the backend `sanitizeErrorParams` policy so client and server
 * never interpolate nested or unbounded values into user-facing text.
 *
 * @param {unknown} value The candidate params value.
 * @returns {Record<string, ErrorParam>|null} Safe params, or null.
 */
const sanitizeErrorParams = (value: unknown): Record<string, ErrorParam> | null => {
    if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const params: Record<string, ErrorParam> = {};
    let count = 0;

    for (const [key, entry] of Object.entries(value)) {
        if (count >= 20) break;
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) continue;
        if (!isSafeParam(entry)) continue;

        params[key] = typeof entry === 'string' && entry.length > 200
            ? entry.slice(0, 200)
            : entry;
        count += 1;
    }

    return Object.keys(params).length > 0 ? params : null;
};

/**
 * Normalize a server field-error array into the mobile field-error shape.
 *
 * @param {unknown} data The error response body.
 * @returns {FieldError[]|undefined} Normalized field errors, or undefined.
 */
const normalizeFieldErrors = (data: unknown): FieldError[] | undefined => {
    const errors = data && typeof data === 'object'
        ? (data as { errors?: unknown }).errors
        : undefined;

    if (!Array.isArray(errors)) return undefined;

    const fieldErrors = errors
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => {
            const field = typeof item.field === 'string' ? item.field : '';
            const code = typeof item.code === 'string' && item.code ? item.code : null;
            const message = typeof item.message === 'string' && item.message ? item.message : null;

            return {
                field,
                code,
                message,
                params: sanitizeErrorParams(item.params),
                translationKey: apiErrorTranslationKey(code),
            };
        });

    return fieldErrors.length > 0 ? fieldErrors : undefined;
};

/**
 * Normalize an unknown thrown value into a `NormalizedApiError`.
 *
 * @param {unknown} error The thrown value, typically an Axios error.
 * @returns {NormalizedApiError} A stable, user-presentable error.
 */
export const normalizeApiError = (error: unknown): NormalizedApiError => {
    const candidate = error as {
        code?: string;
        message?: string;
        isAxiosError?: boolean;
        response?: { status?: number; data?: unknown };
    };

    if (candidate?.isAxiosError && candidate.code === 'ECONNABORTED') {
        return {
            kind: 'timeout',
            message: 'The server took too long to respond. Please try again.',
            kindTranslationKey: apiErrorKindTranslationKey('timeout'),
            cause: error,
        };
    }

    if (candidate?.isAxiosError && !candidate.response) {
        return {
            kind: 'network',
            message: 'Could not reach the server. Check your connection and try again.',
            kindTranslationKey: apiErrorKindTranslationKey('network'),
            cause: error,
        };
    }

    const response = candidate?.response;
    const data = response?.data;
    const status = response?.status;
    const code = readErrorCode(data);
    const params = sanitizeErrorParams((data as { params?: unknown } | undefined)?.params);
    const fieldErrors = normalizeFieldErrors(data);
    const translationKey = apiErrorTranslationKey(code);
    const serverMessage = readServerMessage(data);

    if (status === 401) {
        return {
            kind: 'unauthorized',
            message: serverMessage || 'Your session has expired. Please sign in again.',
            status,
            code,
            params,
            fieldErrors,
            translationKey,
            serverMessage,
            kindTranslationKey: apiErrorKindTranslationKey('unauthorized'),
            cause: error,
        };
    }

    if (status === 403) {
        return {
            kind: 'forbidden',
            message: serverMessage || 'You do not have permission to do that.',
            status,
            code,
            params,
            fieldErrors,
            translationKey,
            serverMessage,
            kindTranslationKey: apiErrorKindTranslationKey('forbidden'),
            cause: error,
        };
    }

    if (status === StatusCodes.BAD_REQUEST || status === StatusCodes.UNPROCESSABLE_ENTITY) {
        return {
            kind: 'validation',
            message: serverMessage || 'Please check your input and try again.',
            status,
            code,
            params,
            fieldErrors,
            translationKey,
            serverMessage,
            kindTranslationKey: apiErrorKindTranslationKey('validation'),
            cause: error,
        };
    }

    if (status && status >= StatusCodes.INTERNAL_SERVER_ERROR) {
        return {
            kind: 'server',
            message: 'The server encountered an error. Please try again later.',
            status,
            code,
            params,
            fieldErrors,
            translationKey,
            kindTranslationKey: apiErrorKindTranslationKey('server'),
            cause: error,
        };
    }

    if (status) {
        return {
            kind: 'unknown',
            message: serverMessage || 'Something went wrong. Please try again.',
            status,
            code,
            params,
            fieldErrors,
            translationKey,
            serverMessage,
            kindTranslationKey: apiErrorKindTranslationKey('unknown'),
            cause: error,
        };
    }

    return {
        kind: 'unknown',
        message: candidate?.message || GENERIC_ERROR_MESSAGE,
        kindTranslationKey: apiErrorKindTranslationKey('unknown'),
        cause: error,
    };
};

/**
 * Resolve a safe fallback message when a translation is unavailable.
 *
 * Empty and whitespace-only strings are treated as absent so the generic
 * fallback is returned instead of a blank user-facing message.
 *
 * @param {string|undefined} message The candidate fallback message.
 * @returns {string|undefined} The non-empty message, or undefined.
 */
const nonEmptyFallback = (message: string | undefined): string | undefined => {
    return message && message.trim() ? message : undefined;
};

/**
 * Resolve the localisable generic fallback through the shared translator.
 *
 * The generic fallback is requested by key so it can be localised once the
 * `i18next` resources exist; the hardcoded English text is only the final
 * safety net.
 *
 * @param {ErrorTranslator} translator The translation function.
 * @returns {string} The generic user-facing error text.
 */
const resolveGenericMessage = (translator: ErrorTranslator): string => {
    const translated = translator(GENERIC_ERROR_KEY, {defaultValue: GENERIC_ERROR_MESSAGE});
    return nonEmptyFallback(translated) ?? GENERIC_ERROR_MESSAGE;
};

/**
 * Translate one field-level error using the shared translator.
 *
 * Known field codes translate through their key with safe params; otherwise
 * the legacy server message (when present) or the generic fallback is used.
 *
 * @param {FieldError} fieldError The normalized field error.
 * @param {ErrorTranslator} translator The translation function.
 * @returns {string} The user-facing field error message.
 */
const translateFieldError = (fieldError: FieldError, translator: ErrorTranslator): string => {
    if (fieldError.translationKey) {
        const translated = translator(fieldError.translationKey, {
            defaultValue: GENERIC_ERROR_MESSAGE,
            ...(fieldError.params ?? {}),
        });
        return nonEmptyFallback(translated) ?? resolveGenericMessage(translator);
    }

    return nonEmptyFallback(fieldError.message ?? undefined) ?? resolveGenericMessage(translator);
};

/**
 * Translate a normalized API error into user-facing text.
 *
 * Recognized backend codes are translated through their catalogue key (with
 * safe interpolation params) and never fall back to raw server prose, so a
 * technical English message is not shown when a localised entry exists.
 * Unknown codes and legacy payloads fall back to the server message, then to
 * the generic error text.
 *
 * @param {NormalizedApiError} error The normalized API error.
 * @param {ErrorTranslator} translator The translation function.
 * @returns {{message: string, fieldErrors: {field: string, message: string}[]}}
 *   The translated message and field-level messages.
 */
export const translateApiError = (
    error: NormalizedApiError,
    translator: ErrorTranslator,
): {message: string; fieldErrors: {field: string; message: string}[]} => {
    let message: string;

    if (error.translationKey) {
        const translated = translator(error.translationKey, {
            defaultValue: GENERIC_ERROR_MESSAGE,
            ...(error.params ?? {}),
        });
        message = nonEmptyFallback(translated) ?? resolveGenericMessage(translator);
    } else if (error.serverMessage) {
        message = nonEmptyFallback(error.serverMessage) ?? resolveGenericMessage(translator);
    } else if (error.kindTranslationKey) {
        const translated = translator(error.kindTranslationKey, {
            defaultValue: error.message,
        });
        message = nonEmptyFallback(translated)
            ?? nonEmptyFallback(error.message)
            ?? resolveGenericMessage(translator);
    } else {
        message = nonEmptyFallback(error.message) ?? resolveGenericMessage(translator);
    }

    const fieldErrors = (error.fieldErrors ?? []).map((fieldError) => ({
        field: fieldError.field,
        message: translateFieldError(fieldError, translator),
    }));

    return {message, fieldErrors};
};
