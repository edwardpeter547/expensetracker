import type { SupportedLanguage } from '@/localization/registry';

/**
 * Message catalogue types.
 *
 * A message catalogue maps an English source string (the key) to a
 * per-language translation map. The English entry is always the source string
 * itself and doubles as the in-app fallback.
 */

/** A source-string keyed catalogue with one translation per language. */
export type MessageCatalogue = Record<string, Record<SupportedLanguage, string>>;

/** Plural forms keyed by language. */
export type PluralForms = Record<string, string>;

/** Plural entries for one namespace, keyed by the plural base key. */
export type PluralCatalogue = Partial<Record<SupportedLanguage, PluralForms>>;
