import Joi from 'joi';
import { SUPPORTED_LANGUAGES } from '../constants/localization.js';
import { text } from './common.validation.js';

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
    currency: Joi.string().uppercase().length(3),
    timezone: Joi.string().max(64),
    language: Joi.string().valid(...SUPPORTED_LANGUAGES),
    theme: Joi.string().valid('light', 'dark'),
}).min(1);
