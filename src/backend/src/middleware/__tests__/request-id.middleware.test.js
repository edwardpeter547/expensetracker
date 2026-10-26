/**
 * Unit tests for the correlation-id middleware.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const envConfigPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/env.config.js'
);

let trustProxyValue = false;

jest.unstable_mockModule(envConfigPath, () => ({
    default: {
        get trustProxy() {
            return trustProxyValue;
        },
    },
}));

const { correlationIdHandler } = await import('../request-id.middleware.js');

describe('correlationIdHandler', () => {
    beforeEach(() => {
        trustProxyValue = false;
    });

    /**
     * Without proxy trust the middleware must generate a fresh UUID and ignore
     * any client-supplied identifier.
     */
    test('generates a UUID and ignores the incoming id without proxy trust', () => {
        const request = {
            get: jest.fn(() => 'attacker-controlled'),
        };
        const setHeader = jest.fn();
        const next = jest.fn();

        correlationIdHandler(request, {setHeader}, next);

        expect(request.id).not.toBe('attacker-controlled');
        expect(request.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(setHeader).toHaveBeenCalledWith('X-Request-Id', request.id);
        expect(next).toHaveBeenCalled();
    });

    /**
     * With proxy trust enabled, a valid incoming id must be preserved and a
     * malformed one must be replaced with a generated UUID.
     */
    test('preserves only a validated incoming id when proxy trust is enabled', () => {
        trustProxyValue = 1;
        const setHeader = jest.fn();

        const validRequest = {get: jest.fn(() => 'abc.123-def'), setHeader};
        correlationIdHandler(validRequest, {setHeader}, jest.fn());
        expect(validRequest.id).toBe('abc.123-def');

        const invalidRequest = {get: jest.fn(() => 'bad id'), setHeader};
        correlationIdHandler(invalidRequest, {setHeader}, jest.fn());
        expect(invalidRequest.id).toMatch(/^[0-9a-f-]{36}$/);
    });
});
