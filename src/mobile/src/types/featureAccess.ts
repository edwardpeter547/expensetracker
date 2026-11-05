/**
 * Frontend feature-access and entitlement contracts.
 *
 * These types describe how the UI asks for and presents feature access. They
 * are a presentation contract only: they are not an authorization boundary,
 * and the future backend must independently enforce entitlements on every
 * protected API operation.
 */

/**
 * Stable feature identifier shared by screens, the catalog, and adapters.
 *
 * Keep this union and `FEATURE_CATALOG` in `src/constants/featureCatalog.ts`
 * in sync. The `satisfies` annotation on the catalog makes a mismatch a
 * compile-time error.
 */
export type FeatureKey =
    | 'teams.create'
    | 'teams.invite'
    | 'teams.contributions'
    | 'teams.manage'
    | 'planning.insights'
    | 'planning.cashflow'
    | 'receipts.scan'
    | 'transactions.export';

/** Product grouping used to organize catalog copy. */
export type FeatureCategory = 'teams' | 'planning' | 'receipts' | 'transactions';

/** Preferred upgrade presentation for a feature. */
export type GatePresentation = 'full' | 'compact';

/** Access decision statuses surfaced to components. */
export type FeatureAccessStatus = 'allowed' | 'denied' | 'loading' | 'unknown';

/**
 * A resolved access decision for one feature.
 *
 * `unknown` must never be treated as a confirmed denial. `loading` means the
 * decision is still being determined.
 */
export interface FeatureAccessResult {
    featureId: FeatureKey;
    status: FeatureAccessStatus;
    /** Optional human-readable explanation, for example why access is unknown. */
    reason?: string;
}

/** Origin of an entitlement snapshot. */
export type EntitlementSource = 'demo' | 'server';

/** A single feature's entitlement snapshot returned by an adapter. */
export interface EntitlementSnapshot {
    status: FeatureAccessStatus;
    source: EntitlementSource;
    reason?: string;
}

/**
 * Catalog metadata for one gated feature.
 *
 * Feature definitions carry display copy only. They deliberately do not encode
 * plan names, prices, or billing rules, which the backend will own later.
 */
export interface FeatureDefinition {
    key: FeatureKey;
    category: FeatureCategory;
    label: string;
    headline: string;
    description: string;
    benefits: readonly string[];
    presentation: GatePresentation;
}

/**
 * Frontend entitlement adapter contract.
 *
 * The development mock resolves synchronously. A future authenticated backend
 * adapter may resolve asynchronously and should surface `loading` while the
 * effective entitlement snapshot is being fetched or refreshed.
 */
export interface FeatureEntitlementAdapter {
    /**
     * Resolve the current entitlement snapshot for one feature.
     *
     * @param featureId The stable feature identifier.
     * @returns The effective snapshot for the feature.
     */
    getAccess(featureId: FeatureKey): EntitlementSnapshot;

    /**
     * Re-fetch the effective entitlement snapshot.
     *
     * Optional because the synchronous demo adapter has nothing to fetch.
     *
     * @returns A promise that settles when the refresh completes.
     */
    refresh?(): Promise<void>;
}

/** Options accepted by the action-level `requestAccess` helper. */
export interface RequestAccessOptions {
    /** Overrides the feature's preferred presentation. */
    presentation?: GatePresentation;
}
