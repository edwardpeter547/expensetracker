/**
 * @file error.middleware.test.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Test suite for the error handling middleware (errorHandler and notFoundHandler)
 *
 * Tests the centralized error processing middleware that handles various error types
 * including Prisma ORM errors, JWT authentication errors, and generic application errors,
 * ensuring consistent error responses with appropriate HTTP status codes.
 *
 * @module error.middleware.test
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import Config from '../../configurations/env.config.js';
import logger from '../../configurations/logger.config.js';
import AppError from '../../utils/appError.js';
import { errorHandler, notFoundHandler } from "../error.middleware.js";


/**
 * Error Handler Middleware Tests
 *
 * Tests the errorHandler middleware which intercepts errors thrown throughout the
 * application and transforms them into standardized JSON responses. Tests cover:
 * - Generic errors (500)
 * - Prisma "record not found" (P2025 -> 404)
 * - Prisma "unique constraint" (P2002 -> 409)
 * - JWT invalid token (401)
 * - JWT expired token (401)
 * - Stack trace visibility based on environment
 */
describe('Error Handler Middleware Test - errorHandler', () => {

    let originalNodeEnv;

    afterEach(() => {
        Config.nodeEnv = originalNodeEnv;
        jest.restoreAllMocks();
    })

    let mockRequest, mockResponse, mockNext; 
    
    beforeEach(() => {
        originalNodeEnv = Config.nodeEnv;
        mockRequest = { path: '/test', method: 'GET' };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        mockNext = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
    })

    /**
     * Validates that a generic AppError without a specific status code
     * defaults to 500 and includes the custom error message.
     */
    test('responds with status=500 for a generic error and a custom message', () => {

        const message = 'Something went wrong';
        const error = new AppError(message);
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 500,
                success: false, 
                message: message
            })
        )
    });

    /**
     * Validates that an AppError created without a message falls back
     * to the default 'Internal Server Error' message with status 500.
     */
    test('responds with default status=500 and default error message', () => {

        const defaultMessage = 'Internal Server Error';
        const error = new AppError();
        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 500,
                success: false, 
                message: defaultMessage
            })
        )
    });

    /**
     * Validates that the stack trace is excluded from the response
     * when the application is running in production mode.
     */
    test('response does not include stacktrace in production', () => {
        Config.nodeEnv = 'production';
        const message = 'Something went wrong';
        const error = new AppError(message)

        errorHandler(error, mockRequest, mockResponse, mockNext);
        const jsonResponse = mockResponse.json.mock.calls[0][0];
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(jsonResponse.stack).toBeUndefined();
        
    })

    /**
     * Validates that the stack trace is included in the response
     * when the application is running in development mode for debugging.
     */
    test('response to include stacktrace in development', () => {
        Config.nodeEnv = 'development';
        const message = 'Something went wrong';
        const error = new AppError(message)

        errorHandler(error, mockRequest, mockResponse, mockNext);
        const jsonResponse = mockResponse.json.mock.calls[0][0];
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(jsonResponse.stack).toBeDefined();
    });

    /**
     * Confirms expected client errors are not logged at all, because a 4xx is
     * a routine request outcome rather than a server-side defect.
     */
    test('does not log 4xx client errors', () => {
        const error = new AppError('Validation failed', 400);

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    /**
     * Confirms unexpected server errors are logged at `error` with a stack
     * for diagnosis, while client errors are not promoted to error level.
     */
    test('logs 5xx server errors at error level with a stack', () => {
        const error = new AppError('Something went wrong');

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
            'Error:',
            expect.objectContaining({status: 500, message: 'Something went wrong'})
        );
        expect(logger.warn).not.toHaveBeenCalled();
    });

    /**
     * Validates that a Prisma P2025 error (record not found)
     * returns status 404 with an appropriate error message.
     */
    test('prisma record not found returns status=404 and correct error message', () => {
        const error = new Error('Record not found');
        error.code = 'P2025';

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 404,
                success: false,
                message: 'Record not found'
            })
        );
    })

    /**
     * Validates that a Prisma P2002 error (unique constraint violation)
     * returns status 409 with a message indicating which field already exists.
     */
    test('prisma unique constraint failure returns status=409 and correct error message', () => {
        const error = new Error('Unique constraint failed');
        error.code = 'P2002';
        error.meta = {target: ['email']}

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 409,
                success: false,
                message: 'email already exists'
            })
        );
    })

    /**
     * Validates that a JsonWebTokenError is caught and transformed
     * into a 401 response with an 'Invalid Token' message.
     */
    test('JsonWebToken error returns status=401 and correct error message', () => {
        const error = new Error('Invalid JsonWebToken');
        error.name = 'JsonWebTokenError';

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 401,
                success: false,
                message: 'Invalid Token'
            })
        );
    });

    /**
     * Validates that a TokenExpiredError is caught and transformed
     * into a 401 response with a 'Token Expired' message.
     */
    test('TokenExpiredError returns status=401 and correct error message', () => {
        const error = new Error('Invalid JsonWebToken');
        error.name = 'TokenExpiredError';

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 401,
                success: false,
                message: 'Token Expired'
            })
        );
    })


});


/**
 * Not Found Handler Middleware Tests
 *
 * Tests the notFoundHandler middleware which catches requests to undefined routes
 * and passes a 404 AppError to the centralized error handler.
 */
describe('Not Found Handler Middleware - notFoundHandler', () => {

    let mockRequest, mockResponse, mockNext;

    beforeEach(() => {
        mockRequest = { originalUrl: '/api/v1/nonexistent' };
        mockResponse = {};
        mockNext = jest.fn();
    });

    /**
     * Validates that the middleware calls next() with a 404 AppError
     * containing the original URL in the error message.
     */
    test('calls next with 404 AppError and the original URL in the message', () => {
        notFoundHandler(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('/api/v1/nonexistent');
        expect(error.message).toBe('Cannot find /api/v1/nonexistent on this server');
    });
});
