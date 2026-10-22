/**
 * @file catchAsync.test.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Test suite for the catchAsync utility function
 *
 * Tests the higher-order function that wraps async route handlers to catch
 * any rejected promises and forward the error to Express error handling middleware
 * via next().
 *
 * @module catchAsync.test.js
 */

import { describe, expect, jest, test } from '@jest/globals';
import catchAsync from '../catchAsync.js';

describe('catchAsync', () => {

    /**
     * Validates that catchAsync returns a function when given an async function.
     */
    test('returns a function', () => {
        const asyncFn = async () => {};
        const wrappedFn = catchAsync(asyncFn);

        expect(typeof wrappedFn).toBe('function');
    });

    /**
     * Validates that when the wrapped function executes successfully,
     * next() is never called with an error.
     */
    test('calls next without error when the async function resolves', async () => {
        const asyncFn = async (req, res, next) => {
            return 'success';
        };

        const wrappedFn = catchAsync(asyncFn);
        const mockNext = jest.fn();

        await wrappedFn({}, {}, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * Validates that when the async function throws an error,
     * catchAsync catches it and passes it to next().
     */
    test('calls next with error when the async function rejects', async () => {
        const testError = new Error('Something went wrong');
        const asyncFn = async (req, res, next) => {
            throw testError;
        };

        const wrappedFn = catchAsync(asyncFn);
        const mockNext = jest.fn();

        await wrappedFn({}, {}, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(testError);
    });

    /**
     * Validates that the req and res objects are correctly passed
     * through to the wrapped async function.
     */
    test('passes request, response, and next to the wrapped function', async () => {
        const mockReq = { body: { email: 'test@test.com' } };
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const mockNext = jest.fn();

        const asyncFn = jest.fn(async (req, res, next) => {
            // Function does nothing, just resolves
        });

        const wrappedFn = catchAsync(asyncFn);
        await wrappedFn(mockReq, mockRes, mockNext);

        expect(asyncFn).toHaveBeenCalledTimes(1);
        expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    /**
     * Validates that catchAsync can be used with any async function,
     * including those that reject with different error types.
     */
    test('catches errors of any type', async () => {
        const errorTypes = [
            new Error('Standard error'),
            new TypeError('Type error'),
            { custom: 'object error' },
            'string error'
        ];

        for (const error of errorTypes) {
            const asyncFn = async () => { throw error; };
            const wrappedFn = catchAsync(asyncFn);
            const mockNext = jest.fn();

            await wrappedFn({}, {}, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        }
    });
});