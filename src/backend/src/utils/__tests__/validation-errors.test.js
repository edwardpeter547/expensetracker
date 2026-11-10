/**
 * Tests for the Joi detail to field-error mapping.
 *
 * The validation middleware relies on this module to emit stable field codes
 * and safe interpolation params while preserving the existing `field` and
 * `message` values that legacy consumers already read.
 */

import { describe, expect, test } from '@jest/globals';
import Joi from 'joi';
import { ERROR_CODES } from '../../constants/error-codes.js';
import {
    buildValidationError,
    buildValidationErrors,
    buildValidationParams,
    mapJoiTypeToErrorCode,
    normalizeFieldErrors,
} from '../validation-errors.js';

describe('mapJoiTypeToErrorCode', () => {
    /**
     * Representative Joi detail types must resolve to their stable codes.
     */
    test('maps known Joi detail types', () => {
        expect(mapJoiTypeToErrorCode('any.required')).toBe(ERROR_CODES.VALIDATION_REQUIRED);
        expect(mapJoiTypeToErrorCode('string.empty')).toBe(ERROR_CODES.VALIDATION_EMPTY);
        expect(mapJoiTypeToErrorCode('string.email')).toBe(ERROR_CODES.VALIDATION_INVALID_FORMAT);
        expect(mapJoiTypeToErrorCode('string.min')).toBe(ERROR_CODES.VALIDATION_TOO_SHORT);
        expect(mapJoiTypeToErrorCode('string.max')).toBe(ERROR_CODES.VALIDATION_TOO_LONG);
        expect(mapJoiTypeToErrorCode('number.base')).toBe(ERROR_CODES.VALIDATION_INVALID_TYPE);
        expect(mapJoiTypeToErrorCode('number.min')).toBe(ERROR_CODES.VALIDATION_TOO_SMALL);
        expect(mapJoiTypeToErrorCode('number.max')).toBe(ERROR_CODES.VALIDATION_TOO_LARGE);
        expect(mapJoiTypeToErrorCode('any.only')).toBe(ERROR_CODES.VALIDATION_NOT_ALLOWED);
        expect(mapJoiTypeToErrorCode('any.invalid')).toBe(ERROR_CODES.VALIDATION_INVALID_VALUE);
    });

    /**
     * Unknown detail types collapse to a safe generic validation code.
     */
    test('falls back for unknown detail types', () => {
        expect(mapJoiTypeToErrorCode('custom.type')).toBe(ERROR_CODES.VALIDATION_INVALID_VALUE);
        expect(mapJoiTypeToErrorCode(undefined)).toBe(ERROR_CODES.VALIDATION_INVALID_VALUE);
    });
});

describe('buildValidationParams', () => {
    /**
     * Numeric bounds and allowed-values lists are exposed; submitted values
     * are never echoed back.
     */
    test('exposes only documented context values', () => {
        expect(buildValidationParams({
            type: 'string.min',
            context: {limit: 8, value: 'secret attempt'},
        })).toEqual({limit: 8});

        expect(buildValidationParams({
            type: 'any.only',
            context: {valids: ['en', 'fr'], value: 'de'},
        })).toEqual({valids: 'en, fr'});
    });

    /**
     * A detail without relevant context yields null params.
     */
    test('returns null when no params apply', () => {
        expect(buildValidationParams({type: 'string.empty', context: {}})).toBeNull();
    });
});

describe('buildValidationError', () => {
    /**
     * The produced field error keeps `field`/`message` and adds `code`/`params`.
     */
    test('builds the contract-shaped field error', () => {
        const detail = {
            path: ['user', 'email'],
            type: 'string.email',
            message: '"user.email" must be a valid email',
            context: {value: 'not-an-email'},
        };

        expect(buildValidationError(detail)).toEqual({
            field: 'user.email',
            code: ERROR_CODES.VALIDATION_INVALID_FORMAT,
            message: '"user.email" must be a valid email',
            params: null,
        });
    });

    /**
     * Nested Joi paths are flattened into dot-separated field names.
     */
    test('flattens nested paths into dot notation', () => {
        expect(buildValidationError({
            path: ['items', 0, 'name'],
            type: 'any.required',
            message: 'required',
        }).field).toBe('items.0.name');
    });
});

describe('buildValidationErrors', () => {
    /**
     * A real Joi failure must produce one field error per detail.
     */
    test('maps every Joi detail to a field error', () => {
        const {error} = Joi.object({
            email: Joi.string().email().required(),
            age: Joi.number().min(18).required(),
        }).validate({age: 12}, {abortEarly: false});

        const fieldErrors = buildValidationErrors(error.details);
        expect(fieldErrors).toHaveLength(2);
        expect(fieldErrors.map((item) => item.field).sort()).toEqual(['age', 'email']);
        expect(fieldErrors.every((item) => typeof item.code === 'string')).toBe(true);
    });

    /**
     * Non-array details produce an empty array rather than throwing.
     */
    test('returns an empty array for non-array details', () => {
        expect(buildValidationErrors(undefined)).toEqual([]);
    });
});

describe('normalizeFieldErrors', () => {
    /**
     * Legacy field entries missing a code are normalised with a null code.
     */
    test('normalizes legacy field entries', () => {
        expect(normalizeFieldErrors([
            {field: 'email', message: 'email is required'},
        ])).toEqual([
            {field: 'email', code: null, message: 'email is required', params: null},
        ]);
    });

    /**
     * Unsafe nested params are sanitized at the boundary.
     */
    test('sanitizes field params at the boundary', () => {
        expect(normalizeFieldErrors([
            {field: 'name', code: 'VALIDATION_TOO_SHORT', message: 'too short', params: {limit: 3, nested: {}}},
        ])).toEqual([
            {field: 'name', code: 'VALIDATION_TOO_SHORT', message: 'too short', params: {limit: 3}},
        ]);
    });

    /**
     * Non-array inputs and empty arrays normalise to null.
     */
    test('returns null for non-array and empty inputs', () => {
        expect(normalizeFieldErrors(undefined)).toBeNull();
        expect(normalizeFieldErrors('nope')).toBeNull();
        expect(normalizeFieldErrors([])).toBeNull();
    });
});
