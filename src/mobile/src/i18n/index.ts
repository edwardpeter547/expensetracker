/* eslint-disable import/no-named-as-default-member */
/**
 * i18next bootstrap for the Expo mobile application.
 *
 * Resources are bundled TypeScript modules so translation works offline.
 * `LocaleContext` remains the source of truth for the effective language and
 * calls `i18n.changeLanguage`; the namespace list follows ADR-08 with an
 * additional `errors` namespace for the API error-code contract.
 */

import i18nInstance from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/localization/registry';
import en from './locales/en';
import fr from './locales/fr';

/**
 * Feature namespaces bootstrapped for the initial en/fr rollout.
 */
export const I18N_NAMESPACES = [
    'common',
    'auth',
    'dashboard',
    'transactions',
    'planning',
    'teams',
    'profile',
    'notifications',
    'ai',
    'errors',
] as const;

i18nInstance.use(initReactI18next);

void i18nInstance
    .init({
        resources: {
            en,
            fr,
        },
        lng: DEFAULT_LANGUAGE,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        ns: [...I18N_NAMESPACES],
        defaultNS: 'common',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18nInstance;
