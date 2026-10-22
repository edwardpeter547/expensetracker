/**
 * @file helpers.test.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Test suite for utility helper functions (generateTokens, getDirectory)
 *
 * Tests the helper functions used across the application including JWT token generation
 * and directory path resolution from module URLs.
 *
 * @module helpers.test
 */

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { generateTokens, getDirectory } from '../helpers.js';

/**
 * Token Generation Tests
 *
 * Tests the generateTokens function which creates an access token (JWT) and
 * a refresh token (random hex string) for user authentication. Verifies that
 * the tokens are correctly signed with the right payload and configuration.
 */
describe('Generate Tokens Test Suite - generateTokens', () => {

    const userId = '12345';
    const email = 'test@example.com';

    /**
     * Validates that generateTokens returns an object with both
     * accessToken and refreshToken properties.
     */
    test('returns an object with accessToken and refreshToken', () => {
        const tokens = generateTokens(userId, email);

        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
    });

    /**
     * Validates that the access token is a non-empty string
     * containing JWT-encoded data.
     */
    test('accessToken is a valid JWT string', () => {
        const tokens = generateTokens(userId, email);

        expect(typeof tokens.accessToken).toBe('string');
        expect(tokens.accessToken.length).toBeGreaterThan(0);
        // JWT has three parts separated by dots
        expect(tokens.accessToken.split('.')).toHaveLength(3);
    });

    /**
     * Validates that the refresh token is a 40-byte hex string,
     * meaning it should be 80 characters long.
     */
    test('refreshToken is an 80-character hex string', () => {
        const tokens = generateTokens(userId, email);

        expect(typeof tokens.refreshToken).toBe('string');
        expect(tokens.refreshToken).toHaveLength(80);
        expect(tokens.refreshToken).toMatch(/^[0-9a-f]+$/);
    });

    /**
     * Validates that the access token contains the correct userId
     * and email in its payload when decoded.
     */
    test('accessToken contains userId and email in payload', () => {
        const tokens = generateTokens(userId, email);
        const decoded = jwt.decode(tokens.accessToken);

        expect(decoded).toHaveProperty('userId', userId);
        expect(decoded).toHaveProperty('email', email);
    });

    /**
     * Validates that calling generateTokens twice produces
     * different refresh tokens (crypto.randomBytes ensures randomness).
     */
    test('each call produces unique refresh tokens', () => {
        const tokens1 = generateTokens(userId, email);
        const tokens2 = generateTokens(userId, email);

        expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    /**
     * Validates that different user IDs produce valid tokens
     * regardless of the input value.
     */
    test('works with different userId values', () => {
        const tokens = generateTokens(999, 'admin@test.com');
        const decoded = jwt.decode(tokens.accessToken);

        expect(decoded.userId).toBe(999);
        expect(decoded.email).toBe('admin@test.com');
    });
});


/**
 * Directory Resolution Tests
 *
 * Tests the getDirectory function which converts a file URL (import.meta.url)
 * to an absolute directory path. This is used as a cross-platform replacement
 * for __dirname in ES modules.
 */
describe('getDirectory', () => {

    /**
     * Validates that getDirectory returns a string when given
     * a valid import.meta.url value.
     */
    test('returns a string for a valid file URL', () => {
        const dir = getDirectory(import.meta.url);

        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
    });

    /**
     * Validates that getDirectory returns the directory containing
     * the test file, not the file itself.
     */
    test('returns the directory path, not the file path', () => {
        const dir = getDirectory(import.meta.url);

        // Should not end with the filename
        expect(dir).not.toMatch(/helpers\.test\.js$/);
        // Should be a valid absolute path
        expect(dir).toMatch(/^\//);
    });

    /**
     * Validates that the returned path exists as a directory
     * on the file system.
     */
    test('returns an existing directory on the file system', () => {
        const dir = getDirectory(import.meta.url);

        expect(fs.existsSync(dir)).toBe(true);
        expect(fs.statSync(dir).isDirectory()).toBe(true);
    });

    /**
     * Validates that getDirectory resolves correctly for files
     * in different locations within the project.
     */
    test('resolves directory for a different module path', () => {
        const dir = getDirectory('file:///home/user/project/src/utils/helper.js');

        expect(dir).toBe('/home/user/project/src/utils');
    });
});
