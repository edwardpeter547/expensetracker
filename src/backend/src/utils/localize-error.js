/**
 * Boundary localisation for the structured API error envelope.
 *
 * Coded `AppError` instances localise their human-readable `message` at the
 * error-handling boundary rather than at the throw site. This keeps services
 * free of request-locale concerns while still returning a translated message
 * to the client. A missing translation falls back to the caller-supplied text.
 */

import i18n from '../configurations/i18n.config.js';

/**
 * Localise an error message by its translation key, falling back safely.
 *
 * The key is looked up in the negotiated locale with the provided safe
 * interpolation params. `i18n-node` returns the key unchanged when no entry
 * exists, which is detected and replaced with the fallback so uncoded or
 * unregistered paths keep their original message.
 *
 * @param {string|null|undefined} phrase The translation key (usually the code).
 * @param {string} locale The negotiated request locale.
 * @param {object|null} [params=null] Safe interpolation parameters.
 * @param {string} [fallback=''] The message to use when no entry exists.
 * @returns {string} The localised message, or the fallback.
 */
export const localizeErrorMessage = (phrase, locale, params = null, fallback = '') => {
    if (typeof phrase !== 'string' || !phrase) return fallback;

    const hasParams = params && typeof params === 'object' && Object.keys(params).length > 0;
    const localized = hasParams
        ? i18n.__({phrase, locale}, params)
        : i18n.__({phrase, locale});

    if (typeof localized !== 'string' || !localized || localized === phrase) {
        return fallback;
    }

    return localized;
};
