import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../../constants/localization.js';
import { langHandler } from '../lang.middleware.js';

/**
 * Language middleware test suite.
 *
 * Covers the documented request-locale precedence and graceful fallback.
 */
describe('Test Language Middleware - langHandler', () => {
    /**
     * Build a minimal request with headers, query and an optional user.
     *
     * @param {object} [headers] Request headers.
     * @param {object} [query] Request query parameters.
     * @param {object} [user] Authenticated principal, when present.
     * @returns {object} A request double with a mocked `setLocale`.
     */
    const mockRequest = (headers = {}, query = {}, user) => ({
        headers,
        query,
        ...(user ? { user } : {}),
        setLocale: jest.fn(),
    });
    const mockResponse = () => ({});
    const mockNext = jest.fn();

    beforeEach(() => {
        mockNext.mockClear();
    });

    /**
     * A valid accept-language header selects that locale.
     */
    test('sets the locale from a valid accept-language header', () => {
        const request = mockRequest({ 'accept-language': 'en' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('en');
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    /**
     * Every configured language can be selected from the header.
     */
    test('sets the locale for every configured language', () => {
        SUPPORTED_LANGUAGES.forEach((locale) => {
            const request = mockRequest({ 'accept-language': locale });

            langHandler(request, mockResponse(), mockNext);

            expect(request.setLocale).toHaveBeenCalledWith(locale);
        });

        expect(mockNext).toHaveBeenCalledTimes(SUPPORTED_LANGUAGES.length);
    });

    /**
     * An unsupported header falls back to the default locale instead of erroring.
     */
    test('falls back to the default locale for an unsupported header', () => {
        const request = mockRequest({ 'accept-language': 'soo-gho' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    /**
     * A weighted regional header resolves to its supported base language.
     */
    test('resolves a weighted regional header to its base language', () => {
        const request = mockRequest({ 'accept-language': 'fr-CA, fr;q=0.9, en;q=0.7' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('fr');
    });

    /**
     * A valid lang query parameter selects that locale.
     */
    test('accepts a valid lang query parameter', () => {
        const request = mockRequest({}, { lang: 'en' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('en');
    });

    /**
     * The accept-language header takes precedence over the lang query.
     */
    test('prefers the accept-language header over the lang query', () => {
        const request = mockRequest({ 'accept-language': 'fr' }, { lang: 'en' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('fr');
        expect(request.setLocale).not.toHaveBeenCalledWith('en');
    });

    /**
     * An authenticated user language takes precedence over header and query.
     */
    test('prefers the authenticated user language over headers and query', () => {
        const request = mockRequest(
            { 'accept-language': 'en' },
            { lang: 'en' },
            { language: 'fr' },
        );

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('fr');
    });

    /**
     * An unsupported header falls through to a supported query value.
     */
    test('falls back to a supported query when the header is unsupported', () => {
        const request = mockRequest({ 'accept-language': 'de-DE' }, { lang: 'fr' });

        langHandler(request, mockResponse(), mockNext);

        expect(request.setLocale).toHaveBeenCalledWith('fr');
    });
});
