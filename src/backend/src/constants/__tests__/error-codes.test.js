/**
 * Tests for the stable API error-code registry and its shared contract.
 *
 * The registry is the backend single source of truth for machine-readable
 * error identifiers. These tests pin the identifier format, the status-based
 * default resolution, and the cross-platform agreement with the mobile
 * error-code catalogue in `src/mobile/src/api/errors.ts`.
 */

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    ERROR_CODES,
    defaultErrorCodeForStatus,
    isKnownErrorCode,
} from '../error-codes.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Locate the repository root by walking up until the mobile catalogue exists.
 *
 * The backend suite can run from a package-only checkout (for example a
 * container whose filesystem root is the backend `src` tree), so a fixed
 * number of `..` segments is not portable. The search stops at the filesystem
 * root and returns null when the mobile package is not present.
 *
 * @returns {string|null} The absolute mobile catalogue path, or null.
 */
const findMobileCatalogue = () => {
    let directory = testDirectory;

    while (true) {
        const candidate = path.join(directory, 'src', 'mobile', 'src', 'api', 'errors.ts');
        if (fs.existsSync(candidate)) return candidate;

        const parent = path.dirname(directory);
        if (parent === directory) return null;
        directory = parent;
    }
};

const mobileCataloguePath = findMobileCatalogue();

/**
 * Extract the declared error-code keys from the mobile catalogue source.
 *
 * The mobile catalogue keeps exactly one code per line in the
 * `API_ERROR_TRANSLATION_KEYS` object, so a line-anchored key pattern is the
 * contract surface this test relies on.
 *
 * @returns {string[]} The sorted mobile error-code identifiers.
 */
const readMobileErrorCodes = () => {
    const source = fs.readFileSync(mobileCataloguePath, 'utf8');
    const keyPattern = /^\s*'([A-Z][A-Z0-9_]*)':/gm;
    const codes = [];
    let match;
    while ((match = keyPattern.exec(source)) !== null) {
        codes.push(match[1]);
    }
    return codes.sort();
};

describe('error-code registry', () => {
    /**
     * Every registered identifier must be UPPER_SNAKE_CASE and unique so
     * consumers can treat codes as stable, sortable, case-sensitive strings.
     */
    test('declares unique UPPER_SNAKE_CASE identifiers', () => {
        const values = Object.values(ERROR_CODES);
        const seen = new Set();

        for (const code of values) {
            expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
            expect(seen.has(code)).toBe(false);
            seen.add(code);
        }
    });

    /**
     * Status-based defaults must return deterministic generic codes for the
     * HTTP statuses the middleware can encounter.
     */
    test('resolves a deterministic default code for every status', () => {
        expect(defaultErrorCodeForStatus(400)).toBe(ERROR_CODES.BAD_REQUEST);
        expect(defaultErrorCodeForStatus(401)).toBe(ERROR_CODES.UNAUTHORIZED);
        expect(defaultErrorCodeForStatus(403)).toBe(ERROR_CODES.FORBIDDEN);
        expect(defaultErrorCodeForStatus(404)).toBe(ERROR_CODES.NOT_FOUND);
        expect(defaultErrorCodeForStatus(409)).toBe(ERROR_CODES.CONFLICT);
        expect(defaultErrorCodeForStatus(413)).toBe(ERROR_CODES.PAYLOAD_TOO_LARGE);
        expect(defaultErrorCodeForStatus(415)).toBe(ERROR_CODES.UNSUPPORTED_MEDIA_TYPE);
        expect(defaultErrorCodeForStatus(429)).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
        expect(defaultErrorCodeForStatus(503)).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
        expect(defaultErrorCodeForStatus(500)).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
        expect(defaultErrorCodeForStatus(undefined)).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    /**
     * The membership helper must only accept registered code strings.
     */
    test('recognizes only registered code strings', () => {
        expect(isKnownErrorCode(ERROR_CODES.NOT_FOUND)).toBe(true);
        expect(isKnownErrorCode('NOT_A_REAL_CODE')).toBe(false);
        expect(isKnownErrorCode(undefined)).toBe(false);
        expect(isKnownErrorCode(404)).toBe(false);
    });
});

const contractDescribe = mobileCataloguePath ? describe : describe.skip;

contractDescribe('cross-platform error-code contract', () => {
    /**
     * The backend registry and the mobile catalogue must list exactly the same
     * identifiers so a code emitted by the API can always be mapped by the
     * client, and every client mapping has a corresponding server definition.
     */
    test('mobile catalogue mirrors the backend registry exactly', () => {
        const backendCodes = Object.values(ERROR_CODES).sort();
        const mobileCodes = readMobileErrorCodes();

        expect(mobileCodes).toEqual(backendCodes);
    });
});
