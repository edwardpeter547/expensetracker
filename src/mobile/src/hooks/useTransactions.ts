/**
 * Transactions list data hook.
 *
 * Loads transactions through the resolved `transactionDataSource` and owns
 * loading, refreshing, and error state. The demo/API selection happens in the
 * data-source factory, not here.
 */

import { normalizeApiError } from '@/api/errors';
import { transactionDataSource } from '@/contracts';
import type { TransactionRecord } from '@/types/transaction';
import { useCallback, useEffect, useRef, useState } from 'react';

/** State exposed by the transactions hook. */
export interface UseTransactionsResult {
    transactions: TransactionRecord[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    refreshSilently: () => Promise<void>;
}

/**
 * Load the authenticated user's transactions, or demo transactions in demo
 * mode.
 *
 * @returns {UseTransactionsResult} Loading/error state and refresh actions.
 */
export const useTransactions = (): UseTransactionsResult => {
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestSequence = useRef(0);

    const load = useCallback(async (silent: boolean): Promise<void> => {
        const sequence = ++requestSequence.current;
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const next = await transactionDataSource.list();
            if (requestSequence.current === sequence) {
                setTransactions(next);
            }
        } catch (cause) {
            if (requestSequence.current === sequence) {
                setError(normalizeApiError(cause).message);
            }
        }

        if (requestSequence.current === sequence) {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const refresh = useCallback(() => load(false), [load]);
    const refreshSilently = useCallback(() => load(true), [load]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { transactions, loading, refreshing, error, refresh, refreshSilently };
};
