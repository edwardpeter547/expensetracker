/**
 * Budgets data hook for the Planning workspace.
 *
 * Loads Planning budgets through the resolved `planningBudgetDataSource`. The
 * hook owns loading and error state.
 */

import { normalizeApiError } from '@/api/errors';
import { planningBudgetDataSource } from '@/contracts';
import type { PlanningBudget } from '@/types/planning';
import { useCallback, useEffect, useRef, useState } from 'react';

/** State exposed by the Planning budgets hook. */
export interface UsePlanningBudgetsResult {
    budgets: PlanningBudget[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Load the Planning budgets, or demo budgets in demo mode.
 *
 * @returns {UsePlanningBudgetsResult} Loading/error state and a refresh action.
 */
export const usePlanningBudgets = (): UsePlanningBudgetsResult => {
    const [budgets, setBudgets] = useState<PlanningBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestSequence = useRef(0);

    const load = useCallback(async (): Promise<void> => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setError(null);

        try {
            const next = await planningBudgetDataSource.list();
            if (requestSequence.current === sequence) {
                setBudgets(next);
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

    return { budgets, loading, error, refresh: load };
};
