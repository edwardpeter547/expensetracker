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
