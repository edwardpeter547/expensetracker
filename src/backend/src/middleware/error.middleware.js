/**
 * @file error.middleware.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Express error handling middleware for centralized error processing and response formatting
 * 
 * This middleware intercepts errors thrown throughout the application and provides consistent
 * error responses with appropriate HTTP status codes. It handles various error types including
 * Prisma ORM errors and JWT authentication errors, transforming them into standardized AppError
 * instances with descriptive messages.
 * 
 * @param {Error} appError - The error object containing error details and optional custom properties
 * @param {Error} appError.code - Optional error code (e.g., Prisma error codes like 'P2025', 'P2002')
 * @param {string} appError.name - Error type name (e.g., 'JsonWebTokenError', 'TokenExpiredError')
 * @param {string} appError.message - Error message
 * @param {number} [appError.statusCode=500] - HTTP status code (defaults to 500)
 * @param {Array} [appError.errors] - Optional array of detailed error information
 * @param {Object} appError.meta - Optional metadata (e.g., Prisma error metadata with target field)
 * @param {Object} request - Express request object
 * @param {string} request.path - Request path
 * @param {string} request.method - HTTP method
 * @param {string} request.originalUrl - Full original URL
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {void} Sends JSON error response and does not call next()
 * 
 * @example
 * // Add this middleware after all route definitions
 * app.use(errorHandler);
 * 
 * // Handles Prisma "Record not found" errors (P2025)
 * // Handles Prisma "Unique constraint failed" errors (P2002)
 * // Handles JWT validation errors
 * // Handles JWT expiration errors
 */


import AppError from '../utils/appError.js';
import Config from '../configurations/env.config.js';
import logger from '../configurations/logger.config.js';
import { StatusCodes } from 'http-status-codes';
import {
    ERROR_CODES,
    defaultErrorCodeForStatus,
} from '../constants/error-codes.js';
import { sanitizeErrorParams } from '../utils/error-params.js';
import { normalizeFieldErrors } from '../utils/validation-errors.js';


/**
 * Central error handler that maps operational and framework errors to the
 * standard `{ success, status, code, message, params, errors }` error envelope.
 *
 * Prisma `P2025`/`P2002` and JWT errors are translated to stable HTTP codes and
 * stable machine-readable error codes. Uncoded `AppError` instances receive a
 * generic status-derived code so the additive `code` field is always present.
 * The stack is included only in development. Server errors (5xx) are logged at
 * `error` level with a stack; expected client errors (4xx) are intentionally
 * not logged, because they are routine request outcomes rather than defects.
 *
 * @param {Error|AppError} appError The thrown error.
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {void}
 */
export const errorHandler = (appError, request, response, next) => {

    let normalizedError;

    if (appError instanceof AppError) {
        normalizedError = appError;
    } else {
        normalizedError = new AppError(
            appError?.message || appError || 'Internal server Error',
            appError?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
        );
        if (Array.isArray(appError?.errors)) {
            normalizedError.errors = appError.errors;
        }
    }

    //Prisma error: Record not found
    if(appError?.code === 'P2025'){
        normalizedError = new AppError(
            'Record not found',
            StatusCodes.NOT_FOUND,
            null,
            {code: ERROR_CODES.NOT_FOUND}
        );
    }

    // Prisma error: Unique constraint failed
    if(appError?.code === 'P2002'){
        const field = appError.meta?.target?.[0] || 'field';
        normalizedError = new AppError(
            `${field} already exists`,
            StatusCodes.CONFLICT,
            null,
            {
                code: ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION,
                params: {field},
            }
        );
    }

    // JWT error
    if(appError?.name === 'JsonWebTokenError'){
        normalizedError = new AppError(
            'Invalid Token',
            StatusCodes.UNAUTHORIZED,
            null,
            {code: ERROR_CODES.TOKEN_INVALID}
        );
    }

    // Token expired error
    if(appError?.name === 'TokenExpiredError'){
        normalizedError = new AppError(
            "Token Expired",
            StatusCodes.UNAUTHORIZED,
            null,
            {code: ERROR_CODES.TOKEN_EXPIRED}
        );
    }

    const statusCode = normalizedError.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = normalizedError.message || 'Internal Server Error';
    const code = normalizedError.code || defaultErrorCodeForStatus(statusCode);
    const params = sanitizeErrorParams(normalizedError.params);
    const fieldErrors = normalizeFieldErrors(normalizedError.errors);

    if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
        logger.error('Error:', {
            name: normalizedError.name,
            message,
            status: statusCode,
            code,
            path: request.path,
            method: request.method,
            correlationId: request.id,
            stack: normalizedError.stack,
        });
    }

    response.status(statusCode).json({
        success: false,
        status: statusCode,
        code,
        message: message,
        params,
        errors: fieldErrors,
        stack: Config.nodeEnv === 'development' ? normalizedError.stack : undefined
    })

}


/**
 * Middleware to handle 404 Not Found errors for undefined routes
 * 
 * This middleware catches requests to routes that do not exist in the application.
 * It creates an AppError with a 404 status code and passes it to the error handling
 * middleware for consistent error response formatting.
 * 
 * @param {Object} request - Express request object containing the original URL
 * @param {Object} response - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * // Add this middleware at the end of all route definitions
 * app.use(notFoundHandler);
 */
export const notFoundHandler = (request, response, next) => {
    next(new AppError(`Cannot find ${request.originalUrl} on this server`, StatusCodes.NOT_FOUND));
}
