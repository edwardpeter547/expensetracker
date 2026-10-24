import * as Localization from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { resolveInitialPreferences } from '@/localization/detect';
import {
    clearCurrencyOverride,
    clearLanguageOverride,
    loadStoredPreferences,
    saveCurrencyOverride,
    saveLanguageOverride,
} from '@/localization/storage';
import {
    SUPPORTED_LANGUAGES,
} from '@/localization/registry';

/**
 * Locale state exposed to the rest of the application.
 */
interface LocaleContextValue {
    language: string;
    currency: string;
    regionCode: string | null;
    isLanguageOverridden: boolean;
    isCurrencyOverridden: boolean;
    setLanguage: (language: string) => Promise<void>;
    setCurrency: (currency: string) => Promise<void>;
    followDeviceLanguage: () => Promise<void>;
    followDeviceCurrency: () => Promise<void>;
    applyRemotePreferences: (language?: string | null, currency?: string | null) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

/**
 * Build the device locale snapshot consumed by the detector.
 *
 * @returns {ReturnType<typeof resolveInitialPreferences> extends never ? never : object}
 *   Resolved initial language and currency.
 */
const readDevicePreferences = () => {
    const locales = Localization.getLocales();
    const primary = locales[0];
    return {
        deviceLanguages: locales
            .map((locale) => locale.languageTag || locale.languageCode || '')
            .filter(Boolean),
        regionCode: primary?.regionCode ?? null,
        currencyCode: primary?.currencyCode ?? null,
    };
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
    const [device, setDevice] = useState(readDevicePreferences);
    const [languageOverride, setLanguageOverrideState] = useState<string | null>(null);
    const [currencyOverride, setCurrencyOverrideState] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let active = true;
        loadStoredPreferences().then((stored) => {
            if (!active) return;
            setLanguageOverrideState(stored.language);
            setCurrencyOverrideState(stored.currency);
            setHydrated(true);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') setDevice(readDevicePreferences());
        });
        return () => subscription.remove();
    }, []);

    const devicePreferences = useMemo(
        () => resolveInitialPreferences({
            preferredLanguages: device.deviceLanguages,
            regionCode: device.regionCode,
            currencyCode: device.currencyCode,
        }),
        [device],
    );

    const language = languageOverride ?? devicePreferences.language;
    const currency = currencyOverride ?? devicePreferences.currency;

    const setLanguage = async (nextLanguage: string) => {
        if (!SUPPORTED_LANGUAGES.includes(nextLanguage as never)) {
            throw new Error(`Unsupported language: ${nextLanguage}`);
        }
        await saveLanguageOverride(nextLanguage);
        setLanguageOverrideState(nextLanguage);
    };

    const setCurrency = async (nextCurrency: string) => {
        const normalized = nextCurrency.trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(normalized)) {
            throw new Error(`Invalid currency: ${nextCurrency}`);
        }
        await saveCurrencyOverride(normalized);
        setCurrencyOverrideState(normalized);
    };

    const followDeviceLanguage = async () => {
        await clearLanguageOverride();
        setLanguageOverrideState(null);
    };

    const followDeviceCurrency = async () => {
        await clearCurrencyOverride();
        setCurrencyOverrideState(null);
    };

    /**
     * Adopt preferences returned by the authenticated profile without
     * persisting them as manual overrides, so a later device change can still
     * be followed until the user explicitly chooses otherwise.
     */
    const applyRemotePreferences = useCallback(
        (remoteLanguage?: string | null, remoteCurrency?: string | null) => {
            if (remoteLanguage && SUPPORTED_LANGUAGES.includes(remoteLanguage as never)) {
                setLanguageOverrideState(remoteLanguage);
            }
            if (remoteCurrency && /^[A-Z]{3}$/.test(remoteCurrency)) {
                setCurrencyOverrideState(remoteCurrency);
            }
        },
        [],
    );

    const value: LocaleContextValue = {
        language,
        currency,
        regionCode: device.regionCode,
        isLanguageOverridden: languageOverride !== null,
        isCurrencyOverridden: currencyOverride !== null,
        setLanguage,
        setCurrency,
        followDeviceLanguage,
        followDeviceCurrency,
        applyRemotePreferences,
    };

    return (
        <LocaleContext.Provider value={value}>
            {hydrated ? children : null}
        </LocaleContext.Provider>
    );
};

/**
 * Consume the locale context.
 *
 * @returns {LocaleContextValue} The locale state and mutators.
 * @throws {Error} When used outside `LocaleProvider`.
 */
export const useLocale = (): LocaleContextValue => {
    const context = useContext(LocaleContext);
    if (!context) throw new Error('useLocale must be used within LocaleProvider');
    return context;
};
