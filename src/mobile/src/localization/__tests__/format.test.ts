import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    decimalSeparatorForLocale,
    formatMoney,
    parseMoneyInput,
    resolveMoneyLocale,
    splitFormattedMoney,
} from '../format.ts';

describe('resolveMoneyLocale', () => {
    test('combines the translation language with the device region', () => {
        assert.equal(resolveMoneyLocale('fr', 'CA'), 'fr-CA');
        assert.equal(resolveMoneyLocale('en', 'GB'), 'en-GB');
    });

    test('preserves an existing region on the language', () => {
        assert.equal(resolveMoneyLocale('fr-FR', null), 'fr-FR');
        assert.equal(resolveMoneyLocale('EN-us', null), 'en-US');
    });

    test('falls back to the base language for missing or invalid regions', () => {
        assert.equal(resolveMoneyLocale('fr', null), 'fr');
        assert.equal(resolveMoneyLocale('fr', 'not-a-region'), 'fr');
        assert.equal(resolveMoneyLocale('', null), 'en');
    });
});

describe('parseMoneyInput', () => {
    test('parses a locale decimal comma into a canonical string', () => {
        assert.equal(parseMoneyInput('1.234,56', 'fr-FR'), '1234.56');
    });

    test('parses a locale decimal point', () => {
        assert.equal(parseMoneyInput('1,234.56', 'en-US'), '1234.56');
    });

    test('parses an integer without separators', () => {
        assert.equal(parseMoneyInput('42', 'en-US'), '42');
    });

    test('rejects more than two decimal places', () => {
        assert.equal(parseMoneyInput('1.234', 'en-US'), '');
    });

    test('preserves up to four decimal places without floating point', () => {
        assert.equal(parseMoneyInput('12.3456', 'en', 4), '12.3456');
        assert.equal(parseMoneyInput('1.2345', 'en', 4), '1.2345');
    });

    test('interprets separators from the region rather than the language alone', () => {
        assert.equal(parseMoneyInput('1.234,56', 'fr', 2, 'CA'), '1234.56');
        assert.equal(parseMoneyInput('1,234.56', 'en', 2, 'GB'), '1234.56');
    });

    test('rejects non-numeric input', () => {
        assert.equal(parseMoneyInput('abc', 'en-US'), '');
    });
});

describe('formatMoney', () => {
    test('uses the language for separators and the currency for the symbol', () => {
        const eurosFrance = formatMoney('1234.5', 'fr', 'EUR', 1);
        const dollarsUs = formatMoney('1234.5', 'en', 'USD', 1);

        assert.equal(eurosFrance.includes(','), true);
        assert.equal(eurosFrance.includes('€'), true);
        assert.equal(dollarsUs.includes('.'), true);
        assert.equal(dollarsUs.includes('$'), true);
    });

    test('keeps currency independent of the selected language', () => {
        const eurosInEnglish = formatMoney('100', 'en', 'EUR', 0);
        const dollarsInFrench = formatMoney('100', 'fr', 'USD', 0);

        assert.equal(eurosInEnglish.includes('€'), true);
        assert.equal(dollarsInFrench.includes('$'), true);
    });

    test('uses a clean currency symbol instead of a code-prefixed one', () => {
        const dollarsEnglish = formatMoney('1234.5', 'en', 'USD', 2);
        const dollarsFrench = formatMoney('1234.5', 'fr', 'USD', 2);

        assert.equal(dollarsEnglish.includes('US$'), false);
        assert.equal(dollarsEnglish.includes('$'), true);
        assert.equal(dollarsFrench.includes('US$'), false);
        assert.equal(dollarsFrench.includes('$'), true);
    });

    test('uses the naira glyph instead of the NGN code', () => {
        const naira = formatMoney('1234.5', 'en', 'NGN', 2);

        assert.equal(naira.includes('NGN'), false);
        assert.equal(naira.includes('₦'), true);
    });
});

describe('decimalSeparatorForLocale', () => {
    test('returns comma for fr-FR and point for en-US', () => {
        assert.equal(decimalSeparatorForLocale('fr-FR'), ',');
        assert.equal(decimalSeparatorForLocale('en-US'), '.');
    });
});

describe('splitFormattedMoney', () => {
    test('splits an English pound amount around the decimal point', () => {
        const parts = splitFormattedMoney('2180.5', 'en', 'GBP');

        assert.equal(parts.prefix, '£2,180');
        assert.equal(parts.fraction, '.50');
        assert.equal(parts.suffix, '');
    });

    test('pads trailing zeroes to two decimal places', () => {
        const parts = splitFormattedMoney('42', 'en', 'USD');

        assert.equal(parts.prefix, '$42');
        assert.equal(parts.fraction, '.00');
        assert.equal(parts.suffix, '');
    });

    test('keeps a postfixed currency symbol in the suffix for French', () => {
        const parts = splitFormattedMoney('2180.5', 'fr', 'EUR');

        assert.equal(parts.fraction, ',50');
        assert.equal(parts.suffix.endsWith('€'), true);
        assert.equal(parts.prefix.startsWith('2'), true);
    });

    test('uses the naira glyph in the split prefix for Nigerian Naira', () => {
        const parts = splitFormattedMoney('1234.5', 'en', 'NGN');

        assert.equal(parts.prefix.startsWith('₦'), true);
        assert.equal(parts.fraction, '.50');
    });
});
