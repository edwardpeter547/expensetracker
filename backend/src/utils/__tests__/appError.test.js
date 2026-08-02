/**
 * @file appError.test.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Test suite for the AppError custom error class
 *
 * Tests the AppError class which extends the native Error class with
 * HTTP status codes, operational status classification, and support
 * for additional error details/validation errors.
 *
 * @module appError.test
 */

import { describe, expect, test } from '@jest/globals';
import AppError from '../appError.js';

describe('AppError Class Test Suite - AppError', () => {

    test('creates an instance of AppError', () => {
        const error = new AppError('Not found', 404);
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
    });

    test('sets the correct message', () => {
        const error = new AppError('Not found', 404);
        expect(error.message).toBe('Not found');
    });

    test('sets the correct status code', () => {
        const error = new AppError('Not found', 404);
        expect(error.statusCode).toBe(404);
    });

    test('classifies 4xx status codes as "fail"', () => {
        const error400 = new AppError('Bad request', 400);
        const error401 = new AppError('Unauthorized', 401);
        const error404 = new AppError('Not found', 404);
        const error422 = new AppError('Unprocessable entity', 422);
        const error429 = new AppError('Too many requests', 429);

        expect(error400.status).toBe('fail');
        expect(error401.status).toBe('fail');
        expect(error404.status).toBe('fail');
        expect(error422.status).toBe('fail');
        expect(error429.status).toBe('fail');
    });

    test('classifies non-4xx status codes as "error"', () => {
        const error500 = new AppError('Internal server error', 500);
        const error502 = new AppError('Bad gateway', 502);
        const error503 = new AppError('Service unavailable', 503);

        expect(error500.status).toBe('error');
        expect(error502.status).toBe('error');
        expect(error503.status).toBe('error');
    });

    test('marks the error as operational', () => {
        const error = new AppError('Not found', 404);
        expect(error.isOperational).toBe(true);
    });

    test('sets errors to null when no third argument is provided', () => {
        const error = new AppError('Not found', 404);
        expect(error.errors).toBeNull();
    });

    test('stores additional error details when provided', () => {
        const validationErrors = [
            { field: 'email', message: 'email is required' },
            { field: 'password', message: 'password must be at least 8 characters' }
        ];

        const error = new AppError('Validation failed', 400, validationErrors);
        expect(error.errors).toEqual(validationErrors);
        expect(error.errors.length).toBe(2);
    });

    // test('captures a stack trace', () => {
    //     const error = new AppError('Not found', 404);
    //     expect(error.stack).toBeDefined();
    //     expect(error.stack).toContain('AppError');
    // });

    test('works without a status code', () => {
        const error = new AppError('Something went wrong');
        expect(error.statusCode).toBeUndefined();
        expect(error.status).toBe('error');
        expect(error.message).toBe('Something went wrong');
    });

    test('handles 3xx status codes as "error"', () => {
        const error = new AppError('Redirect', 302);
        expect(error.status).toBe('error');
    });

    test('handles 2xx status codes as "error"', () => {
        const error = new AppError('OK', 200);
        expect(error.status).toBe('error');
    });
});