/**
 * Budgets list screen for the Planning workspace.
 *
 * Shows an overall budget summary and per-category budget cards. Create-budget
 * is a demo-only interaction unless the caller marks it available.
 */

import type { PlanningBudget } from '@/constants/planningDemo';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    PlanningButton,
    PlanningCard,
    PlanningField,
    PlanningIcon,
    PlanningIconTile,
    PlanningModalPanel,
    PlanningProgress,
    PlanningScreen,
    PlanningStat,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/**
 * Render the Budgets list screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Budgets screen.
 */
const BudgetsScreen = ({
    budgets,
    loading,
    error,
    currency,
    language,
    notice,
    onBack,
    onRetry,
    onSelectBudget,
    onCreate,
}: {
    budgets: PlanningBudget[];
    loading: boolean;
    error: string | null;
    currency: string;
    language: string;
    notice: string | null;
    onBack: () => void;
    onRetry: () => void;
    onSelectBudget: (id: string) => void;
    onCreate: (name: string, limit: number) => void;
}) => {
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');

    const total = budgets.reduce((sum, budget) => sum + budget.limit, 0);
    const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const usedPercent = total > 0 ? Math.round((spent / total) * 100) : 0;

    const submitCreate = () => {
        const numericLimit = Number(limit);
        if (!name.trim() || !Number.isFinite(numericLimit) || numericLimit <= 0) return;
        onCreate(name, numericLimit);
        setName('');
        setLimit('');
        setShowCreate(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <PlanningScreen
                title="Budgets"
                subtitle="Manage your spending limits"
                onBack={onBack}
                onAction={() => setShowCreate(true)}
            >
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={planningColors.emerald} />
                    </View>
                ) : error ? (
                    <PlanningCard>
                        <Text style={planningStyles.body}>{error}</Text>
                        <PlanningButton label="Try Again" onPress={onRetry} />
                    </PlanningCard>
                ) : (
                    <>
                        <PlanningCard>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <PlanningIconTile
                                    icon="wallet"
                                    color={planningColors.emerald}
                                    bg={planningColors.emeraldLight}
                                />
                                <Text style={{ color: planningColors.emerald, fontWeight: '700', fontSize: 12 }}>
                                    On Track
                                </Text>
                            </View>
                            <Text style={planningStyles.muted}>Total Monthly Budget</Text>
                            <Text style={planningStyles.large}>
                                {formatPlanningMoney(total, language, currency)}
                            </Text>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <PlanningStat label="Spent so far" value={formatPlanningMoney(spent, language, currency)} />
                                <PlanningStat
                                    label="Remaining"
                                    value={formatPlanningMoney(total - spent, language, currency)}
                                    color={planningColors.emerald}
                                />
                            </View>
                            <PlanningProgress value={usedPercent} />
                            <Text style={planningStyles.muted}>{usedPercent}% of budget used</Text>
                        </PlanningCard>

                        <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                            <Text style={planningStyles.heading}>Budget Categories</Text>
                            <Text style={planningStyles.muted}>{budgets.length} active</Text>
                        </View>

                        {budgets.length === 0 ? (
                            <PlanningCard>
                                <Text style={planningStyles.body}>No budgets yet.</Text>
                                <Text style={planningStyles.muted}>
                                    Create your first budget to start tracking a category.
                                </Text>
                            </PlanningCard>
                        ) : (
                            budgets.map((item) => {
                                const itemPercent = item.limit > 0
                                    ? Math.round((item.spent / item.limit) * 100)
                                    : 0;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => onSelectBudget(item.id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={item.name}
                                    >
                                        <PlanningCard>
                                            <View style={[planningStyles.row, { gap: 12 }]}>
                                                <PlanningIconTile icon={item.icon} color={item.color} bg={item.bg} />
                                                <View style={{ flex: 1, gap: 5 }}>
                                                    <Text style={planningStyles.body}>{item.name}</Text>
                                                    <Text style={planningStyles.muted}>
                                                        {formatPlanningMoney(item.spent, language, currency)} spent of{' '}
                                                        {formatPlanningMoney(item.limit, language, currency)}
                                                    </Text>
                                                </View>
                                                <PlanningIcon name="chevron-right" color="#A1ADBD" />
                                            </View>
                                            <PlanningProgress value={itemPercent} color={item.color} />
                                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                                <Text style={planningStyles.muted}>{itemPercent}% used</Text>
                                                <Text style={planningStyles.muted}>
                                                    {formatPlanningMoney(item.limit - item.spent, language, currency)} left
                                                </Text>
                                            </View>
                                        </PlanningCard>
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        <PlanningButton label="＋ Create New Budget" outline onPress={() => setShowCreate(true)} />
                    </>
                )}
            </PlanningScreen>

            {showCreate ? (
                <PlanningModalPanel title="Create New Budget" onClose={() => setShowCreate(false)}>
                    <PlanningField
                        label="Budget category"
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Health & Fitness"
                    />
                    <PlanningField
                        label="Monthly limit"
                        value={limit}
                        onChange={setLimit}
                        keyboardType="numeric"
                        placeholder="250"
                    />
                    {notice ? <Text style={styles.modalNotice}>{notice}</Text> : null}
                    <PlanningButton label="Create Budget" onPress={submitCreate} />
                </PlanningModalPanel>
            ) : null}
        </View>
    );
};

/** Budgets screen local styles. */
const styles = StyleSheet.create({
    centered: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    modalNotice: {
        fontSize: 12,
        color: planningColors.muted,
    },
});

export default BudgetsScreen;
