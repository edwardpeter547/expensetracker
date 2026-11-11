import type { PluralCatalogue } from './types';

/**
 * Hand-authored plural forms for the `planning` namespace.
 *
 * These are kept separate from the generated string catalogue so
 * `scripts/build-message-catalogues.mjs` can regenerate `messages/planning.ts`
 * without losing i18next plural entries.
 */
const plurals: PluralCatalogue = {
    en: {
        activeBudgets_one: '{{count}} active budget',
        activeBudgets_other: '{{count}} active budgets',
        activeGoals_one: '{{count}} active goal',
        activeGoals_other: '{{count}} active goals',
        upcomingItems_one: '{{count}} upcoming item',
        upcomingItems_other: '{{count}} upcoming items',
    },
    fr: {
        activeBudgets_one: '{{count}} budget actif',
        activeBudgets_other: '{{count}} budgets actifs',
        activeGoals_one: '{{count}} objectif actif',
        activeGoals_other: '{{count}} objectifs actifs',
        upcomingItems_one: '{{count}} élément à venir',
        upcomingItems_other: '{{count}} éléments à venir',
    },
};

export default plurals;
