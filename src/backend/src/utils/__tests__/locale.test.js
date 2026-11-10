import { describe, expect, test } from '@jest/globals';
import {
    baseLanguageOf,
    negotiateAcceptLanguage,
    resolveRequestLocale,
} from '../locale.js';

describe('baseLanguageOf', () => {
    /**
     * Regional and uppercase tags must reduce to their lowercase base language.
     */
    test('normalizes regional and uppercase tags', () => {
        expect(baseLanguageOf('fr-CA')).toBe('fr');
        expect(baseLanguageOf('EN-us')).toBe('en');
    });

    /**
     * Empty, wildcard, and non-string values are treated as absent.
     */
    test('rejects empty, malformed and wildcard values', () => {
        expect(baseLanguageOf('')).toBe('');
        expect(baseLanguageOf('*')).toBe('');
        expect(baseLanguageOf(undefined)).toBe('');
        expect(baseLanguageOf(null)).toBe('');
    });
});

describe('negotiateAcceptLanguage', () => {
    /**
     * Quality weights order the result and q=0 languages are excluded.
     */
    test('applies quality weights and ignores q=0', () => {
        expect(negotiateAcceptLanguage('fr;q=0, en;q=0.5')).toBe('en');
    });

    /**
     * Regional tags resolve to their supported base language.
     */
    test('resolves regional tags to their base language', () => {
        expect(negotiateAcceptLanguage('fr-CA, fr;q=0.9, en;q=0.7')).toBe('fr');
    });

    /**
     * An unsupported language negotiates to null rather than defaulting.
     */
    test('returns null for an unsupported language', () => {
        expect(negotiateAcceptLanguage('de-DE')).toBeNull();
    });

    /**
     * An empty or missing header negotiates to null.
     */
    test('returns null for an empty or missing header', () => {
        expect(negotiateAcceptLanguage('')).toBeNull();
        expect(negotiateAcceptLanguage(undefined)).toBeNull();
    });
});

describe('resolveRequestLocale', () => {
    /**
     * A stored authenticated preference wins over headers and query.
     */
    test('prefers the authenticated user language', () => {
        expect(resolveRequestLocale({ userLanguage: 'fr', acceptLanguage: 'en' })).toBe('fr');
    });

    /**
     * Regional, weighted headers are negotiated before the query parameter.
     */
    test('negotiates regional and weighted headers before the query', () => {
        expect(resolveRequestLocale({
            acceptLanguage: 'fr-CA, fr;q=0.9, en;q=0.7',
            langQuery: 'en',
        })).toBe('fr');
    });

    /**
     * An unsupported header falls through to a supported query value.
     */
    test('falls back to the query when the header is unsupported', () => {
        expect(resolveRequestLocale({ acceptLanguage: 'de-DE', langQuery: 'fr' })).toBe('fr');
    });

    /**
     * English is returned when every input is unsupported.
     */
    test('falls back to English when all inputs are unsupported', () => {
        expect(resolveRequestLocale({ acceptLanguage: 'de-DE', langQuery: 'es' })).toBe('en');
    });

    /**
     * A q=0 header language is ignored and the English fallback applies.
     */
    test('ignores q=0 header languages and falls back', () => {
        expect(resolveRequestLocale({ acceptLanguage: 'fr;q=0' })).toBe('en');
    });

    /**
     * The default English fallback applies when no inputs are provided.
     */
    test('returns English when no inputs are provided', () => {
        expect(resolveRequestLocale({})).toBe('en');
    });
});
