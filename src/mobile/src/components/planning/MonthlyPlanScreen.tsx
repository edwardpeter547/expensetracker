/**
 * Monthly Plan screen for the Planning workspace.
 *
 * The allocations are intended plans, not actual spending. Editing and saving
 * remain a future integration.
 */

import { planningDataSource } from '@/contracts';
import type { PlanningAllocation } from '@/types/planning';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MoneyText } from '@/components/ui/MoneyText';
import {
    PlanningCard,
    PlanningIconTile,
    PlanningPreviewNote,
    PlanningProgress,
    PlanningScreen,
    PlanningStat,
    planningStyles,
} from './PlanningUI';
import { planningColors } from './planningTheme';

/**
 * Render the Monthly Plan screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Monthly Plan screen.
 */
const MonthlyPlanScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const { t } = useTranslation('planning');
    const [allocations, setAllocations] = useState<PlanningAllocation[]>([]);
    const [income, setIncome] = useState(0);

    useEffect(() => {
        let active = true;
        planningDataSource.monthlyPlan().then((plan) => {
            if (!active) return;
            setAllocations(plan.allocations);
            setIncome(plan.income);
        });
        return () => {
            active = false;
        };
    }, []);

    const allocated = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    const unallocated = income - allocated;
    const allocationPercent = income > 0 ? Math.round((allocated / income) * 100) : 0;

    return (
        <PlanningScreen title={t('Monthly Plan')} subtitle={t('Give every pound a purpose')} onBack={onBack}>
            <PlanningCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <View>
                        <Text style={planningStyles.muted}>{t('Planned Monthly Income')}</Text>
                        <MoneyText
                            value={income}
                            currency={currency}
                            language={language}
                            style={planningStyles.large}
                        />
                    </View>
                    <PlanningIconTile
                        icon="wallet"
                        color={planningColors.emerald}
                        bg={planningColors.emeraldLight}
                    />
                </View>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <PlanningStat
                        label={t('Allocated')}
                        value={(
                            <MoneyText
                                value={allocated}
                                currency={currency}
                                language={language}
                                style={planningStyles.heading}
                            />
                        )}
                    />
                    <PlanningStat
                        label={t('Unallocated')}
                        value={(
                            <MoneyText
                                value={unallocated}
                                currency={currency}
                                language={language}
                                style={[planningStyles.heading, { color: planningColors.emerald }]}
                            />
                        )}
                        color={planningColors.emerald}
                    />
                </View>
                <PlanningProgress value={allocationPercent} />
            </PlanningCard>

            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.heading}>{t('Your Allocations')}</Text>
                <Text style={planningStyles.muted}>November 2026</Text>
            </View>

            <PlanningCard>
                {allocations.map((allocation) => (
                    <View key={allocation.name} style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIconTile
                            icon={allocation.icon}
                            color={allocation.color}
                            bg={allocation.bg}
                            size={42}
                        />
                        <Text style={[planningStyles.body, { flex: 1 }]}>{allocation.name}</Text>
                        <MoneyText
                            value={allocation.amount}
                            currency={currency}
                            language={language}
                            style={planningStyles.body}
                        />
                    </View>
                ))}
            </PlanningCard>

            <PlanningCard style={{ backgroundColor: planningColors.emeraldLight }}>
                <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>✓ Room in your plan</Text>
                <Text style={planningStyles.muted}>
                    {t('youStillHave')}{' '}
                    <MoneyText
                        value={unallocated}
                        currency={currency}
                        language={language}
                        style={planningStyles.muted}
                    />
                    {' '}{t('availableToAllocateMonth')}
                </Text>
            </PlanningCard>

            <PlanningPreviewNote />
        </PlanningScreen>
    );
};

export default MonthlyPlanScreen;
