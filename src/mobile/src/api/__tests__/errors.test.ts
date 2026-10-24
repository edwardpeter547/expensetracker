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
});
