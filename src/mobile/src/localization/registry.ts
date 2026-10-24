/**
 * Centralized registry of the languages and currencies ExpenseTracker
 * supports.
 *
 * A language may only be selected when a matching translation file exists on
 * the backend (`src/backend/src/locales/<code>.json`) and on the client. The
 * list is deliberately small and extensible.
 */

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const DEFAULT_CURRENCY = 'USD';

/**
 * Currency codes ExpenseTracker can display without an exchange-rate policy.
 * Detection is not limited to this list; the registry is used for fallback
 * and future capability checks.
 */
export const SUPPORTED_CURRENCIES = [
    'USD',
    'GBP',
    'NGN',
    'EUR',
    'CAD',
    'JPY',
] as const;

/**
 * True when the value is a supported application language.
 *
 * @param {string} value The candidate language code.
 * @returns {boolean} True when supported.
 */
export const isSupportedLanguage = (value: string): value is SupportedLanguage => {
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
};
