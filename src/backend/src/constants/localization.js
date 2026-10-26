/**
 * Centralized backend localization registry.
 *
 * A language is supported only when a complete translation file exists in
 * `src/backend/src/locales/<code>.json`. The mobile client maintains the same
 * registry in `src/mobile/src/localization/registry.ts`.
 */

export const SUPPORTED_LANGUAGES = ['en', 'fr'];
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_CURRENCY = 'USD';

/**
 * Allowed theme preferences.
 *
 * `system` is accepted so future web/mobile clients can defer to the device
 * color scheme; the backend default remains `light`.
 */
export const SUPPORTED_THEMES = ['system', 'light', 'dark'];
