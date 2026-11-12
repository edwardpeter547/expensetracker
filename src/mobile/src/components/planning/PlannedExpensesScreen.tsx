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
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/components/ui/MoneyText';
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
import { planningColors } from './planningTheme';

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
    const { t } = useTranslation('planning');
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
                title={t('Planned Expenses')}
                subtitle={t('Prepare for upcoming costs')}
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
                            <Text style={planningStyles.muted}>{t('Total Planned Expenses')}</Text>
                            <MoneyText
                                value={total}
                                currency={currency}
                                language={language}
                                style={planningStyles.large}
                            />
                        </View>
                    </View>
                    <Text style={planningStyles.muted}>{t('upcomingItems', {count: items.length})}</Text>
                </PlanningCard>

                <View style={{ flexDirection: 'row', gap: 9 }}>
                    {FILTERS.map((option) => {
                        const active = filter === option;
                        return (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setFilter(option)}
                                accessibilityRole="button"
                                accessibilityLabel={t(option)}
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
                                    {t(option)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={planningStyles.heading}>{t('Future Expenses')}</Text>
                {visibleItems.length === 0 ? (
                    <PlanningCard>
                        <Text style={planningStyles.body}>{t('No matching planned expenses.')}</Text>
                    </PlanningCard>
                ) : (
                    visibleItems.map((item) => (
                        <PlanningCard key={item.id}>
                            <View style={[planningStyles.row, { gap: 12 }]}>
                                <PlanningIconTile icon={item.icon} color={item.color} bg={item.bg} />
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={planningStyles.body}>{item.name}</Text>
                                    <Text style={planningStyles.muted}>{t('Target date: {{date}}', {date: item.date})}</Text>
                                </View>
                            </View>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <MoneyText
                                    value={item.amount}
                                    currency={currency}
                                    language={language}
                                    style={planningStyles.heading}
                                />
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
                                    {t(item.status)}
                                </Text>
                            </View>
                        </PlanningCard>
                    ))
                )}

                <PlanningButton label={t('＋ Add Planned Expense')} outline onPress={() => setShow(true)} />
                <PlanningPreviewNote />
            </PlanningScreen>

            {show ? (
                <PlanningModalPanel title={t('Add Planned Expense')} onClose={() => setShow(false)}>
                    <PlanningField
                        label={t('Expense name')}
                        value={name}
                        onChange={setName}
                        placeholder={t('e.g. Annual Insurance')}
                    />
                    <PlanningField
                        label={t('Estimated amount')}
                        value={amount}
                        onChange={setAmount}
                        keyboardType="numeric"
                    />
                    <PlanningPreviewNote />
                    <PlanningButton label={t('Save')} onPress={submit} />
                </PlanningModalPanel>
            ) : null}
        </View>
    );
};

export default PlannedExpensesScreen;
