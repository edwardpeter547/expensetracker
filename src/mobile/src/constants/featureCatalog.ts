/**
 * Centralized feature catalog for premium feature access.
 *
 * This is the single source of truth for feature identifiers and their
 * presentation copy. It intentionally contains no plan names, prices, or
 * billing rules; those are owned by the future backend and are kept out of
 * individual screens so the UI never scatters subscription-plan comparisons.
 */

import type { FeatureDefinition, FeatureKey } from '@/types/featureAccess';

/**
 * Every gated feature and its display metadata.
 *
 * The `satisfies` clause ties this table to the `FeatureKey` union so adding
 * or removing an entry is a compile-time-checked change.
 */
export const FEATURE_CATALOG = {
    'teams.create': {
        key: 'teams.create',
        category: 'teams',
        label: 'Create a Team',
        headline: 'Better finances, together.',
        description: 'Create a shared space to plan, track and understand money together.',
        benefits: [
            'Manage pooled or independent team finances',
            'Track contributions and shared spending',
            'Coordinate budgets, goals and expenses',
        ],
        presentation: 'full',
    },
    'teams.invite': {
        key: 'teams.invite',
        category: 'teams',
        label: 'Invite Members',
        headline: 'Bring your people in.',
        description: 'Invite the people you trust into a shared financial space.',
        benefits: [
            'Invite members by email',
            'Assign member roles',
            'Keep shared money visible to the right people',
        ],
        presentation: 'compact',
    },
    'teams.contributions': {
        key: 'teams.contributions',
        category: 'teams',
        label: 'Team Contributions',
        headline: 'See every contribution.',
        description: 'Track who has contributed and what is still outstanding.',
        benefits: [
            'Follow pooled contributions',
            'Understand shared spending',
            'Stay aligned as a team',
        ],
        presentation: 'compact',
    },
    'teams.manage': {
        key: 'teams.manage',
        category: 'teams',
        label: 'Team Finance',
        headline: 'Better finances, together.',
        description: 'Organize shared finances with the people who matter.',
        benefits: [
            'Keep everyone on the same page',
            'Understand shared expenses',
            'Plan together with confidence',
        ],
        presentation: 'compact',
    },
    'planning.insights': {
        key: 'planning.insights',
        category: 'planning',
        label: 'Advanced Insights',
        headline: 'See the bigger picture.',
        description: 'Understand your money with deeper spending trends and comparisons.',
        benefits: [
            'Explore detailed spending patterns',
            'Compare performance over time',
            'Discover opportunities to save',
        ],
        presentation: 'full',
    },
    'planning.cashflow': {
        key: 'planning.cashflow',
        category: 'planning',
        label: 'Cash Flow Forecast',
        headline: 'Know what is coming next.',
        description: 'Look ahead at expected money in and out before it happens.',
        benefits: [
            'Project future cash flow',
            'Plan for upcoming expenses',
            'Spot gaps before they arrive',
        ],
        presentation: 'full',
    },
    'receipts.scan': {
        key: 'receipts.scan',
        category: 'receipts',
        label: 'Smart Receipt Scanning',
        headline: 'Less typing. More clarity.',
        description: 'Turn receipts into organized expenses with a smarter workflow.',
        benefits: [
            'Capture expenses from receipts',
            'Review extracted line items',
            'Keep purchases organized',
        ],
        presentation: 'compact',
    },
    'transactions.export': {
        key: 'transactions.export',
        category: 'transactions',
        label: 'Export Transactions',
        headline: 'Take your data with you.',
        description: 'Export a clean copy of your transactions when you need it.',
        benefits: [
            'Download transaction history',
            'Share records for review',
            'Keep an offline copy',
        ],
        presentation: 'compact',
    },
} as const satisfies Record<FeatureKey, FeatureDefinition>;

/**
 * All stable feature identifiers in catalog order.
 *
 * @returns {FeatureKey[]} The ordered feature keys.
 */
export const FEATURE_KEYS: readonly FeatureKey[] = Object.keys(FEATURE_CATALOG) as FeatureKey[];

/**
 * Return the catalog definition for a feature.
 *
 * @param {FeatureKey} featureId The stable feature identifier.
 * @returns {FeatureDefinition} The feature's display metadata.
 */
export const getFeatureDefinition = (featureId: FeatureKey): FeatureDefinition =>
    FEATURE_CATALOG[featureId];
