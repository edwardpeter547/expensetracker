/**
 * The approved Planning Dashboard V1 landing screen.
 *
 * The layout is frozen: period selector, large budget overview, two side-by-side
 * summary cards, and a two-column grid of six tool cards. Only routing and
 * locale-aware money formatting are adapted for the existing app.
 */

import { planningDataSource } from '@/contracts';
import type {
    PlanningPeriodKey,
    PlanningPeriodSummary,
    PlanningTool,
} from '@/types/planning';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    PlanningCard,
    PlanningIcon,
    PlanningIconTile,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/** Period selector entries shown above the dashboard summary. */
const PERIOD_OPTIONS: readonly [PlanningPeriodKey, string][] = [
    ['month', 'This Month'],
    ['last', 'Last Month'],
    ['year', 'This Year'],
];

/** Accent for the Goals Saved summary card. */
const SUMMARY_GOALS_COLOR = '#2BAE78';
/** Accent background for the Goals Saved summary card. */
const SUMMARY_GOALS_BG = '#E5F7EE';
/** Accent for the Spending Trend summary card. */
const SUMMARY_TREND_COLOR = '#6C5CE7';
/** Accent background for the Spending Trend summary card. */
const SUMMARY_TREND_BG = '#EFEDFC';

/** Title style for the two compact summary cards. */
const summaryTitleStyle = {
    fontSize: 14,
    fontWeight: '700',
    color: planningColors.text,
    flexShrink: 1,
} as const;

/**
 * Render the Planning dashboard.
 *
 * @param {object} props Screen props.
 * @param {string} props.currency The ISO 4217 currency.
 * @param {string} props.language The display locale.
 * @param {(key: string) => void} props.onOpenTool Opens a selected tool.
 * @param {() => void} [props.onBack] Navigates back from the dashboard.
 * @returns {JSX.Element} The dashboard.
 */
const PlanningDashboard = ({
    currency,
    language,
    onOpenTool,
    onBack,
}: {
    currency: string;
    language: string;
    onOpenTool: (key: string) => void;
    onBack?: () => void;
}) => {
    const [period, setPeriod] = useState<PlanningPeriodKey>('month');
    const [summaries, setSummaries] = useState<Record<PlanningPeriodKey, PlanningPeriodSummary>>({
        month: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
        last: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
        year: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
    });
    const [tools, setTools] = useState<PlanningTool[]>([]);

    useEffect(() => {
        let active = true;
        planningDataSource.tools().then((items) => {
            if (active) setTools(items);
        });
        planningDataSource.summaries().then((items) => {
            if (active) setSummaries(items);
        });
        return () => {
            active = false;
        };
    }, []);

    const summary = summaries[period];
    const spentPercent = Math.round((summary.spent / summary.budget) * 100);
    const goalsPercent = Math.round((summary.saved / summary.goal) * 100);

    return (
        <PlanningScreen title="Planning" subtitle="Your money, thoughtfully planned." onBack={onBack}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {PERIOD_OPTIONS.map(([id, label]) => {
                    const active = period === id;
                    return (
                        <TouchableOpacity
                            key={id}
                            onPress={() => setPeriod(id)}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            style={{
                                flex: 1,
                                backgroundColor: active ? planningColors.emeraldLight : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: active ? '#9DD9BD' : planningColors.border,
                                borderRadius: 12,
                                paddingVertical: 11,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: active ? '700' : '600',
                                    color: active ? planningColors.emerald : planningColors.muted,
                                }}
                            >
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <PlanningCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <View style={[planningStyles.row, { gap: 9 }]}>
                        <PlanningIconTile
                            icon="wallet"
                            color={planningColors.emerald}
                            bg={planningColors.emeraldLight}
                            size={38}
                        />
                        <Text style={planningStyles.body}>Budget Overview</Text>
                    </View>
                    <Text style={{ color: planningColors.emerald, fontSize: 12, fontWeight: '700' }}>
                        On track
                    </Text>
                </View>
                <View style={[planningStyles.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
                    <View>
                        <Text style={planningStyles.muted}>Total spent</Text>
                        <Text style={planningStyles.large}>
                            {formatPlanningMoney(summary.spent, language, currency)}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={planningStyles.muted}>Budget limit</Text>
                        <Text style={planningStyles.body}>
                            {formatPlanningMoney(summary.budget, language, currency)}
                        </Text>
                    </View>
                </View>
                <PlanningProgress value={spentPercent} />
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>{spentPercent}% used</Text>
                    <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>
                        {formatPlanningMoney(summary.budget - summary.spent, language, currency)} remaining
                    </Text>
                </View>
            </PlanningCard>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <PlanningCard style={{ flex: 1, gap: 10, padding: 14 }}>
                    <View style={[planningStyles.row, { gap: 7 }]}>
                        <PlanningIconTile
                            icon="target"
                            color={SUMMARY_GOALS_COLOR}
                            bg={SUMMARY_GOALS_BG}
                            size={26}
                        />
                        <Text numberOfLines={1} style={summaryTitleStyle}>
                            Goals Saved
                        </Text>
                    </View>
                    <Text style={planningStyles.large}>
                        {formatPlanningMoney(summary.saved, language, currency)}
                    </Text>
                    <PlanningProgress value={goalsPercent} color={SUMMARY_GOALS_COLOR} />
                    <Text style={planningStyles.muted}>{goalsPercent}% of targets</Text>
                </PlanningCard>
                <PlanningCard style={{ flex: 1, gap: 10, padding: 14 }}>
                    <View style={[planningStyles.row, { gap: 7 }]}>
                        <PlanningIconTile
                            icon="chart-no-axes-combined"
                            color={SUMMARY_TREND_COLOR}
                            bg={SUMMARY_TREND_BG}
                            size={26}
                        />
                        <Text numberOfLines={1} style={summaryTitleStyle}>
                            Spending Trend
                        </Text>
                    </View>
                    <Text style={planningStyles.large}>
                        {summary.change > 0 ? '+' : ''}
                        {summary.change}%
                    </Text>
                    <Text style={planningStyles.muted}>vs. prior period</Text>
                </PlanningCard>
            </View>

            <View style={{ gap: 5, marginTop: 5 }}>
                <Text style={planningStyles.heading}>Your Planning Tools</Text>
                <Text style={planningStyles.muted}>Everything you need to plan ahead</Text>
            </View>
            <View
                style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    rowGap: 12,
                }}
            >
                {tools.map((tool) => (
                    <TouchableOpacity
                        key={tool.key}
                        onPress={() => onOpenTool(tool.key)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={tool.name}
                        style={[
                            {
                                backgroundColor: planningColors.surface,
                                borderRadius: 22,
                                borderWidth: 1,
                                borderColor: planningColors.border,
                                padding: 18,
                                width: '48%',
                                minHeight: 152,
                                justifyContent: 'space-between',
                            },
                        ]}
                    >
                        <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                            <PlanningIconTile icon={tool.icon} color={tool.color} bg={tool.bg} />
                            <View
                                style={{
                                    height: 28,
                                    width: 28,
                                    borderRadius: 14,
                                    backgroundColor: tool.bg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <PlanningIcon name="chevron-right" color={tool.color} size={16} />
                            </View>
                        </View>
                        <View style={{ gap: 5 }}>
                            <Text style={planningStyles.body}>{tool.name}</Text>
                            <Text style={planningStyles.muted}>{tool.desc}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </PlanningScreen>
    );
};

export default PlanningDashboard;
