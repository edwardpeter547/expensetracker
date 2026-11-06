/**
 * Add Transaction options hook (categories and budgets).
 *
 * Loads both lists through the resolved category and budget data sources.
 */

import { normalizeApiError } from '@/api/errors';
import { budgetDataSource, categoryDataSource } from '@/contracts';
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

        try {
            const [nextCategories, nextBudgets] = await Promise.all([
                categoryDataSource.list(),
                budgetDataSource.list(),
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
