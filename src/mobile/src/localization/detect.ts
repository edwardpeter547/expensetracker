/**
 * Pure device language and currency detection.
 *
 * This module is self-contained so it can be run directly by Node's test
 * runner. The application-facing registry remains in `registry.ts`.
 */

const REGION_CURRENCY: Record<string, string> = {
    GB: 'GBP',
    US: 'USD',
    NG: 'NGN',
    FR: 'EUR',
    CA: 'CAD',
    JP: 'JPY',
    DE: 'EUR',
    IT: 'EUR',
    ES: 'EUR',
    IE: 'EUR',
    NL: 'EUR',
    PT: 'EUR',
    AT: 'EUR',
    BE: 'EUR',
    FI: 'EUR',
    GR: 'EUR',
    AU: 'AUD',
    NZ: 'NZD',
    CH: 'CHF',
    IN: 'INR',
    ZA: 'ZAR',
    GH: 'GHS',
    KE: 'KES',
};

/**
 * Supported base language codes and fallbacks used by the pure detector.
 */
const DETECTOR_LANGUAGES = ['en', 'fr'];
const DETECTOR_LANGUAGE_FALLBACK = 'en';
const DETECTOR_CURRENCY_FALLBACK = 'USD';

/**
 * Inputs describing the device locale snapshot used by the detector.
 */
export interface DeviceLocaleSnapshot {
    preferredLanguages: string[];
    regionCode?: string | null;
    currencyCode?: string | null;
}

/**
 * Initial application preferences derived from device settings.
 */
export interface InitialPreferences {
    language: string;
    currency: string;
}

/**
 * Normalize a language tag such as `fr-CA` to its base language `fr`.
 *
 * @param {string} languageTag The BCP-47 language tag.
 * @returns {string} The lowercased base language code.
 */
export const baseLanguageOf = (languageTag: string): string => {
    return languageTag.trim().split('-')[0].toLowerCase();
};

/**
 * Select the first preferred language that is supported.
 *
 * @param {string[]} preferredLanguages Ordered device language tags.
 * @param {readonly string[]} supported The supported base language codes.
 * @param {string} fallback The language to use when none match.
 * @returns {string} The resolved base language code.
 */
export const selectSupportedLanguage = (
    preferredLanguages: string[],
    supported: readonly string[],
    fallback: string,
): string => {
    for (const tag of preferredLanguages) {
        const base = baseLanguageOf(tag);
        if (supported.includes(base)) return base;
    }
    return fallback;
};

/**
 * Resolve a currency for a region without using GPS, IP, or SIM data.
 *
 * @param {string|undefined|null} regionCode The ISO 3166-1 alpha-2 region.
 * @param {string} fallback The currency to use when unknown or ambiguous.
 * @returns {string} The resolved ISO 4217 currency code.
 */
export const resolveCurrencyFromRegion = (
    regionCode: string | undefined | null,
    fallback: string,
): string => {
    if (!regionCode) return fallback;
    const normalized = regionCode.trim().toUpperCase();
    return REGION_CURRENCY[normalized] ?? fallback;
};

/**
 * Resolve the initial currency independently of the selected language.
 *
 * @param {DeviceLocaleSnapshot} device The device locale snapshot.
 * @param {string} fallback The fallback currency.
 * @returns {string} The resolved ISO 4217 currency code.
 */
export const resolveInitialCurrency = (
    device: DeviceLocaleSnapshot,
    fallback: string = DETECTOR_CURRENCY_FALLBACK,
): string => {
    if (device.currencyCode?.trim()) return device.currencyCode.trim().toUpperCase();
    return resolveCurrencyFromRegion(device.regionCode, fallback);
};

/**
 * Resolve the initial language and currency from a device snapshot.
 *
 * @param {DeviceLocaleSnapshot} device The device locale snapshot.
 * @param {readonly string[]} [supported=DETECTOR_LANGUAGES] Supported languages.
 * @param {string} [fallbackLanguage=DETECTOR_LANGUAGE_FALLBACK] Fallback language.
 * @param {string} [fallbackCurrency=DETECTOR_CURRENCY_FALLBACK] Fallback currency.
 * @returns {InitialPreferences} The initial preferences.
 */
export const resolveInitialPreferences = (
    device: DeviceLocaleSnapshot,
    supported: readonly string[] = DETECTOR_LANGUAGES,
    fallbackLanguage: string = DETECTOR_LANGUAGE_FALLBACK,
    fallbackCurrency: string = DETECTOR_CURRENCY_FALLBACK,
): InitialPreferences => {
    const language = selectSupportedLanguage(
        device.preferredLanguages,
        supported,
        fallbackLanguage,
    );

    return {
        language,
        currency: resolveInitialCurrency(device, fallbackCurrency),
    };
};
