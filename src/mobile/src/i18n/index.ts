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
import commonCatalogue, { plurals as commonPlurals } from './messages/common';
import dashboardCatalogue from './messages/dashboard';
import authCatalogue from './messages/auth';
import transactionsCatalogue from './messages/transactions';
import planningCatalogue from './messages/planning';
import teamsCatalogue from './messages/teams';
import profileCatalogue from './messages/profile';
import notificationsCatalogue from './messages/notifications';
import planningPlurals from './messages/planningPlurals';
import teamsPlurals from './messages/teamsPlurals';
import { buildLanguageResources } from './messages/build';

const catalogues = {
    common: commonCatalogue,
    dashboard: dashboardCatalogue,
    auth: authCatalogue,
    transactions: transactionsCatalogue,
    planning: planningCatalogue,
    teams: teamsCatalogue,
    profile: profileCatalogue,
    notifications: notificationsCatalogue,
};
const plurals = {
    common: commonPlurals,
    planning: planningPlurals,
    teams: teamsPlurals,
};

const sourceResources = buildLanguageResources(catalogues, plurals, SUPPORTED_LANGUAGES);

/**
 * Key-based resources that are not part of the source-keyed catalogues.
 * These are mainly the API error namespace and the placeholder feature
 * namespaces that are still waiting for their extraction pass.
 */
const keyedResources: Record<string, Record<string, unknown>> = {
    en,
    fr,
};

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
        resources: Object.fromEntries(
            SUPPORTED_LANGUAGES.map((language) => [
                language,
                {
                    ...(keyedResources[language] ?? {}),
                    common: sourceResources[language].common,
                    dashboard: sourceResources[language].dashboard,
                    auth: sourceResources[language].auth,
                    transactions: sourceResources[language].transactions,
                    planning: sourceResources[language].planning,
                    teams: sourceResources[language].teams,
                    profile: sourceResources[language].profile,
                    notifications: sourceResources[language].notifications,
                },
            ]),
        ),
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
