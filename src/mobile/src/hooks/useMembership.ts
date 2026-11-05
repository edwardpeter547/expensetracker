/**
 * Membership & Billing data hook.
 *
 * There is currently no authenticated membership or subscription endpoint in
 * the backend, so the live path reports the membership as unavailable rather
 * than inventing a tier. The existing `DEMO_MODE` switch supplies illustrative
 * demo membership and plan data for visual checks only.
 */

import { DEMO_MEMBERSHIP, DEMO_MODE } from '@/constants/dashboardDemo';
import type { MembershipSummary } from '@/types/membership';

/** State exposed to the profile header and Membership & Billing screen. */
export interface UseMembershipResult {
    membership: MembershipSummary | null;
    loading: boolean;
    error: string | null;
}

/**
 * Resolve the current membership presentation.
 *
 * @returns {UseMembershipResult} Membership, plan catalog, and load state.
 */
export const useMembership = (): UseMembershipResult => {
    if (DEMO_MODE) {
        return {
            membership: DEMO_MEMBERSHIP,
            loading: false,
            error: null,
        };
    }

    // No verified membership/billing source exists yet. Return an unavailable
    // neutral state instead of assuming a Free tier.
    return {
        membership: null,
        loading: false,
        error: null,
    };
};
