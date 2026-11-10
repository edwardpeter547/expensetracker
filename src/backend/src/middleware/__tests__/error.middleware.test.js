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
                message: 'Invalid or expired token'
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
                message: 'Token expired'
            })
        );
    });

    /**
     * An uncoded AppError must still receive a deterministic status-derived
     * code so the additive `code` field is always present in the envelope.
     */
    test('assigns a status-derived code to an uncoded AppError', () => {
        errorHandler(new AppError('Not found', 404), mockRequest, mockResponse, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'NOT_FOUND',
                params: null,
                errors: null,
            })
        );
    });

    /**
     * A coded AppError must preserve its explicit code and sanitize its
     * interpolation params, dropping nested or unsafe values.
     */
    test('preserves explicit code and sanitizes interpolation params', () => {
        errorHandler(
            new AppError(
                'Budget limit exceeded',
                409,
                null,
                {code: 'BUDGET_LIMIT_EXCEEDED', params: {limit: '500.00', nested: {}}},
            ),
            mockRequest,
            mockResponse,
            mockNext,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'BUDGET_LIMIT_EXCEEDED',
                params: {limit: '500.00'},
            })
        );
    });

    /**
     * A Prisma unique-constraint failure must surface the stable constraint
     * code and the affected field as a safe interpolation parameter.
     */
    test('maps Prisma P2002 to the unique-constraint code with a field param', () => {
        const error = new Error('Unique constraint failed');
        error.code = 'P2002';
        error.meta = {target: ['email']};

        errorHandler(error, mockRequest, mockResponse, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'UNIQUE_CONSTRAINT_VIOLATION',
                params: {field: 'email'},
            })
        );
    });

    /**
     * Field-level errors passed on an AppError must be normalised to the
     * `{ field, code, message, params }` contract at the response boundary.
     */
    test('normalizes field-level validation errors in the envelope', () => {
        errorHandler(
            new AppError(
                'Validation failed',
                400,
                [{field: 'email', code: 'VALIDATION_INVALID_FORMAT', message: 'invalid email'}],
                {code: 'VALIDATION_ERROR'},
            ),
            mockRequest,
            mockResponse,
            mockNext,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'VALIDATION_ERROR',
                errors: [
                    {
                        field: 'email',
                        code: 'VALIDATION_INVALID_FORMAT',
                        message: 'Invalid format',
                        params: null,
                    },
                ],
            })
        );
    });

    /**
     * A coded AppError must have its message localised using the negotiated
     * request locale, while the stable code and params remain unchanged.
     */
    test('localizes a coded AppError for the negotiated locale', () => {
        mockRequest.headers = {'accept-language': 'fr'};

        errorHandler(
            new AppError('Transaction not found', 404, null, {code: 'TRANSACTION_NOT_FOUND'}),
            mockRequest,
            mockResponse,
            mockNext,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'TRANSACTION_NOT_FOUND',
                message: 'Transaction introuvable',
            })
        );
    });

    /**
     * Field-level validation errors must localise independently, applying the
     * field's safe interpolation params in the negotiated locale.
     */
    test('localizes field-level validation errors for the negotiated locale', () => {
        mockRequest.headers = {'accept-language': 'fr'};

        errorHandler(
            new AppError(
                'Validation failed',
                400,
                [{field: 'name', code: 'VALIDATION_TOO_SHORT', message: 'too short', params: {limit: 3}}],
                {code: 'VALIDATION_ERROR'},
            ),
            mockRequest,
            mockResponse,
            mockNext,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                errors: [
                    {
                        field: 'name',
                        code: 'VALIDATION_TOO_SHORT',
                        message: 'Doit contenir au moins 3 caractères',
                        params: {limit: 3},
                    },
                ],
            })
        );
    });

    /**
     * An unknown code has no catalogue entry, so the thrown message remains
     * the user-facing text rather than being replaced with the code string.
     */
    test('keeps the thrown message for an unknown code', () => {
        errorHandler(
            new AppError('Something custom', 409, null, {code: 'FUTURE_CODE'}),
            mockRequest,
            mockResponse,
            mockNext,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'FUTURE_CODE',
                message: 'Something custom',
            })
        );
    });


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
