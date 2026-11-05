/**
 * Budgets data hook for the Planning workspace.
 *
 * A single `DEMO_MODE` branch selects between the in-memory Planning demo
 * fixtures and the authenticated budget API. The hook owns loading and error
 * state and never mixes the two data sources.
 */

import { normalizeApiError } from '@/api/errors';
import { fetchBudgets } from '@/api/transactions';
import { DEMO_MODE } from '@/constants/dashboardDemo';
import { getDemoPlanningBudgets, type PlanningBudget } from '@/constants/planningDemo';
import { mapBudgetToPlanningBudget } from '@/utils/planning';
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

        if (DEMO_MODE) {
            if (requestSequence.current === sequence) {
                setBudgets(getDemoPlanningBudgets());
                setLoading(false);
            }
            return;
        }

        try {
            const next = await fetchBudgets();
            if (requestSequence.current === sequence) {
                setBudgets(next.map(mapBudgetToPlanningBudget));
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
