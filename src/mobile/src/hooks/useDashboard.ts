/**
 * Dashboard data hook.
 *
 * Wraps the async profile/transaction load with loading, error, and refresh
 * state. A monotonically increasing request sequence prevents a stale period
 * change from overwriting the result of a newer request.
 */

import { normalizeApiError } from '@/api/errors';
import { dashboardDataSource } from '@/contracts';
import type { DashboardData, DashboardPeriodSelection } from '@/types/dashboard';
import { useCallback, useEffect, useRef, useState } from 'react';

/** State exposed by the dashboard hook. */
export interface UseDashboardResult {
    /** Mapped dashboard data, or null until the first load succeeds. */
    data: DashboardData | null;
    /** True during the initial load. */
    loading: boolean;
    /** User-presentable error message, or null. */
    error: string | null;
    /** Reload the current period, showing the loading state. */
    refresh: () => Promise<void>;
    /** Reload the current period without replacing content with skeletons. */
    refreshSilently: () => Promise<void>;
}

/**
 * Load dashboard data for a selected period and currency.
 *
 * @param {DashboardPeriodSelection} selection The selected preset or range.
 * @param {string} currency The user's ISO 4217 currency.
 * @param {string} [locale='en-US'] The display locale.
 * @returns {UseDashboardResult} Loading/error/data state and a refresh action.
 */
export const useDashboard = (
    selection: DashboardPeriodSelection,
    currency: string,
    locale = 'en-US',
): UseDashboardResult => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestSequence = useRef(0);

    const fetchData = useCallback(
        async (silent = false): Promise<void> => {
            const sequence = ++requestSequence.current;
            if (!silent) {
                setLoading(true);
            }
            setError(null);

            try {
                const next = await dashboardDataSource.load(selection, currency, locale);
                if (requestSequence.current === sequence) setData(next);
            } catch (cause) {
                if (requestSequence.current === sequence) {
                    setError(normalizeApiError(cause).message);
                }
            } finally {
                if (requestSequence.current === sequence && !silent) {
                    setLoading(false);
                }
            }
        },
        [currency, locale, selection],
    );

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refresh: () => fetchData(false),
        refreshSilently: () => fetchData(true),
    };
};
