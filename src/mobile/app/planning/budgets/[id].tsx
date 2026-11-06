/**
 * Budget Detail route for the Planning workspace.
 *
 * Demo mode reads the in-memory demo store; live mode reuses the existing
 * budget and transaction endpoints to derive weekly spending and recent
 * transactions for the selected category.
 */

import { fetchTransactions } from '@/api/transactions';
import BudgetDetailScreen from '@/components/planning/BudgetDetailScreen';
import { isDemoMode, planningBudgetDataSource } from '@/contracts';
import type { PlanningBudget } from '@/types/planning';
import { useLocale } from '@/contexts/LocaleContext';
import {
    recentBudgetTransactions,
    type PlanningTransactionItem,
    weeklyBudgetSpending,
} from '@/utils/planning';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PlanningScreen, planningStyles } from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';

/** Demo weekly spending shown for a sample budget detail. */
const DEMO_WEEKLY = [54, 89, 67, 103];

/** Demo recent transactions shown for a sample budget detail. */
const DEMO_RECENT: PlanningTransactionItem[] = [
    { id: 'demo-recent-1', title: 'Coffee Shop', dateLabel: 'Oct 28', amount: 4.5, icon: 'coffee', color: '#8492A4', bg: '#F3F6FA' },
    { id: 'demo-recent-2', title: 'Grocery Store', dateLabel: 'Oct 27', amount: 85.3, icon: 'shopping-basket', color: '#8492A4', bg: '#F3F6FA' },
    { id: 'demo-recent-3', title: 'Restaurant', dateLabel: 'Oct 26', amount: 32, icon: 'utensils', color: '#8492A4', bg: '#F3F6FA' },
];

/**
 * Render the Budget Detail route.
 *
 * @returns {JSX.Element} The Budget Detail screen.
 */
const BudgetDetailRoute = () => {
    const { language, currency } = useLocale();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [budget, setBudget] = useState<PlanningBudget | null>(null);
    const [weekly, setWeekly] = useState<number[]>([]);
    const [recent, setRecent] = useState<PlanningTransactionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                const next = await planningBudgetDataSource.get(id);
                if (!active) return;
                setBudget(next);
                if (!next) {
                    setWeekly([]);
                    setRecent([]);
                } else if (isDemoMode) {
                    setWeekly(DEMO_WEEKLY);
                    setRecent(DEMO_RECENT);
                } else {
                    const transactions = await fetchTransactions();
                    if (active) {
                        setWeekly(weeklyBudgetSpending(transactions, next.id));
                        setRecent(recentBudgetTransactions(transactions, next.id, language));
                    }
                }
            } catch {
                if (active) {
                    setBudget(null);
                    setWeekly([]);
                    setRecent([]);
                }
            }
            if (active) setLoading(false);
        };

        void load();
        return () => {
            active = false;
        };
    }, [id, language]);

    /**
     * Navigate back to the Budgets list, falling back to the Planning tab.
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={planningColors.emerald} />
            </View>
        );
    }

    if (!budget) {
        return (
            <PlanningScreen title="Budget" subtitle="Category budget details" onBack={handleBack}>
                <View style={styles.centered}>
                    <Text style={planningStyles.body}>Budget not found.</Text>
                </View>
            </PlanningScreen>
        );
    }

    return (
        <BudgetDetailScreen
            budget={budget}
            weeklyValues={weekly}
            transactions={recent}
            currency={currency}
            language={language}
            onBack={handleBack}
            onSeeAll={() => router.push('/(tabs)/transactions')}
        />
    );
};

/** Budget detail route styles. */
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: planningColors.background,
    },
});

export default BudgetDetailRoute;
