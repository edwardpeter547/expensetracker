/**
 * Module-scoped effective language used by the API request interceptor.
 *
 * Kept dependency-free so `LocaleContext` can update it without importing the
 * Axios client (which pulls native modules into otherwise pure tests).
 */

let apiLanguage = 'en';

/**
 * Set the language attached to outgoing API requests.
 *
 * @param {string} language The effective application language.
 */
export const setApiLanguage = (language: string): void => {
    apiLanguage = language;
};

/**
 * Return the language currently attached to outgoing API requests.
 *
 * @returns {string} The effective application language.
 */
export const getApiLanguage = (): string => apiLanguage;
