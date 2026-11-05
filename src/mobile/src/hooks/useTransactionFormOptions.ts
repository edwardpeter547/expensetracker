/**
 * Add Transaction options hook (categories and budgets).
 *
 * Reuses the single existing demo toggle: demo mode returns the versioned
 * fixtures synchronously, while live mode loads both authenticated lists
 * through the shared API client.
 */

import { normalizeApiError } from '@/api/errors';
import { fetchBudgets, fetchCategories } from '@/api/transactions';
import { DEMO_MODE } from '@/constants/dashboardDemo';
import { DEMO_BUDGETS, DEMO_CATEGORIES } from '@/constants/transactionsDemo';
import type { Budget, Category } from '@/types/transaction';
import { useCallback, useEffect, useRef, useState } from 'react';

/** State exposed by the form options hook. */
export interface UseTransactionFormOptionsResult {
    categories: Category[];
    budgets: Budget[];
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
}

/**
 * Load categories and budgets for the Add Transaction form.
 *
 * @returns {UseTransactionFormOptionsResult} The options and loading state.
 */
export const useTransactionFormOptions = (): UseTransactionFormOptionsResult => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestSequence = useRef(0);

    const load = useCallback(async (): Promise<void> => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setError(null);

        if (DEMO_MODE) {
            if (requestSequence.current === sequence) {
                setCategories(DEMO_CATEGORIES);
                setBudgets(DEMO_BUDGETS);
                setLoading(false);
            }
            return;
        }

        try {
            const [nextCategories, nextBudgets] = await Promise.all([
                fetchCategories(),
                fetchBudgets(),
            ]);
            if (requestSequence.current === sequence) {
                setCategories(nextCategories);
                setBudgets(nextBudgets);
            }
        } catch (cause) {
            if (requestSequence.current === sequence) {
                setError(normalizeApiError(cause).message);
            }
        } finally {
            if (requestSequence.current === sequence) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return { categories, budgets, loading, error, reload: load };
};
