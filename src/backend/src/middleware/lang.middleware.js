import { resolveRequestLocale } from '../utils/locale.js';

/**
 * Set the request locale using the documented resolution precedence.
 *
 * The resolved locale is always one of the configured supported languages:
 * authenticated user language, negotiated `Accept-Language`, explicit `lang`
 * query, then the default. Unsupported or malformed values fall back instead
 * of producing a 400 error.
 *
 * @param {import('express').Request} request Express request.
 * @param {import('express').Response} response Express response.
 * @param {import('express').NextFunction} next Express next callback.
 * @returns {void}
 */
export const langHandler = (request, response, next) => {
    const locale = resolveRequestLocale({
        userLanguage: request.user?.language,
        acceptLanguage: request.headers?.['accept-language'],
        langQuery: request.query?.lang,
    });

    request.setLocale(locale);
    next();
};
