import Negotiator from 'negotiator';
import {
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
} from '../constants/localization.js';

/**
 * Backend locale negotiation for request and background contexts.
 *
 * The documented resolution contexts are:
 *
 * 1. Mobile UI — resolved by the Expo `LocaleContext` on the client.
 * 2. Authenticated API request — `resolveRequestLocale` with `userLanguage`.
 * 3. Anonymous API request — `resolveRequestLocale` without `userLanguage`.
 * 4. Background tasks (email, notifications, export) — the stored
 *    `user.language` with the default fallback; no request locale applies.
 *
 * Header negotiation delegates quality ordering and regional matching to
 * `negotiator`. A translation language never implies currency, region, or
 * timezone.
 */

/**
 * Normalize a BCP 47 language tag to its lowercase primary subtag.
 *
 * `en-GB` and `EN-us` both normalize to `en`. Empty, malformed, and wildcard
 * values normalize to an empty string so they can be treated as absent.
 *
 * @param {string|undefined|null} languageTag The candidate language tag.
 * @returns {string} The lowercase base language, or `''` when unusable.
 */
export const baseLanguageOf = (languageTag) => {
    if (typeof languageTag !== 'string') {
        return '';
    }

    const tag = languageTag.trim();
    if (!tag || tag === '*') {
        return '';
    }

    return tag.split('-')[0].toLowerCase();
};

/**
 * Negotiate the first supported language from an `Accept-Language` header.
 *
 * Delegates quality ordering and regional matching to `negotiator`, then
 * returns the highest-priority supported language. Returns `null` when the
 * header is absent or none of the supported languages match, so callers can
 * apply the remaining resolution rules rather than defaulting immediately.
 *
 * @param {string|undefined|null} header The raw `Accept-Language` value.
 * @param {readonly string[]} [supported=SUPPORTED_LANGUAGES] Supported languages.
 * @returns {string|null} The negotiated supported language, or `null`.
 */
export const negotiateAcceptLanguage = (header, supported = SUPPORTED_LANGUAGES) => {
    if (typeof header !== 'string' || !header.trim()) {
        return null;
    }

    const negotiator = new Negotiator({
        headers: { 'accept-language': header },
    });

    return negotiator.languages(supported)[0] ?? null;
};

/**
 * Resolve the canonical request locale using the documented precedence.
 *
 * Precedence: authenticated `userLanguage`, then the negotiated
 * `Accept-Language`, then the explicit `lang` query, then the default. Only
 * supported values are returned; unsupported or malformed input falls through
 * to the next candidate rather than rejecting the request.
 *
 * @param {object} [options] Resolution inputs.
 * @param {string|undefined|null} [options.userLanguage] Stored account language.
 * @param {string|undefined|null} [options.acceptLanguage] Raw header value.
 * @param {string|undefined|null} [options.langQuery] Explicit query value.
 * @param {readonly string[]} [options.supported=SUPPORTED_LANGUAGES] Supported languages.
 * @param {string} [options.fallback=DEFAULT_LANGUAGE] Final fallback.
 * @returns {string} The canonical supported locale.
 */
export const resolveRequestLocale = ({
    userLanguage,
    acceptLanguage,
    langQuery,
    supported = SUPPORTED_LANGUAGES,
    fallback = DEFAULT_LANGUAGE,
} = {}) => {
    const stored = baseLanguageOf(userLanguage);
    if (stored && supported.includes(stored)) {
        return stored;
    }

    const negotiated = negotiateAcceptLanguage(acceptLanguage, supported);
    if (negotiated) {
        return negotiated;
    }

    const explicit = baseLanguageOf(langQuery);
    if (explicit && supported.includes(explicit)) {
        return explicit;
    }

    return fallback;
};
