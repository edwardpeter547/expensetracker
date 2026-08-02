import { describe, expect, test } from '@jest/globals';
import { langSchema } from '../general.validation.js';


/**
 * Test suite for the language validation schema
 * 
 * The `langSchema` validates the `lang` query parameter used in requests.
 * It accepts only locales that are configured in i18n (en, fr).
 * The `lang` field is optional — omitting it is valid and will default
 * to the server's default locale.
 * 
 * @module general.validation.test
 */
describe('Language Validation - langSchema', () => {
    /**
     * Should accept a valid language code
     * 
     * Verifies that a supported locale like 'en' passes validation
     * and the value is correctly returned.
     */
    test('should accept a valid language code', () => {
        const { error, value } = langSchema.validate({lang: 'en'});
        expect(error).toBeUndefined();
        expect(value.lang).toBe('en');
    });

    /**
     * Should fail on invalid language code
     * 
     * Verifies that an unsupported locale like 'us' (not in en, es, fr)
     * is rejected by the schema with a validation error.
     */
    test('should fail on invalid language code', () => {
        const {error, value } = langSchema.validate({lang: 'us'});
        expect(error).toBeDefined();
    })

    /**
     * Should accept all valid locales
     * 
     * Verifies that every supported locale (en, fr) passes validation.
     * This ensures the schema stays in sync with the configured i18n locales.
     */
    test('should accept all valid locales', () => {
        const locales = ['en', 'fr'];
        locales.forEach(locale => {
            const {error, value} = langSchema.validate({lang: locale});
            expect(error).toBeUndefined();
        });
    });
})