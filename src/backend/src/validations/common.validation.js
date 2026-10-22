import Joi from "joi";

/**
 * Build a UUID id schema.
 *
 * Note: currently returns a function reference rather than an invoked schema;
 * this builder is unused.
 *
 * @returns {*} A Joi schema value.
 */
export const id = () => Joi.string().uuid().required;

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
