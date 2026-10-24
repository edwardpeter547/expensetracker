import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveInitialPreferences, resolveInitialCurrency, selectSupportedLanguage } from '../detect.ts';

describe('language detection', () => {
    test('selects the first supported preferred language', () => {
        assert.equal(
            selectSupportedLanguage(['de-DE', 'fr-FR', 'en-US'], ['en', 'fr'], 'en'),
            'fr',
        );
    });

    test('falls back when no preferred language is supported', () => {
        assert.equal(
            selectSupportedLanguage(['ja-JP', 'de-DE'], ['en', 'fr'], 'en'),
            'en',
        );
    });

    test('handles a base language differing from region', () => {
        const result = resolveInitialPreferences({
            preferredLanguages: ['en-GB'],
            regionCode: 'GB',
            currencyCode: null,
        });

        assert.equal(result.language, 'en');
        assert.equal(result.currency, 'GBP');
    });
});

describe('currency detection', () => {
    const cases = [
        ['en-GB', 'GB', null, 'GBP'],
        ['en-US', 'US', null, 'USD'],
        ['en-NG', 'NG', null, 'NGN'],
        ['fr-FR', 'FR', null, 'EUR'],
        ['fr-CA', 'CA', null, 'CAD'],
        ['ja-JP', 'JP', null, 'JPY'],
    ] as const;

    for (const [language, region, currency, expected] of cases) {
        test(`${language} resolves to ${expected}`, () => {
            assert.equal(
                resolveInitialCurrency({
                    preferredLanguages: [language],
                    regionCode: region,
                    currencyCode: currency,
                }),
                expected,
            );
        });
    }

    test('uses device currencyCode before region mapping', () => {
        assert.equal(
            resolveInitialCurrency({
                preferredLanguages: ['en-GB'],
                regionCode: 'GB',
                currencyCode: 'EUR',
            }),
            'EUR',
        );
    });

    test('falls back for an unknown region', () => {
        assert.equal(
            resolveInitialCurrency({
                preferredLanguages: ['en'],
                regionCode: 'ZZ',
                currencyCode: null,
            }),
            'USD',
        );
    });
});
