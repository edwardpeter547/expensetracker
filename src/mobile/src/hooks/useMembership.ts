/**
 * Membership & Billing data hook.
 *
 * Loads the membership through the resolved `membershipDataSource`. The API
 * implementation reports the membership as unavailable (null) rather than
 * inventing a tier; the demo implementation supplies illustrative data.
 */

import { membershipDataSource } from '@/contracts';
import i18n from '@/i18n';
import type { MembershipSummary } from '@/types/membership';
import { useEffect, useState } from 'react';

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
    const [membership, setMembership] = useState<MembershipSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        membershipDataSource
            .get()
            .then((value) => {
                if (active) setMembership(value);
            })
            .catch(() => {
                if (active) setError(i18n.t('Membership is unavailable right now.', { ns: 'profile' }));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    return { membership, loading, error };
};
