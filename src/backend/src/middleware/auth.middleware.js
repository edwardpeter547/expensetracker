import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import Config from '../configurations/env.config.js';
import { userProfile } from '../services/profile.service.js';
import AppError from '../utils/appError.js';
import { recordAuthAuditEvent } from '../services/auth-audit.service.js';
import { AUTH_AUDIT_EVENT_TYPES, AUTH_AUDIT_OUTCOMES, AUTH_AUDIT_REASONS } from '../constants/auth-audit.constants.js';


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
        await recordAuthAuditEvent({
            eventType: AUTH_AUDIT_EVENT_TYPES.AUTHORIZATION_DENIED,
            outcome: AUTH_AUDIT_OUTCOMES.DENIED,
            userId: decodedUserId,
            ipAddress: request.ip,
            correlationId: request.id,
            metadata: {reason: AUTH_AUDIT_REASONS.INSUFFICIENT_PERMISSION},
        });

        if(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'){
            return next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
        }
        next(error);
    }
}
