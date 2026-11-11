import type { MessageCatalogue, PluralCatalogue } from './types';

/**
 * `common` message catalogue (English source -> per-language translation).
 */
const messages: MessageCatalogue = {
    'Hello, {{name}}': {en: 'Hello, {{name}}', fr: 'Bonjour, {{name}}'},
    'Loading…': {en: 'Loading…', fr: 'Chargement…'},
    Retry: {en: 'Retry', fr: 'Réessayer'},
    Cancel: {en: 'Cancel', fr: 'Annuler'},
    Today: {en: 'Today', fr: 'Aujourd\'hui'},
    Yesterday: {en: 'Yesterday', fr: 'Hier'},
    Other: {en: 'Other', fr: 'Autre'},
    Home: {en: 'Home', fr: 'Accueil'},
    Transactions: {en: 'Transactions', fr: 'Transactions'},
    Planning: {en: 'Planning', fr: 'Planification'},
    Teams: {en: 'Teams', fr: 'Équipes'},
    Profile: {en: 'Profile', fr: 'Profil'},
};

/**
 * `common` plural forms.
 */
export const plurals: PluralCatalogue = {
    en: {
        items_one: '{{count}} item',
        items_other: '{{count}} items',
    },
    fr: {
        items_one: '{{count}} élément',
        items_other: '{{count}} éléments',
    },
};

export default messages;
