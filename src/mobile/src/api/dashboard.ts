/**
 * Dashboard data access built on the existing authenticated API client.
 *
 * The backend has no date-filtered dashboard endpoint, so this module fetches
 * the authenticated profile plus every owned transaction and delegates the
 * period/category mapping to the pure `buildDashboardData` function. Requests
 * reuse the shared Axios client, so token refresh and error normalization are
 * inherited rather than duplicated.
 */

import { apiClient } from '@/api/client';
import type { DashboardData, DashboardPeriodSelection } from '@/types/dashboard';
import {
    buildDashboardData,
    type DashboardProfile,
    type DashboardTransaction,
} from '@/utils/dashboardData';
import { buildBoundsForSelection } from '@/utils/dashboardPeriod';

/** Envelope returned by the transaction list endpoint. */
interface TransactionsEnvelope {
    success: boolean;
    message: string;
    data: { transactions: DashboardTransaction[] };
    errors: unknown;
}

/** Envelope returned by the profile endpoint. */
interface ProfileEnvelope {
    success: boolean;
    message: string;
    data: { profile: DashboardProfile };
    errors: unknown;
}

/**
 * Fetch every transaction owned by the authenticated user.
 *
 * @returns {Promise<DashboardTransaction[]>} The user's transactions.
 */
export const fetchDashboardTransactions = async (): Promise<DashboardTransaction[]> => {
    const response = await apiClient.get<TransactionsEnvelope>('/transactions');
    return response.data?.data?.transactions ?? [];
};

/**
 * Fetch the authenticated user's profile DTO.
 *
 * @returns {Promise<DashboardProfile>} The profile, used for name and avatar.
 */
export const fetchDashboardProfile = async (): Promise<DashboardProfile> => {
    const response = await apiClient.get<ProfileEnvelope>('/user/profile');
    return response.data?.data?.profile;
};

/**
 * Load and map every input needed to render the dashboard.
 *
 * The profile and transaction requests run concurrently and are mapped with
 * exact arithmetic before the view model is returned.
 *
 * @param {DashboardPeriodSelection} selection The selected preset or range.
 * @param {string} currency The user's ISO 4217 currency.
 * @param {Date} [now=new Date()] The reference instant for period bounds.
 * @param {string} [locale='en-US'] The display locale for range labels.
 * @returns {Promise<DashboardData>} The mapped dashboard view model.
 */
export const loadDashboardData = async (
    selection: DashboardPeriodSelection,
    currency: string,
    now: Date = new Date(),
    locale = 'en-US',
): Promise<DashboardData> => {
    const [transactions, profile] = await Promise.all([
        fetchDashboardTransactions(),
        fetchDashboardProfile(),
    ]);

    const { current, previous } = buildBoundsForSelection(selection, now, locale);
    return buildDashboardData(transactions, profile, currency, current, previous, now);
};
