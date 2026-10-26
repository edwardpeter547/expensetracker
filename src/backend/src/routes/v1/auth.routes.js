import express from 'express';
import {
    forgotPassword,
    listSessions,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
    resendVerification,
    revokeAllSessions,
    revokeSession,
    verifyEmail,
    verifyToken
} from '../../controllers/auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate, validateParams, validateQuery } from '../../middleware/validation.middleware.js';
import {
    emailVerificationSchema,
    loginSchema,
    logoutSchema,
    refreshSchema,
    registerSchema,
    resetPasswordSchema,
    resetPasswordTokenSchema,
    sessionIdSchema,
    verificationTokenSchema
} from '../../validations/auth.validation.js';
import {
    forgotPasswordRateLimiter,
    loginRateLimiter,
    refreshTokenRateLimiter,
    registerRateLimiter,
    resendVerificationRateLimiter,
} from '../../configurations/rate-limit.config.js';

/**
 * Authentication routes mounted under `/api/v1/auth`.
 */

const authRoutes = express.Router();

// Public routes
authRoutes.post('/register', registerRateLimiter, validate(registerSchema), register);
authRoutes.get('/verify-email', validateQuery(verificationTokenSchema), verifyEmail);
authRoutes.post('/resend-verification', resendVerificationRateLimiter, validate(emailVerificationSchema), resendVerification);
authRoutes.post('/login', loginRateLimiter, validate(loginSchema), login);
authRoutes.post('/forgot-password', forgotPasswordRateLimiter, validate(emailVerificationSchema), forgotPassword);
authRoutes.post('/verify-otp', validate(resetPasswordTokenSchema), verifyToken);
authRoutes.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRoutes.post('/refresh-token', refreshTokenRateLimiter, validate(refreshSchema), refreshToken);

// Protected Routes
authRoutes.post('/logout', authenticate, validate(logoutSchema), logout);
authRoutes.get('/sessions', authenticate, listSessions);
authRoutes.delete('/sessions', authenticate, revokeAllSessions);
authRoutes.delete('/sessions/:id', authenticate, validateParams(sessionIdSchema), revokeSession);

export default authRoutes;
