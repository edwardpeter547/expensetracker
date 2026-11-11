import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { normalizeApiError } from '../errors.ts';

describe('normalizeApiError', () => {
    test('classifies a connection failure as network', () => {
        const error = normalizeApiError({ isAxiosError: true, message: 'Network Error' });

        assert.equal(error.kind, 'network');
        assert.match(error.message, /Could not reach the server/);
    });

    test('classifies a timeout', () => {
        const error = normalizeApiError({ isAxiosError: true, code: 'ECONNABORTED' });

        assert.equal(error.kind, 'timeout');
        assert.match(error.message, /too long to respond/);
    });

    test('classifies a 401 as unauthorized and reads the server message', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: { status: 401, data: { message: 'Session expired' } },
        });

        assert.equal(error.kind, 'unauthorized');
        assert.equal(error.message, 'Session expired');
        assert.equal(error.status, 401);
    });

    test('classifies a 500 as a server error without leaking details', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: { status: 500, data: { message: 'boom' } },
        });

        assert.equal(error.kind, 'server');
        assert.match(error.message, /server encountered an error/);
    });

    test('classifies a 400 as validation', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: { status: 400, data: { message: 'Bad input' } },
        });

        assert.equal(error.kind, 'validation');
        assert.equal(error.message, 'Bad input');
    });

    test('extracts the stable code and its translation key', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 409,
                data: {code: 'BUDGET_LIMIT_EXCEEDED', message: 'Budget limit exceeded'},
            },
        });

        assert.equal(error.code, 'BUDGET_LIMIT_EXCEEDED');
        assert.equal(error.translationKey, 'budget.limitExceeded');
    });

    test('preserves field-level validation errors with sanitized params', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    errors: [
                        {field: 'name', code: 'VALIDATION_TOO_SHORT', message: 'too short', params: {limit: 3, nested: {}}},
                    ],
                },
            },
        });

        assert.equal(error.kind, 'validation');
        assert.equal(error.fieldErrors?.length, 1);
        assert.equal(error.fieldErrors?.[0].field, 'name');
        assert.equal(error.fieldErrors?.[0].translationKey, 'validation.tooShort');
        assert.deepEqual(error.fieldErrors?.[0].params, {limit: 3});
    });

    test('treats unknown codes as unmapped without losing the raw code', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 409,
                data: {code: 'FUTURE_CODE', message: 'Unmapped problem'},
            },
        });

        assert.equal(error.code, 'FUTURE_CODE');
        assert.equal(error.translationKey, null);
    });

    test('handles legacy payloads without code or field errors', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {status: 409, data: {message: 'Already exists'}},
        });

        assert.equal(error.code, undefined);
        assert.equal(error.translationKey, null);
        assert.equal(error.fieldErrors, undefined);
        assert.equal(error.message, 'Already exists');
    });
});
