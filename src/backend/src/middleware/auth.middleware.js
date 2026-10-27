import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import Config from '../configurations/env.config.js';
import { userProfile } from '../services/profile.service.js';
import AppError from '../utils/appError.js';
import { recordAuthAuditEvent } from '../services/auth-audit.service.js';
import { AUTH_AUDIT_EVENT_TYPES, AUTH_AUDIT_OUTCOMES, AUTH_AUDIT_REASONS } from '../constants/auth-audit.constants.js';

const MISSING_TOKEN_MESSAGE = 'Access denied. No token provided.';
const INSUFFICIENT_PERMISSION_MESSAGE = 'Access denied. Insufficient permissions.';

/**
 * Record one authorization-denied audit event for the current request.
 *
 * Both `authenticate` and `authorize` route denials through this single helper
 * so a request that fails authentication and a request that fails a role check
 * each produce exactly one `AUTHORIZATION_DENIED` event, never one per layer.
 *
 * @param {import('express').Request} request Express request.
 * @param {number|null} userId The resolved user id, if any.
 * @returns {Promise<void>}
 */
const recordAuthorizationDenied = async (request, userId = null) => {
    await recordAuthAuditEvent({
        eventType: AUTH_AUDIT_EVENT_TYPES.AUTHORIZATION_DENIED,
        outcome: AUTH_AUDIT_OUTCOMES.DENIED,
        userId,
        ipAddress: request.ip,
        correlationId: request.id,
        metadata: {reason: AUTH_AUDIT_REASONS.INSUFFICIENT_PERMISSION},
    });
};

/**
 * Normalize the variadic role arguments into a deduplicated list of role
 * names. Non-string entries (including nullish values) are discarded.
 *
 * @param {Array<string|string[]>} roles The roles passed to `authorize`.
 * @returns {string[]} The trimmed, deduplicated required roles.
 */
const normalizeRequiredRoles = (roles) => {
    const normalized = [];

    for (const entry of roles.flat()) {
        if (typeof entry !== 'string') {
            continue;
        }

        const role = entry.trim();
        if (role && !normalized.includes(role)) {
            normalized.push(role);
        }
    }

    return normalized;
};

/**
 * Extract the server-established roles from an authenticated principal.
 *
 * The only trusted source is `request.user.roles`, which the authentication
 * layer is expected to populate from server-side data. Client-supplied claims
 * are never read. A missing or malformed `roles` claim yields an empty list so
 * role checks fail closed.
 *
 * @param {object|null|undefined} user The authenticated principal.
 * @returns {string[]} The established role names.
 */
const getEstablishedRoles = (user) => {
    if (!Array.isArray(user?.roles)) {
        return [];
    }

    return user.roles
        .filter((role) => typeof role === 'string')
        .map((role) => role.trim())
        .filter((role) => role.length > 0);
};

/**
 * Verify a bearer access token and attach the authenticated user.
 *
 * Decodes and verifies the JWT, loads a safe user projection, and rejects
 * missing, invalid, expired, or inactive users with a 401. On success
 * `request.user` is populated from `userProfile` (no password field).
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {Promise<void>}
 */
export const authenticate = async (request, response, next) => {
    let decodedUserId = null;

    try {

        const authHeader = request.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer')){
            throw new AppError('Access denied. No token provided.', StatusCodes.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

        // Verify access token
        const decoded = jwt.verify(token, Config.jwtSecret, {
            algorithms: ['HS256'],
            issuer: Config.jwtIssuer,
            audience: Config.jwtAudience,
        });
        decodedUserId = decoded.userId;
        
        const user = await userProfile({userId: decoded.userId});

        if(!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion){
            throw new AppError('User not found or account deactivated', StatusCodes.UNAUTHORIZED)
        }

        request.user = user;
        next();

    }catch(error){
        await recordAuthorizationDenied(request, decodedUserId);

        if(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'){
            return next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
        }
        next(error);
    }
}

/**
 * Build role-check middleware that composes after `authenticate`.
 *
 * The middleware requires an already-authenticated principal. With no roles it
 * acts as an authentication-only guard; with roles it allows access when the
 * principal's server-established roles include at least one required role and
 * otherwise fails closed with a 403. Unauthenticated requests are rejected with
 * the same 401 contract as `authenticate`.
 *
 * Role claims are never read from the request body, query, or headers. Until a
 * real consumer attaches a trustworthy `request.user.roles` claim, any route
 * guarded with `authorize(...)` denies access.
 *
 * @param {...(string|string[])} roles The role names accepted by the route.
 * @returns {Function} An Express middleware function.
 */
export const authorize = (...roles) => {
    const requiredRoles = normalizeRequiredRoles(roles);

    return async (request, response, next) => {
        if (!request.user) {
            await recordAuthorizationDenied(request, null);
            return next(new AppError(MISSING_TOKEN_MESSAGE, StatusCodes.UNAUTHORIZED));
        }

        if (requiredRoles.length === 0) {
            return next();
        }

        const establishedRoles = getEstablishedRoles(request.user);
        const isGranted = requiredRoles.some((role) => establishedRoles.includes(role));

        if (!isGranted) {
            await recordAuthorizationDenied(request, request.user?.id);
            return next(new AppError(INSUFFICIENT_PERMISSION_MESSAGE, StatusCodes.FORBIDDEN));
        }

        return next();
    };
};
