/**
 * Regression tests for backend translation catalogue hygiene.
 *
 * These tests pin the fixes for the audit findings BK-07 and BK-08:
 *
 * - `RESPONSE_LOGOUT_SUCCESSFUL` and `VERIFICATION_COMPLETE_EMAIL_SUBJECT`
 *   must exist in both the English and French source catalogues.
 * - The generated `src/locales/*.json` files must mirror the translation
 *   sources exactly, so orphaned artefacts such as the former `og.json`
 *   cannot reappear.
 */

import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(testDirectory, '../../..');
const translationsDirectory = path.join(backendRoot, 'translations');
const localesDirectory = path.join(backendRoot, 'src', 'locales');

/**
 * Import an authored translation source module by language code.
 *
 * @param {string} language The language code such as `en` or `fr`.
 * @returns {Promise<object>} The default-exported translation catalogue.
 */
const loadTranslationSource = async (language) => {
    const sourceUrl = pathToFileURL(path.join(translationsDirectory, `${language}.js`)).href;
    const module = await import(sourceUrl);
    return module.default;
};

/**
 * Read and parse a generated locale JSON file by language code.
 *
 * @param {string} language The language code such as `en` or `fr`.
 * @returns {object} The parsed generated catalogue.
 */
const loadGeneratedLocale = (language) => {
    const filePath = path.join(localesDirectory, `${language}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const english = await loadTranslationSource('en');
const french = await loadTranslationSource('fr');
const englishGenerated = loadGeneratedLocale('en');
const frenchGenerated = loadGeneratedLocale('fr');

const referencedKeys = [
    'RESPONSE_LOGOUT_SUCCESSFUL',
    'VERIFICATION_COMPLETE_EMAIL_SUBJECT',
];

describe('translation catalogue completeness', () => {
    /**
     * Both audit-identified keys must be authored with non-empty values in
     * the English and French source catalogues.
     */
    test('defines every referenced key in both source catalogues', () => {
        for (const key of referencedKeys) {
            for (const catalogue of [english, french]) {
                expect(catalogue[key]).toEqual(expect.any(String));
                expect(catalogue[key].trim().length).toBeGreaterThan(0);
            }
        }
    });

    /**
     * Regeneration must materialise the same keys into the generated locale
     * JSON files consumed by `i18n-node`.
     */
    test('generates every referenced key into the locale JSON catalogues', () => {
        for (const key of referencedKeys) {
            expect(englishGenerated[key]).toEqual(expect.any(String));
            expect(frenchGenerated[key]).toEqual(expect.any(String));
            expect(englishGenerated[key].trim().length).toBeGreaterThan(0);
            expect(frenchGenerated[key].trim().length).toBeGreaterThan(0);
        }
    });
});

describe('generated locale artefact hygiene', () => {
    /**
     * The locales directory must contain exactly one generated JSON file per
     * translation source. Any orphan (such as the former `og.json`) makes the
     * two sets diverge and must fail this regression check.
     */
    test('generated locale files mirror the translation sources exactly', () => {
        const sourceLanguages = fs.readdirSync(translationsDirectory)
            .filter((fileName) => fileName.endsWith('.js'))
            .map((fileName) => path.basename(fileName, '.js'))
            .sort();
        const generatedLanguages = fs.readdirSync(localesDirectory)
            .filter((fileName) => fileName.endsWith('.json'))
            .map((fileName) => path.basename(fileName, '.json'))
            .sort();

        expect(generatedLanguages).toEqual(sourceLanguages);
        expect(fs.existsSync(path.join(localesDirectory, 'og.json'))).toBe(false);
    });
});
