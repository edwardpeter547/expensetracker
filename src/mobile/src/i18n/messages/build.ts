import type { SupportedLanguage } from '@/localization/registry';
import type { MessageCatalogue, PluralCatalogue } from './types';

/**
 * Build i18next resources for every supported language from source-keyed
 * catalogues.
 *
 * String entries map source -> per-language translation. Plural entries are
 * emitted as `_one`/`_other` suffixes so `i18next` plural selection keeps
 * working with `t('items', { count })`.
 *
 * @param {Record<string, MessageCatalogue>} catalogues Namespaces.
 * @param {Record<string, PluralCatalogue>} plurals Plural forms by namespace.
 * @param {readonly SupportedLanguage[]} languages Supported languages.
 * @returns i18next resources keyed by language and namespace.
 */
export const buildLanguageResources = (
    catalogues: Record<string, MessageCatalogue>,
    plurals: Record<string, PluralCatalogue>,
    languages: readonly SupportedLanguage[],
): Record<SupportedLanguage, Record<string, Record<string, string>>> => {
    const resources = {} as Record<SupportedLanguage, Record<string, Record<string, string>>>;

    for (const language of languages) {
        const languageResources: Record<string, Record<string, string>> = {};

        for (const [namespace, catalogue] of Object.entries(catalogues)) {
            const namespaceResources: Record<string, string> = {};
            for (const [source, translations] of Object.entries(catalogue)) {
                namespaceResources[source] = translations[language] ?? source;
            }
            Object.assign(namespaceResources, plurals[namespace]?.[language] ?? {});
            languageResources[namespace] = namespaceResources;
        }

        resources[language] = languageResources;
    }

    return resources;
};
