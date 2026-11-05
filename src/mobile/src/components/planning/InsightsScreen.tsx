/**
 * Insights screen for the Planning workspace.
 *
 * Spending comparisons use illustrative data until an insights endpoint or a
 * transaction-derived mapping is available.
 */

import { PLANNING_DEMO_INSIGHT_CATEGORIES } from '@/constants/planningDemo';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    PlanningCard,
    PlanningIconTile,
    PlanningLineChart,
    PlanningPreviewNote,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/** Reporting periods offered by the Insights selector. */
type InsightPeriod = 'Monthly' | 'Quarterly' | 'Yearly';

/** Illustrative total spending per period. */
const PERIOD_TOTALS: Record<InsightPeriod, number> = {
    Monthly: 1234.56,
    Quarterly: 3890.2,
    Yearly: 14820,
};

/** Illustrative monthly spending trend values and labels. */
const TREND_VALUES = [45, 76, 61, 90, 72, 105];
const TREND_LABELS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

/**
 * Render the Insights screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Insights screen.
 */
const InsightsScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const [period, setPeriod] = useState<InsightPeriod>('Monthly');

    return (
        <PlanningScreen
            title="Insights"
            subtitle="Understand where your money goes"
            onBack={onBack}
        >
            <PlanningCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>Spending Analysis</Text>
                    <View style={[planningStyles.row, { gap: 6 }]}>
                        {(['Monthly', 'Quarterly', 'Yearly'] as const).map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setPeriod(option)}
                                accessibilityRole="button"
                                accessibilityLabel={option}
                                style={{
                                    backgroundColor: option === period ? planningColors.emeraldLight : '#F5F7FA',
                                    padding: 6,
                                    borderRadius: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: option === period ? planningColors.emerald : planningColors.muted,
                                        fontWeight: option === period ? '700' : '600',
                                    }}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <Text style={planningStyles.large}>
                    {formatPlanningMoney(PERIOD_TOTALS[period], language, currency)}
                </Text>
                <Text style={{ color: '#D47C45', fontSize: 12 }}>↗ 12% more than previous period</Text>
                <PlanningLineChart values={TREND_VALUES} labels={TREND_LABELS} />
            </PlanningCard>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <PlanningCard style={{ flex: 1 }}>
                    <PlanningIconTile
                        icon="trending-up"
                        color={planningColors.orange}
                        bg={planningColors.orangeLight}
                        size={38}
                    />
                    <Text style={planningStyles.muted}>Highest Category</Text>
                    <Text style={planningStyles.body}>Food & Drinks</Text>
                    <Text style={{ color: planningColors.orange, fontWeight: '700' }}>
                        {formatPlanningMoney(450, language, currency)}
                    </Text>
                </PlanningCard>
                <PlanningCard style={{ flex: 1 }}>
                    <PlanningIconTile
                        icon="trending-down"
                        color={planningColors.emerald}
                        bg={planningColors.emeraldLight}
                        size={38}
                    />
                    <Text style={planningStyles.muted}>Biggest Reduction</Text>
                    <Text style={planningStyles.body}>Transport</Text>
                    <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>−8%</Text>
                </PlanningCard>
            </View>

            <PlanningCard>
                <Text style={planningStyles.heading}>Spending by Category</Text>
                {PLANNING_DEMO_INSIGHT_CATEGORIES.map((category) => (
                    <View key={category.name} style={{ gap: 8 }}>
                        <View style={[planningStyles.row, { gap: 10 }]}>
                            <PlanningIconTile
                                icon={category.icon}
                                color={category.color}
                                bg={`${category.color}22`}
                                size={38}
                            />
                            <Text style={[planningStyles.body, { flex: 1 }]}>{category.name}</Text>
                            <Text style={planningStyles.body}>
                                {formatPlanningMoney(category.amount, language, currency)}
                            </Text>
                        </View>
                        <PlanningProgress value={category.pct * 2.4} color={category.color} />
                    </View>
                ))}
            </PlanningCard>

            <PlanningPreviewNote />
        </PlanningScreen>
    );
};

export default InsightsScreen;
