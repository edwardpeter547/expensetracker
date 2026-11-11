/**
 * Tests for the API error-code to translation resolver.
 *
 * The resolver is the integration point for the future `i18next` runtime, so
 * tests inject a translator function and verify key selection, interpolation,
 * language switching, fallback behaviour, and legacy payload compatibility.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    apiErrorTranslationKey,
    isKnownApiErrorCode,
    normalizeApiError,
    translateApiError,
} from '../errors.ts';

/**
 * Build a deterministic translator stub keyed by language.
 *
 * @param {string} language The simulated application language.
 * @returns {import('../errors.ts').ErrorTranslator} A translator stub.
 */
const makeTranslator = (language: string) => {
    return (key: string, options?: Record<string, unknown> & { defaultValue?: string }) => {
        if (key === 'budget.limitExceeded') {
            const limit = options?.limit;
            return language === 'fr'
                ? `Budget de ${limit} dépassé`
                : `Budget limit of ${limit} exceeded`;
        }
        if (key === 'validation.tooShort') {
            return language === 'fr'
                ? `Au moins ${options?.limit} caractères`
                : `At least ${options?.limit} characters`;
        }
        return `${language}:${key}`;
    };
};

/**
 * A translator that never produces a value, mimicking a missing catalogue key.
 *
 * @returns {undefined} Always undefined.
 */
const missingTranslator = () => undefined;

describe('error-code catalogue', () => {
    test('recognizes registered codes and returns stable translation keys', () => {
        assert.equal(isKnownApiErrorCode('VALIDATION_ERROR'), true);
        assert.equal(isKnownApiErrorCode('NOT_A_CODE'), false);
        assert.equal(apiErrorTranslationKey('VALIDATION_ERROR'), 'validationError');
        assert.equal(apiErrorTranslationKey('NOT_A_CODE'), null);
        assert.equal(apiErrorTranslationKey(undefined), null);
    });
});

describe('translateApiError', () => {
    test('translates a known code with interpolation in the selected language', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    code: 'BUDGET_LIMIT_EXCEEDED',
                    message: 'Budget limit exceeded',
                    params: {limit: '500.00'},
                },
            },
        });

        assert.equal(translateApiError(error, makeTranslator('en')).message, 'Budget limit of 500.00 exceeded');
        assert.equal(translateApiError(error, makeTranslator('fr')).message, 'Budget de 500.00 dépassé');
    });

    test('does not leak raw server prose when a known code is present', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    code: 'BUDGET_LIMIT_EXCEEDED',
                    message: 'Internal threshold 0x7f3a exceeded',
                    params: {limit: '500.00'},
                },
            },
        });

        const result = translateApiError(error, missingTranslator);
        assert.equal(result.message, 'Something went wrong. Please try again.');
    });

    test('falls back to the legacy server message for an unknown code', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {status: 409, data: {code: 'FUTURE_CODE', message: 'Unmapped problem'}},
        });

        assert.equal(translateApiError(error, makeTranslator('en')).message, 'Unmapped problem');
    });

    test('falls back to the legacy server message when no code is present', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {status: 409, data: {message: 'Already exists'}},
        });

        assert.equal(translateApiError(error, makeTranslator('fr')).message, 'Already exists');
    });

    test('falls back to the generic message for an empty legacy payload', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {status: 409, data: {}},
        });

        assert.equal(translateApiError(error, makeTranslator('en')).message, 'Something went wrong. Please try again.');
    });

    test('translates field-level validation errors independently', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    errors: [
                        {field: 'name', code: 'VALIDATION_TOO_SHORT', message: 'too short', params: {limit: 3}},
                    ],
                },
            },
        });

        const result = translateApiError(error, makeTranslator('en'));
        assert.equal(result.fieldErrors[0].field, 'name');
        assert.equal(result.fieldErrors[0].message, 'At least 3 characters');
    });

    test('keeps network-error messages safe without a server code', () => {
        const error = normalizeApiError({isAxiosError: true, message: 'Network Error'});

        const result = translateApiError(error, makeTranslator('en'));
        assert.match(result.message, /Could not reach the server/);
    });
});
