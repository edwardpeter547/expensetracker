import Joi from 'joi';
import { SUPPORTED_LANGUAGES, SUPPORTED_THEMES } from '../constants/localization.js';
import { currencyCode, email, password, text, timezoneId } from './common.validation.js';
import { DELETE_CONFIRMATION_TEXT } from '../constants/deletion.constants.js';

/**
 * Validation schema for updating the authenticated user's profile.
 *
 * At least one field is required. Unknown fields are stripped by the shared
 * validation middleware. Username must stay alphanumeric and between 3 and 30
 * characters, matching the registration rule.
 */
export const updateProfileSchema = Joi.object({
    firstname: text(1, 50),
    lastname: text(1, 50),
    username: Joi.string().alphanum().min(3).max(30),
    currency: currencyCode(),
    timezone: timezoneId(),
    language: Joi.string().valid(...SUPPORTED_LANGUAGES),
    theme: Joi.string().valid(...SUPPORTED_THEMES),
}).min(1);

/**
 * Validation schema for changing the authenticated user's own password.
 *
 * `currentPassword` is compared with bcrypt by the service and is therefore
 * only required to be present, not length-policy-constrained. `newPassword`
 * follows the same 8-100 character policy as registration and reset.
 */
export const changeOwnPasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: password(8, 100),
});

/**
 * Validation schema for requesting voluntary account closure.
 *
 * Requires the current password for reauthentication and the literal
 * confirmation text so closure is deliberate.
 */
export const deletionRequestSchema = Joi.object({
    password: Joi.string().required(),
    confirmation: Joi.string().valid(DELETE_CONFIRMATION_TEXT).required(),
});

/**
 * Validation schema for cancelling an eligible voluntary closure.
 *
 * This recovery path is unauthenticated by design; it reauthenticates with the
 * account email and password because the user's sessions were already revoked.
 */
export const deletionCancelSchema = Joi.object({
    email: email(),
    password: Joi.string().required(),
});
