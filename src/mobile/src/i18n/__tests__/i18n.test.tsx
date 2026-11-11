/**
 * Integration tests for the mobile i18next bootstrap.
 *
 * The suite verifies interpolation, pluralisation, runtime language
 * switching, the bundled English fallback, and the bridge from the API
 * error-code catalogue to the `errors` namespace.
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import { normalizeApiError, translateApiError } from '@/api/errors';
import { createErrorTranslator } from '../error-translator';
import i18n from '../index';

afterEach(async () => {
    await i18n.changeLanguage('en');
});

describe('i18next bootstrap', () => {
    /**
     * Interpolation must replace placeholders from the current language.
     */
    test('interpolates values in the default namespace', () => {
        expect(i18n.t('greeting', {name: 'Ada'})).toBe('Hello, Ada');
    });

    /**
     * Pluralisation must select the one/other suffix from the catalogue.
     */
    test('pluralises using the catalogue suffixes', () => {
        expect(i18n.t('items', {count: 1})).toBe('1 item');
        expect(i18n.t('items', {count: 3})).toBe('3 items');
    });

    /**
     * Switching language at runtime must re-render catalogue lookups without
     * a restart.
     */
    test('switches languages at runtime', async () => {
        expect(i18n.t('greeting', {name: 'Ada'})).toBe('Hello, Ada');

        await i18n.changeLanguage('fr');

        expect(i18n.t('greeting', {name: 'Ada'})).toBe('Bonjour, Ada');
        expect(i18n.t('items', {count: 2})).toBe('2 éléments');
    });

    /**
     * Resources must be bundled offline and fall back to English when a key
     * is unavailable.
     */
    test('bundles resources offline with an English fallback', () => {
        expect(i18n.hasResourceBundle('en', 'common')).toBe(true);
        expect(i18n.hasResourceBundle('fr', 'errors')).toBe(true);
        expect(i18n.options.fallbackLng).toEqual(['en']);
        expect(i18n.t('missing.key', {defaultValue: 'Fallback EN'})).toBe('Fallback EN');
    });
});

describe('API error translation integration', () => {
    /**
     * A known server code must render from the `errors` namespace in the
     * requested language.
     */
    test('translates a known code into the selected language', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 404,
                data: {code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found'},
            },
        });

        expect(translateApiError(error, createErrorTranslator('en')).message)
            .toBe('Transaction not found');
        expect(translateApiError(error, createErrorTranslator('fr')).message)
            .toBe('Transaction introuvable');
    });

    /**
     * Field-level validation errors must localise with safe interpolation.
     */
    test('localises field validation errors with interpolation', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    errors: [
                        {
                            field: 'name',
                            code: 'VALIDATION_TOO_SHORT',
                            message: 'too short',
                            params: {limit: 3},
                        },
                    ],
                },
            },
        });

        const result = translateApiError(error, createErrorTranslator('fr'));

        expect(result.fieldErrors[0].message).toBe('Doit contenir au moins 3 caractères');
    });

    /**
     * An unknown code keeps the legacy server message as the fallback.
     */
    test('falls back for unknown codes', () => {
        const error = normalizeApiError({
            isAxiosError: true,
            response: {status: 409, data: {code: 'FUTURE_CODE', message: 'Unmapped problem'}},
        });

        expect(translateApiError(error, createErrorTranslator('en')).message)
            .toBe('Unmapped problem');
    });
});
