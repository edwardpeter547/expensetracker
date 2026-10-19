import Joi from "joi";

export const id = () => Joi.string().uuid().required;
export const email = () => Joi.string().email().required();
export const password = (min = 8, max = 128) => Joi.string().min(min).max(max).required();
export const otpToken = (minLength = 6) => Joi.string().alphanum().length(minLength).required();
export const text = (min = 1, max = 50) => Joi.string().min(min).max(max);
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
