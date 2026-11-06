/**
 * Budgets list route for the Planning workspace.
 *
 * Reuses the existing budget API for real data and the in-memory demo store in
 * demo mode. Create-budget is a demo-only interaction.
 */

import BudgetsScreen from '@/components/planning/BudgetsScreen';
import { isDemoMode, planningBudgetDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlanningBudgets } from '@/hooks/usePlanningBudgets';
import { router } from 'expo-router';
import { useState } from 'react';

/**
 * Render the Budgets list route.
 *
 * @returns {JSX.Element} The Budgets screen.
 */
const BudgetsRoute = () => {
    const { language, currency } = useLocale();
    const { budgets, loading, error, refresh } = usePlanningBudgets();
    const [notice, setNotice] = useState<string | null>(
        isDemoMode ? 'Preview — new budgets are saved in memory only.' : null,
    );

    /**
     * Add a budget for demo mode or explain the missing live integration.
     *
     * @param {string} name The category name.
     * @param {number} limit The monthly limit.
     * @returns {void}
     */
    const handleCreate = async (name: string, limit: number): Promise<void> => {
        try {
            await planningBudgetDataSource.create(name, limit);
            void refresh();
        } catch (cause) {
            setNotice(
                cause instanceof Error
                    ? cause.message
                    : 'Creating budgets is UI-only and unavailable without demo mode.',
            );
        }
    };

    /**
     * Navigate back to the Planning dashboard, falling back to the tab.
     *
     * @returns {void}
     */
    const handleBack = (): void => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/budgets');
        }
    };

    return (
        <BudgetsScreen
            budgets={budgets}
            loading={loading}
            error={error}
            currency={currency}
            language={language}
            notice={notice}
            onBack={handleBack}
            onRetry={() => void refresh()}
            onSelectBudget={(id) => router.push(`/planning/budgets/${id}`)}
            onCreate={handleCreate}
        />
    );
};

export default BudgetsRoute;
