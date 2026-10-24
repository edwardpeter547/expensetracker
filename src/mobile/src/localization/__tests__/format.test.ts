import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decimalSeparatorForLocale, parseMoneyInput } from '../format.ts';

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

    test('rejects non-numeric input', () => {
        assert.equal(parseMoneyInput('abc', 'en-US'), '');
    });
});

describe('decimalSeparatorForLocale', () => {
    test('returns comma for fr-FR and point for en-US', () => {
        assert.equal(decimalSeparatorForLocale('fr-FR'), ',');
        assert.equal(decimalSeparatorForLocale('en-US'), '.');
    });
});
