/**
 * Planned Expenses screen for the Planning workspace.
 *
 * Planned expenses are future commitments, not completed transactions, and
 * remain demo-only until a backend model exists.
 */

import { planningDataSource } from '@/contracts';
import type { PlannedExpense, PlannedExpenseStatus } from '@/types/planning';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    PlanningButton,
    PlanningCard,
    PlanningField,
    PlanningIconTile,
    PlanningModalPanel,
    PlanningPreviewNote,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/** Planned-expense filter options, including the supported statuses. */
type ExpenseFilter = 'All' | PlannedExpenseStatus;

/** Filter chips shown above the expense list. */
const FILTERS: readonly ExpenseFilter[] = ['All', 'Upcoming', 'Saving', 'Completed'];

/**
 * Render the Planned Expenses screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Planned Expenses screen.
 */
const PlannedExpensesScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const [items, setItems] = useState<PlannedExpense[]>([]);
    const [filter, setFilter] = useState<ExpenseFilter>('All');
    const [show, setShow] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        let active = true;
        planningDataSource.plannedExpenses().then((expenses) => {
            if (active) setItems(expenses);
        });
        return () => {
            active = false;
        };
    }, []);

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const visibleItems = filter === 'All' ? items : items.filter((item) => item.status === filter);

    const submit = async () => {
        const numericAmount = Number(amount);
        if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
        await planningDataSource.addPlannedExpense(name, numericAmount);
        setItems(await planningDataSource.plannedExpenses());
        setName('');
        setAmount('');
        setShow(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <PlanningScreen
                title="Planned Expenses"
                subtitle="Prepare for upcoming costs"
                onBack={onBack}
                onAction={() => setShow(true)}
            >
                <PlanningCard>
                    <View style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIconTile
                            icon="calendar-clock"
                            color={planningColors.orange}
                            bg={planningColors.orangeLight}
                        />
                        <View>
                            <Text style={planningStyles.muted}>Total Planned Expenses</Text>
                            <Text style={planningStyles.large}>
                                {formatPlanningMoney(total, language, currency)}
                            </Text>
                        </View>
                    </View>
                    <Text style={planningStyles.muted}>{items.length} upcoming items</Text>
                </PlanningCard>

                <View style={{ flexDirection: 'row', gap: 9 }}>
                    {FILTERS.map((option) => {
                        const active = filter === option;
                        return (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setFilter(option)}
                                accessibilityRole="button"
                                accessibilityLabel={option}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: active ? planningColors.emeraldLight : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: active ? '#A3D9C1' : planningColors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        color: active ? planningColors.emerald : planningColors.muted,
                                        fontWeight: active ? '700' : '600',
                                        fontSize: 14,
                                    }}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={planningStyles.heading}>Future Expenses</Text>
                {visibleItems.length === 0 ? (
                    <PlanningCard>
                        <Text style={planningStyles.body}>No matching planned expenses.</Text>
                    </PlanningCard>
                ) : (
                    visibleItems.map((item) => (
                        <PlanningCard key={item.id}>
                            <View style={[planningStyles.row, { gap: 12 }]}>
                                <PlanningIconTile icon={item.icon} color={item.color} bg={item.bg} />
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={planningStyles.body}>{item.name}</Text>
                                    <Text style={planningStyles.muted}>Target date: {item.date}</Text>
                                </View>
                            </View>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <Text style={planningStyles.heading}>
                                    {formatPlanningMoney(item.amount, language, currency)}
                                </Text>
                                <Text
                                    style={{
                                        color: item.status === 'Saving'
                                            ? planningColors.blue
                                            : item.status === 'Completed'
                                                ? planningColors.emerald
                                                : planningColors.orange,
                                        fontWeight: '700',
                                    }}
                                >
                                    {item.status}
                                </Text>
                            </View>
                        </PlanningCard>
                    ))
                )}

                <PlanningButton label="＋ Add Planned Expense" outline onPress={() => setShow(true)} />
                <PlanningPreviewNote />
            </PlanningScreen>

            {show ? (
                <PlanningModalPanel title="Add Planned Expense" onClose={() => setShow(false)}>
                    <PlanningField
                        label="Expense name"
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Annual Insurance"
                    />
                    <PlanningField
                        label="Estimated amount"
                        value={amount}
                        onChange={setAmount}
                        keyboardType="numeric"
                    />
                    <PlanningPreviewNote />
                    <PlanningButton label="Save" onPress={submit} />
                </PlanningModalPanel>
            ) : null}
        </View>
    );
};

export default PlannedExpensesScreen;
