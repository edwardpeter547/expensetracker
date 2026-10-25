import Joi from 'joi';
import { SUPPORTED_LANGUAGES } from '../constants/localization.js';
import {id, email, password, otpToken, refreshToken, text, token} from './common.validation.js';

/**
 * Validation schema for account registration.
 */
export const registerSchema = Joi.object({
    email: email(),
    username: text(3, 30).required().alphanum(),
    password: password(8, 100),
    firstName: text().required(),
    lastName: text().required(),
    language: Joi.string().valid(...SUPPORTED_LANGUAGES),
    currency: Joi.string().uppercase().length(3),
});

/**
 * Validation schema for email/password login.
 */
export const loginSchema = Joi.object({
    email: email(),
    password: password()
});


/**
 * Validation schema for a refresh-token request.
 */
export const refreshSchema = Joi.object({
    refreshToken: token(),
})

/**
 * Validation schema for the logout request body.
 *
 * Logout requires exactly one well-formed opaque refresh token. Validation
 * rejects missing and malformed tokens before the controller or service runs.
 */
export const logoutSchema = Joi.object({
    refreshToken: refreshToken(),
});


export const verificationTokenSchema = Joi.object({
    token: token(),
});

/**
 * Validation schema for verifying a password-reset code.
 */
export const resetPasswordTokenSchema = Joi.object({
    code: otpToken(6),
    email: email()
})

/**
 * Validation schema for an email-only request.
 */
export const emailVerificationSchema = Joi.object({
    email: email()
});


/**
 * Validation schema for the forgot-password request.
 */
export const forgotPasswordSchema = Joi.object({
    email: email()
});


/**
 * Validation schema for changing a password with a reset code.
 */
export const changePasswordSchema = Joi.object({
    code: otpToken(6),
    email: email(),
    password: password(8, 100),
});

/**
 * Validation schema for the device-session identifier route parameter.
 */
export const sessionIdSchema = Joi.object({
    id: Joi.string().required(),
});
