/**
 * Bridge between the API error-code catalogue and the `errors` namespace.
 *
 * `translateApiError` accepts a translator function; this module returns one
 * bound to the `errors` namespace for a given language so callers never
 * construct namespace-qualified keys themselves.
 */

import type { ErrorTranslator } from '@/api/errors';
import i18n from './index';

/**
 * Build an `errors`-namespace translator for a language.
 *
 * Missing keys resolve to undefined so `translateApiError` applies its
 * documented fallback chain instead of rendering a raw translation key.
 *
 * @param {string} language The effective application language.
 * @returns {ErrorTranslator} A translator bound to the `errors` namespace.
 */
export const createErrorTranslator = (language: string): ErrorTranslator => {
    const translate = i18n.getFixedT(language, 'errors') as unknown as (
        key: string,
        options?: Record<string, unknown>,
    ) => string;

    return (key, options) => {
        const result = translate(key, options);
        return typeof result === 'string' && result !== key ? result : undefined;
    };
};
