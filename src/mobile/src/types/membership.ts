/**
 * Membership & Billing display view models.
 *
 * These are UI-only shapes. Callers must map verified membership data into
 * them; the types themselves never imply that a backend billing or
 * subscription service exists.
 */

/** A membership tier id. */
export type MembershipTier = 'free' | 'bronze' | 'silver' | 'gold' | string;

/** Subscription lifecycle state. */
export type MembershipStatus =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'expired'
    | 'unknown';

/** Membership summary rendered in the profile header and billing screen. */
export interface MembershipSummary {
    tier: MembershipTier;
    displayName: string;
    benefits?: string[];
    status?: MembershipStatus;
    /** Present only when verified by a real catalog or subscription record. */
    priceLabel?: string;
    billingCycleLabel?: string;
    renewalDateLabel?: string;
    billingProviderLabel?: string;
}
