import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'preferences.language';
const CURRENCY_KEY = 'preferences.currency';

/**
 * Persisted preference overrides.
 *
 * A `null` value means "follow the device".
 */
export interface StoredPreferences {
    language: string | null;
    currency: string | null;
}

/**
 * Load persisted language and currency overrides.
 *
 * @returns {Promise<StoredPreferences>} The stored overrides.
 */
export const loadStoredPreferences = async (): Promise<StoredPreferences> => {
    const [language, currency] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(CURRENCY_KEY),
    ]);
    return { language, currency };
};

/**
 * Persist the explicit language override.
 *
 * @param {string} language The language code to persist.
 * @returns {Promise<void>}
 */
export const saveLanguageOverride = async (language: string): Promise<void> => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

/**
 * Persist the explicit currency override.
 *
 * @param {string} currency The currency code to persist.
 * @returns {Promise<void>}
 */
export const saveCurrencyOverride = async (currency: string): Promise<void> => {
    await AsyncStorage.setItem(CURRENCY_KEY, currency);
};

/**
 * Clear the language override so the app follows the device again.
 *
 * @returns {Promise<void>}
 */
export const clearLanguageOverride = async (): Promise<void> => {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
};

/**
 * Clear the currency override so the app follows the device again.
 *
 * @returns {Promise<void>}
 */
export const clearCurrencyOverride = async (): Promise<void> => {
    await AsyncStorage.removeItem(CURRENCY_KEY);
};
