/**
 * Mapping from Joi validation details to the stable field-error contract.
 *
 * The validation middleware produces an additive field shape
 * `{ field, code, message, params }` from each Joi `error.details` entry.
 * Codes are stable and language-independent; `message` remains the localised
 * prose (English until issue #205 migrates the remaining paths) and `params`
 * carries only safe, serialisable interpolation values.
 */

import { ERROR_CODES } from '../constants/error-codes.js';
import { sanitizeErrorParams } from './error-params.js';

/**
 * Joi detail type to stable validation-code mapping.
 *
 * Unknown detail types collapse to `VALIDATION_INVALID_VALUE` rather than
 * leaking raw Joi type identifiers onto the wire.
 */
const JOI_TYPE_TO_ERROR_CODE = Object.freeze({
    'any.required': ERROR_CODES.VALIDATION_REQUIRED,
    'array.includesRequiredUnknowns': ERROR_CODES.VALIDATION_REQUIRED,
    'string.empty': ERROR_CODES.VALIDATION_EMPTY,
    'string.base': ERROR_CODES.VALIDATION_INVALID_TYPE,
    'number.base': ERROR_CODES.VALIDATION_INVALID_TYPE,
    'boolean.base': ERROR_CODES.VALIDATION_INVALID_TYPE,
    'object.base': ERROR_CODES.VALIDATION_INVALID_TYPE,
    'string.email': ERROR_CODES.VALIDATION_INVALID_FORMAT,
    'string.uri': ERROR_CODES.VALIDATION_INVALID_FORMAT,
    'string.pattern.base': ERROR_CODES.VALIDATION_INVALID_FORMAT,
    'string.alphanum': ERROR_CODES.VALIDATION_INVALID_FORMAT,
    'string.min': ERROR_CODES.VALIDATION_TOO_SHORT,
    'string.max': ERROR_CODES.VALIDATION_TOO_LONG,
    'number.min': ERROR_CODES.VALIDATION_TOO_SMALL,
    'number.max': ERROR_CODES.VALIDATION_TOO_LARGE,
    'number.positive': ERROR_CODES.VALIDATION_TOO_SMALL,
    'number.integer': ERROR_CODES.VALIDATION_INVALID_TYPE,
    'any.only': ERROR_CODES.VALIDATION_NOT_ALLOWED,
    'any.invalid': ERROR_CODES.VALIDATION_INVALID_VALUE,
    'alternatives.match': ERROR_CODES.VALIDATION_INVALID_VALUE,
    'string.length': ERROR_CODES.VALIDATION_INVALID_VALUE,
});

/**
 * Map a Joi detail type to a stable validation error code.
 *
 * @param {string|undefined} type The Joi `detail.type` value.
 * @returns {string} A stable validation-code identifier.
 */
export const mapJoiTypeToErrorCode = (type) => {
    return JOI_TYPE_TO_ERROR_CODE[type] ?? ERROR_CODES.VALIDATION_INVALID_VALUE;
};

/**
 * Build the safe interpolation params for a single Joi validation detail.
 *
 * Only the documented numeric bounds and the allowed-values list are exposed.
 * Raw submitted values are deliberately excluded so a password attempt or
 * other sensitive input is never echoed back through validation params.
 *
 * @param {object} detail A Joi `error.details` entry.
 * @returns {object|null} Safe interpolation params, or null when empty.
 */
export const buildValidationParams = (detail) => {
    const context = detail && typeof detail.context === 'object' ? detail.context : {};
    const params = {};

    if (typeof context.limit === 'number' || typeof context.limit === 'string') {
        params.limit = context.limit;
    }
    if (Array.isArray(context.valids) && context.valids.every((item) => typeof item === 'string')) {
        params.valids = context.valids.join(', ');
    }

    return sanitizeErrorParams(params);
};

/**
 * Build a stable field-level error object from one Joi validation detail.
 *
 * @param {object} detail A Joi `error.details` entry.
 * @returns {{field: string, code: string, message: string, params: object|null}}
 *   The contract-shaped field error.
 */
export const buildValidationError = (detail) => {
    const field = Array.isArray(detail?.path)
        ? detail.path.join('.')
        : String(detail?.path ?? '');

    return {
        field,
        code: mapJoiTypeToErrorCode(detail?.type),
        message: typeof detail?.message === 'string' ? detail.message : 'Invalid value',
        params: buildValidationParams(detail),
    };
};

/**
 * Build the full field-error array for a Joi validation failure.
 *
 * @param {Array<object>} details The Joi `error.details` array.
 * @returns {Array<{field: string, code: string, message: string, params: object|null}>}
 *   The contract-shaped field errors.
 */
export const buildValidationErrors = (details) => {
    return Array.isArray(details) ? details.map(buildValidationError) : [];
};

/**
 * Normalize an arbitrary `AppError.errors` array into the field-error shape.
 *
 * This is applied at the response boundary so a caller that passes pre-built
 * or legacy error details still conforms to `{ field, code, message, params }`.
 * Non-array values are returned as `null`.
 *
 * @param {*} errors The raw `AppError.errors` value.
 * @returns {Array<{field: string, code: string|null, message: string|null, params: object|null}>|null}
 *   Normalized field errors, or null.
 */
export const normalizeFieldErrors = (errors) => {
    if (!Array.isArray(errors)) return null;

    const normalized = errors
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            field: typeof item.field === 'string' ? item.field : '',
            code: typeof item.code === 'string' ? item.code : null,
            message: typeof item.message === 'string' ? item.message : null,
            params: sanitizeErrorParams(item.params),
        }));

    return normalized.length > 0 ? normalized : null;
};
