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


export const errorHandler = (appError, request, response, next) => {

    let normalizedError = appError instanceof AppError
        ? appError
        : new AppError(
            appError?.message || appError || 'Internal server Error',
            appError?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
        )

    let error = {...appError};

    logger.error('Error:', {
        name: normalizedError.name,
        message: normalizedError.message,
        stack: normalizedError.stack,
        path: request.path,
        method: request.method
    });

    //Prisma error: Record not found
    if(appError.code === 'P2025'){
        normalizedError = new AppError('Record not found', StatusCodes.NOT_FOUND);
    }

    // Prisma error: Unique constraint failed
    if(appError.code === 'P2002'){
        const field = appError.meta?.target?.[0] || 'field';
        normalizedError = new AppError(`${field} already exists`, StatusCodes.CONFLICT);
    }

    // JWT error
    if(appError.name === 'JsonWebTokenError'){
        normalizedError = new AppError('Invalid Token', StatusCodes.UNAUTHORIZED);
    }

    // Token expired error
    if(appError.name === 'TokenExpiredError'){
        normalizedError = new AppError("Token Expired", StatusCodes.UNAUTHORIZED);
    }

    const statusCode = normalizedError.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = normalizedError.message || 'Internal Server Error';

    response.status(statusCode).json({
        success: false,
        status: statusCode, 
        message: message,
        errors: normalizedError.errors,
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