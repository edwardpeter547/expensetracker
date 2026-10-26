import Joi from "joi";
import { toCanonicalDecimal } from "../utils/money.js";

/**
 * Build a UUID id schema.
 *
 * Note: this builder is currently unused; it is kept available for future
 * id-parameter schemas.
 *
 * @returns {*} A Joi schema value.
 */
export const id = () => Joi.string().uuid().required();

/**
 * Build a required email schema.
 *
 * @returns {import('joi').StringSchema} A required email string schema.
 */
export const email = () => Joi.string().email().required();

/**
 * Build a password string schema with length bounds.
 *
 * @param {number} [min=8] Minimum length.
 * @param {number} [max=128] Maximum length.
 * @returns {import('joi').StringSchema} A required password string schema.
 */
export const password = (min = 8, max = 128) => Joi.string().min(min).max(max).required();

/**
 * Build an alphanumeric one-time-code schema.
 *
 * @param {number} [minLength=6] Exact code length.
 * @returns {import('joi').StringSchema} A required alphanumeric code schema.
 */
export const otpToken = (minLength = 6) => Joi.string().alphanum().length(minLength).required();

/**
 * Build an optional free-text schema with length bounds.
 *
 * @param {number} [min=1] Minimum length.
 * @param {number} [max=50] Maximum length.
 * @returns {import('joi').StringSchema} An optional string schema.
 */
export const text = (min = 1, max = 50) => Joi.string().min(min).max(max);

/**
 * Build a required generic token string schema.
 *
 * @returns {import('joi').StringSchema} A required string schema.
 */
export const token = () => Joi.string().required();

/**
 * Build the validation schema for an opaque refresh token.
 *
 * Refresh tokens are generated as 80-character lowercase hexadecimal strings
 * (`crypto.randomBytes(40).toString('hex')`). Enforcing the exact shape at the
 * route boundary rejects malformed tokens before they reach any service or
 * database code.
 *
 * @returns {import('joi').StringSchema} A required Joi string schema.
 */
export const refreshToken = () => Joi.string().length(80).pattern(/^[0-9a-f]{80}$/i).required();

/**
 * Build a positive-money schema that accepts a number or canonical decimal
 * string and normalizes it to a canonical decimal string.
 *
 * @returns {import('joi').Schema} The money schema.
 */
export const decimalAmount = () => Joi.alternatives()
    .try(
        Joi.number().positive(),
        Joi.string().pattern(/^\d+(\.\d{1,4})?$/),
    )
    .custom((value, helpers) => {
        try {
            return toCanonicalDecimal(value);
        } catch {
            return helpers.error('any.invalid');
        }
    });

/**
 * The set of recognized ISO 4217 currency codes, sourced from ICU.
 *
 * A fallback allowlist keeps the schema usable on runtimes without
 * `Intl.supportedValuesOf`; the repository targets modern Node which always
 * provides it.
 */
const ISO_CURRENCY_CODES = new Set(
    typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('currency')
        : ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'CAD', 'AUD', 'JPY', 'INR', 'CNY']
);

/**
 * The set of recognized IANA timezone identifiers, sourced from ICU.
 *
 * @type {Set<string>}
 */
const IANA_TIMEZONE_IDS = new Set(
    typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : ['UTC']
);

/**
 * Build an ISO 4217 currency-code schema.
 *
 * The value is normalized to uppercase and must match a recognized ISO 4217
 * code, so clients cannot persist arbitrary three-letter strings.
 *
 * @returns {import('joi').StringSchema} An optional normalized currency code.
 */
export const currencyCode = () => Joi.string()
    .uppercase()
    .custom((value, helpers) => {
        if (!ISO_CURRENCY_CODES.has(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    });

/**
 * Build an IANA timezone-identifier schema.
 *
 * @returns {import('joi').StringSchema} An optional validated IANA timezone.
 */
export const timezoneId = () => Joi.string()
    .max(64)
    .custom((value, helpers) => {
        if (!IANA_TIMEZONE_IDS.has(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    });
