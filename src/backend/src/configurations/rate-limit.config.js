import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import Config from './env.config.js';

/**
 * Build an express-rate-limit middleware with the standard API error envelope
 * and an explicit Retry-After header.
 *
 * @param {{windowMs: number, limit: number}} options Window size and request cap.
 * @returns {import('express').RequestHandler} The configured rate limiter.
 */
export const createAuthRateLimiter = ({windowMs, limit}) => rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
    handler: (request, response) => {
        const resetTime = request.rateLimit?.resetTime;
        const retryAfter = resetTime
            ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
            : Math.ceil(windowMs / 1000);

        response.setHeader('Retry-After', String(retryAfter));
        response.status(StatusCodes.TOO_MANY_REQUESTS).json({
            success: false,
            status: StatusCodes.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later.',
            errors: null,
        });
    },
});

export const loginRateLimiter = createAuthRateLimiter(Config.authRateLimits.login);
export const registerRateLimiter = createAuthRateLimiter(Config.authRateLimits.register);
export const forgotPasswordRateLimiter = createAuthRateLimiter(Config.authRateLimits.forgotPassword);
export const resendVerificationRateLimiter = createAuthRateLimiter(Config.authRateLimits.resendVerification);
export const refreshTokenRateLimiter = createAuthRateLimiter(Config.authRateLimits.refreshToken);
export const avatarUploadRateLimiter = createAuthRateLimiter(Config.avatarRateLimit);
export const deletionRecoveryRateLimiter = createAuthRateLimiter(Config.deletionRecoveryRateLimit);

/**
 * Global limiter applied to every `/api` request. It reuses the same factory
 * and error envelope as the authentication limiters.
 */
export const globalApiRateLimiter = createAuthRateLimiter(Config.globalApiRateLimit);
