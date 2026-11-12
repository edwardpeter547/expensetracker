import type { PluralCatalogue } from './types';

/**
 * Hand-authored plural forms for the `teams` namespace.
 *
 * These are kept separate from the generated string catalogue so
 * `scripts/build-message-catalogues.mjs` can regenerate `messages/teams.ts`
 * without losing i18next plural entries.
 */
const plurals: PluralCatalogue = {
    en: {
        teamCount_one: '{{count}} team',
        teamCount_other: '{{count}} teams',
        memberCount_one: '{{count}} member',
        memberCount_other: '{{count}} members',
        participantCount_one: '{{count}} participant',
        participantCount_other: '{{count}} participants',
    },
    fr: {
        teamCount_one: '{{count}} équipe',
        teamCount_other: '{{count}} équipes',
        memberCount_one: '{{count}} membre',
        memberCount_other: '{{count}} membres',
        participantCount_one: '{{count}} participant',
        participantCount_other: '{{count}} participants',
    },
};

export default plurals;
