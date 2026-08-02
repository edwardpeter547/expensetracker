/**
 * Validation Middleware Test Suite
 *
 * Tests all validation middleware functions (validate, validateQuery, validateParams)
 * to ensure they correctly validate request data, call next() on success, and
 * pass an AppError to next() on failure.
 *
 * @module validation.middleware.test
 */

import { beforeEach, describe, expect, jest, test, } from '@jest/globals';
import Joi from 'joi';
import { validate, validateParams, validateQuery } from '../validation.middleware.js';

/**
 * Request Body Validation Tests
 *
 * Validates the validate middleware which validates request.body against a Joi schema.
 * On success, it replaces req.body with the sanitized value and calls next().
 * On failure, it passes an AppError with status 400 to next().
 */
describe('Test Validation Middleware - validate', () => {

    const mockRequest = (body) => ({body});
    const mockResponse = () => ({});
    const mockNext = jest.fn();

    const testSchema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(3).required()
    })

    beforeEach(() => {
        mockNext.mockClear();
    })

    /**
     * Validates that the middleware calls next() with no arguments
     * when the request body passes schema validation.
     */
    test('calls next when validation passes', () => {
        const req = mockRequest({email: 'test@test.com', name: 'John'});
        const res = mockResponse();

        validate(testSchema)(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    })

    /**
     * Validates that the middleware calls next() with an AppError
     * when the request body fails schema validation. The error should
     * have status 400 and contain field-level error details.
     */
    test('next() is called with error wen schema validation fails', () => {
        const req = mockRequest({email: 'test@test'});
        const res = mockResponse();

        validate(testSchema)(req, res, mockNext);
        const error = mockNext.mock.calls[0][0]
        const statusCode = error.statusCode;
        const errorData = error.errors[0];

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(error).toBeDefined();
        expect(statusCode).toBeDefined();
        expect(errorData).toBeDefined();
        expect(statusCode).toEqual(400);
        expect(errorData.field).toContain('email');
        expect(errorData.message).toContain('email');
    });

    /**
     * Validates that the middleware replaces req.body with the sanitized
     * validated data when schema validation passes.
     */
    test('request.body has the validated data when the schema validation passes', () => {
        const req = mockRequest({email: 'test@test.com', name: 'Test User'});
        const res = mockResponse();

        validate(testSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.body).toEqual({email: 'test@test.com', name: 'Test User'});
    })


    /**
     * Validates that the middleware strips unknown fields from req.body
     * that are not defined in the schema (stripUnknown: true).
     */
    test('validate discards extra data that does not match the schema', () => {
        const req = mockRequest({email: 'test@test.com', name: 'John Doe', dob: "06/04/2003"});
        const res = mockResponse();

        validate(testSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(req.body)).not.toContain('dob');
    });
});


/**
 * Request Query Validation Tests
 *
 * Validates the validateQuery middleware which validates request.query
 * against a Joi schema. On success, it replaces req.query with the
 * sanitized value and calls next(). On failure, it passes an AppError
 * with status 400 to next().
 */
describe('Test Validation Middleware - validateQuery', () => {

    const mockRequest = (query) => ({query});
    const mockResponse = () => ({});
    const mockNext = jest.fn();

    const queryParamsSchema = Joi.object({
        page: Joi.number().min(1).required(),
        limit: Joi.number().min(10).max(100)
    })

    beforeEach(() => {
        mockNext.mockClear();
    })

    /**
     * Validates that the middleware calls next() with no arguments
     * when the request body passes schema validation.
     */
    test('calls next when validation passes', () => {
        const req = mockRequest({page: 4, limit: 10});
        const res = mockResponse();

        validateQuery(queryParamsSchema)(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    })

    /**
     * Validates that the middleware calls next() with an AppError
     * when the request body fails schema validation. The error should
     * have status 400 and contain field-level error details.
     */
    test('next() is called with error wen schema validation fails', () => {
        const req = mockRequest({page: 'welcome'});
        const res = mockResponse();

        validateQuery(queryParamsSchema)(req, res, mockNext);
        const error = mockNext.mock.calls[0][0]
        const statusCode = error.statusCode;
        const errorData = error.errors[0];

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(error).toBeDefined();
        expect(statusCode).toBeDefined();
        expect(statusCode).toEqual(400);
        expect(errorData).toBeDefined();
        expect(errorData.field).toContain('page');
        expect(errorData.message).toContain('page');
    });

    /**
     * Validates that the middleware replaces req.query with the sanitized
     * validated data when schema validation passes.
     */
    test('request.query has the validated data when the schema validation passes', () => {
        const req = mockRequest({page: 4, limit: 50});
        const res = mockResponse();

        validateQuery(queryParamsSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.query).toEqual({page: 4, limit: 50});
    })


    /**
     * Validates that the middleware strips unknown query parameters
     * that are not defined in the schema.
     */
    test('validateQuery discards extra data that does not match the schema', () => {
        const req = mockRequest({page: 4, limit: 50, dob: "06/04/2003"});
        const res = mockResponse();

        validateQuery(queryParamsSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(req.query)).not.toContain('dob');
    });
});


/**
 * Request Params Validation Tests
 *
 * Validates the validateParams middleware which validates request.params
 * (route parameters) against a Joi schema. On success, it replaces
 * req.params with the sanitized value and calls next(). On failure, it
 * passes an AppError with status 400 to next().
 */
describe('Test Validation Middleware - validateParams', () => {

    const mockRequest = (params) => ({params});
    const mockResponse = () => ({});
    const mockNext = jest.fn();

    const requestParamsSchema = Joi.object({
        userid: Joi.string().required(),
        isAdmin: Joi.boolean()
    })

    beforeEach(() => {
        mockNext.mockClear();
    })


    /**
     * Validates that the middleware calls next() with no arguments
     * when the query parameters pass schema validation.
     */
    test('calls next when validation passes', () => {
        const req = mockRequest({userid: '1234', isAdmin: true});
        const res = mockResponse();

        validateParams(requestParamsSchema)(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    })

    /**
     * Validates that the middleware calls next() with an AppError
     * when the query parameters fail schema validation. The error should
     * have status 400 and contain field-level error details.
     */
    test('next() is called with error wen schema validation fails', () => {
        const req = mockRequest({userid: true});
        const res = mockResponse();

        validateParams(requestParamsSchema)(req, res, mockNext);
        const error = mockNext.mock.calls[0][0];
        const statusCode = error.statusCode;
        const errorData = error.errors[0];

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(error).toBeDefined();
        expect(statusCode).toBeDefined();
        expect(statusCode).toEqual(400);
        expect(errorData).toBeDefined();
        expect(errorData.field).toContain('userid');
        expect(errorData.message).toContain('userid');
    });


    /**
     * Validates that the middleware replaces req.params with the sanitized
     * validated data when route parameter validation passes.
     */
    test('request.params has the validated data when the schema validation passes', () => {
        const req = mockRequest({userid: '1234', isAdmin: false});
        const res = mockResponse();

        validateParams(requestParamsSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.params).toEqual({userid: '1234', isAdmin: false});
    })

    /**
     * Validates that the middleware strips unknown route parameters
     * that are not defined in the schema.
     */
    test('validateParams discards extra data that does not match the schema', () => {
        const req = mockRequest({userid: '1234', isAdmin: true, dob: "06/04/2003"});
        const res = mockResponse();

        validateParams(requestParamsSchema)(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(req.params)).not.toContain('dob');
    });
})
