import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import i18n from '../../configurations/i18n.config.js';
import { langHandler } from '../lang.middleware.js';


/**
 * Language Middleware Test Suite
 *
 * Tests the langHandler middleware which detects the user's preferred language
 * from the request headers (accept-language) or query parameters (lang) and
 * sets the locale on the request object via request.setLocale().
 *
 * @module lang.middleware.test
 */
describe('Test Language Middleware - langHandler', () => {

    const mockRequest = (headers, query={}, setLocale) => ({headers, query, setLocale: jest.fn()});
    const mockResponse = () => ({}) ;
    const mockNext = jest.fn();

    beforeEach(() => {
        mockNext.mockClear();
    })

    /**
     * Validates that the middleware calls next() when a valid locale
     * is provided in the accept-language request header.
     */
    test('request header with accept-language parameter and expected lang parameter validates', () => {

        const headers = {};
        headers['accept-language'] = 'en' ;

        const req = mockRequest(headers);
        const res = mockResponse();

        langHandler(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    /**
     * Validates that the middleware accepts all locales configured in i18n
     * and sets the locale on the request for each valid locale.
     */
    test('validates when request header\'s accept-language parameter has only valid locales', () => {

        const validLocales = i18n.getLocales();

        validLocales.forEach(locale => {
            const headers = {}
            headers['accept-language'] = locale;
            const req = mockRequest(headers);
            const res = mockResponse();

            langHandler(req, res, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(req.setLocale).toHaveBeenCalledWith(locale);
        })

        expect(mockNext).toHaveBeenCalledTimes(validLocales.length);

    });

    /**
     * Validates that the middleware calls next() with an AppError when
     * an unsupported locale is provided in the accept-language header.
     * The locale should not be set on the request.
     */
    test('fails when an invalid locale is sent in request header', () => {
        const headers = {}
        const invalidLocale = 'soo-gho'
        headers['accept-language'] = invalidLocale;

        const req = mockRequest(headers);
        const res = mockResponse();
        langHandler(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.setLocale).not.toHaveBeenCalled();
    });

    /**
     * Validates that the middleware also accepts a valid locale passed
     * via the lang query parameter when no accept-language header is present.
     */
    test('langhandler also accepts a query parameter with a valid locale', () => {
        const headers = {}
        const query = {lang: 'en'};
        const req = mockRequest(headers, query);
        const res = mockResponse();

        langHandler(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.setLocale).toHaveBeenCalledWith(query.lang);
    });

    /**
     * Validates that the accept-language header takes precedence over
     * the lang query parameter when both are present in the request.
     */
    test('request.header locale takes precedence over request.query locale', () => {
        const headers = {}
        headers['accept-language'] = 'fr'
        const query = {lang: 'en'};
        const req = mockRequest(headers, query);
        const res = mockResponse();

        langHandler(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(req.setLocale).toHaveBeenCalledWith(headers['accept-language']);
        expect(req.setLocale).not.toHaveBeenCalledWith(query.lang);
    })

})