/**
 * Unit tests for startup configuration validation.
 *
 * These tests verify that the configuration module fails fast when JWT_SECRET
 * is missing or empty and loads normally when a secret is present.
 */
import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

const originalSecret = process.env.JWT_SECRET;

describe('env.config JWT_SECRET validation', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterAll(() => {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    });

    test('rejects an empty JWT_SECRET at import time', async () => {
        process.env.JWT_SECRET = '';

        await expect(import('../env.config.js')).rejects.toThrow(
            'JWT_SECRET must be set to a non-empty value'
        );
    });

    test('loads normally when JWT_SECRET is present', async () => {
        process.env.JWT_SECRET = 'test-secret';

        const Config = (await import('../env.config.js')).default;

        expect(Config.jwtSecret).toBe('test-secret');
    });
});
