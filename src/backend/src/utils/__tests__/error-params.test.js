/**
 * Tests for interpolation-parameter sanitization on the error envelope.
 *
 * These tests verify that only bounded, JSON-serialisable primitives reach the
 * response boundary and that nested, non-finite, oversized, or oddly keyed
 * values are dropped rather than serialised.
 */

import { describe, expect, test } from '@jest/globals';
import { sanitizeErrorParams } from '../error-params.js';

describe('sanitizeErrorParams', () => {
    /**
     * Absent and non-plain-object inputs normalise to null.
     */
    test('returns null for absent and non-object inputs', () => {
        expect(sanitizeErrorParams(null)).toBeNull();
        expect(sanitizeErrorParams(undefined)).toBeNull();
        expect(sanitizeErrorParams(['limit'])).toBeNull();
        expect(sanitizeErrorParams('limit')).toBeNull();
    });

    /**
     * Safe primitive values are retained as-is.
     */
    test('keeps finite primitives with valid keys', () => {
        expect(sanitizeErrorParams({
            limit: '500.00',
            currency: 'GBP',
            attempts: 3,
            active: true,
            note: null,
        })).toEqual({
            limit: '500.00',
            currency: 'GBP',
            attempts: 3,
            active: true,
            note: null,
        });
    });

    /**
     * Objects, arrays, functions, symbols, and non-finite numbers must never
     * be serialised onto the envelope.
     */
    test('drops non-serialisable and non-finite values', () => {
        expect(sanitizeErrorParams({
            nested: {a: 1},
            list: [1, 2],
            run: () => {},
            symbol: Symbol('x'),
            nan: Number.NaN,
            infinity: Number.POSITIVE_INFINITY,
            keep: 'yes',
        })).toEqual({keep: 'yes'});
    });

    /**
     * Oversized string values are truncated and malformed keys are skipped.
     */
    test('bounds string length and rejects malformed keys', () => {
        const long = 'a'.repeat(500);
        expect(sanitizeErrorParams({
            long,
            'bad-key!': 'x',
            ok: 'fine',
        })).toEqual({
            long: 'a'.repeat(200),
            ok: 'fine',
        });
    });

    /**
     * An object with no retained values collapses to null.
     */
    test('returns null when every entry is rejected', () => {
        expect(sanitizeErrorParams({run: () => {}, nested: {}})).toBeNull();
    });

    /**
     * The retained entry count is bounded to the configured maximum.
     */
    test('caps the number of retained entries', () => {
        const params = {};
        for (let index = 0; index < 25; index += 1) {
            params[`key${index}`] = index;
        }

        const sanitized = sanitizeErrorParams(params);
        expect(Object.keys(sanitized).length).toBe(20);
    });
});
