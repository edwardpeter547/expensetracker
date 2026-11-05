/**
 * Team-scoped finance tool screen.
 *
 * Presents demo Budgets, Savings Goals, Insights, Monthly Plan, and Cash Flow
 * content for one team. Labels change with the finance mode so pooled funds
 * are never shown as personal spend and independent teams never show a fake
 * pooled balance.
 */

import {
    PlanningIconTile,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { formatPlanningMoney, planningColors } from '@/components/planning/planningTheme';
import { TeamCard } from '@/components/teams/teamsPrimitives';
import type { Team } from '@/types/team';
import { StyleSheet, Text, View } from 'react-native';

/** Supported team finance pages. */
export type TeamFinancePage = 'budgets' | 'goals' | 'insights' | 'monthly-plan' | 'cash-flow';

/** Props for the team finance screen. */
export interface TeamFinanceScreenProps {
    team: Team;
    page: TeamFinancePage;
    currency: string;
    language: string;
    onBack: () => void;
}

/** Human titles for each finance page. */
const PAGE_TITLES: Record<TeamFinancePage, string> = {
    budgets: 'Budgets',
    goals: 'Savings Goals',
    insights: 'Insights',
    'monthly-plan': 'Monthly Plan',
    'cash-flow': 'Cash Flow',
};

/** Demo category budget rows for the team budget page. */
const DEMO_BUDGET_ROWS = [
    { name: 'Groceries', spent: 640, limit: 900, color: planningColors.emerald },
    { name: 'Housing', spent: 950, limit: 1200, color: planningColors.blue },
    { name: 'Transport', spent: 210, limit: 350, color: planningColors.orange },
];

/** Demo savings goals for the team goals page. */
const DEMO_GOALS = [
    { name: 'Emergency Fund', saved: 2100, target: 6000, color: planningColors.emerald },
    { name: 'Family Holiday', saved: 950, target: 3000, color: planningColors.blue },
];

/**
 * Render the team finance tool screen.
 *
 * @param {TeamFinanceScreenProps} props Component props.
 * @returns {JSX.Element} The finance screen.
 */
const TeamFinanceScreen = ({
    team,
    page,
    currency,
    language,
    onBack,
}: TeamFinanceScreenProps) => {
    const pooled = team.mode === 'POOLED';
    const pageTitle = PAGE_TITLES[page];

    return (
        <PlanningScreen title={pageTitle} subtitle={`${team.name} only`} onBack={onBack}>
            {page === 'budgets' ? (
                <TeamCard>
                    <Text style={planningStyles.muted}>
                        {pooled ? 'Pooled fund allocation' : 'Shared spending target'}
                    </Text>
                    <Text style={planningStyles.large}>
                        {formatPlanningMoney(team.spent, language, currency)} /{' '}
                        {formatPlanningMoney(team.budgetTarget, language, currency)}
                    </Text>
                    <PlanningProgress
                        value={team.budgetTarget > 0 ? Math.round((team.spent / team.budgetTarget) * 100) : 0}
                        color={pooled ? planningColors.emerald : planningColors.blue}
                    />
                    {DEMO_BUDGET_ROWS.map((row) => (
                        <View key={row.name} style={styles.row}>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <Text style={planningStyles.body}>{row.name}</Text>
                                <Text style={planningStyles.muted}>
                                    {formatPlanningMoney(row.spent, language, currency)} /{' '}
                                    {formatPlanningMoney(row.limit, language, currency)}
                                </Text>
                            </View>
                            <PlanningProgress value={Math.round((row.spent / row.limit) * 100)} color={row.color} />
                        </View>
                    ))}
                </TeamCard>
            ) : null}

            {page === 'goals' ? (
                <TeamCard>
                    {DEMO_GOALS.map((goal) => (
                        <View key={goal.name} style={styles.row}>
                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <Text style={planningStyles.body}>{goal.name}</Text>
                                <Text style={planningStyles.muted}>
                                    {formatPlanningMoney(goal.saved, language, currency)} of{' '}
                                    {formatPlanningMoney(goal.target, language, currency)}
                                </Text>
                            </View>
                            <PlanningProgress value={Math.round((goal.saved / goal.target) * 100)} color={goal.color} />
                        </View>
                    ))}
                    <Text style={styles.note}>
                        Team goals are tracked intentions. AuditWallet does not move or hold savings.
                    </Text>
                </TeamCard>
            ) : null}

            {page === 'insights' ? (
                <TeamCard>
                    <PlanningIconTile
                        icon="chart-no-axes-combined"
                        color={planningColors.purple}
                        bg={planningColors.purpleLight}
                    />
                    <Text style={planningStyles.large}>
                        {formatPlanningMoney(team.spent, language, currency)}
                    </Text>
                    <Text style={planningStyles.muted}>Team spending this month</Text>
                    {DEMO_BUDGET_ROWS.map((row) => (
                        <View key={row.name} style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                            <Text style={planningStyles.body}>{row.name}</Text>
                            <Text style={planningStyles.muted}>
                                {formatPlanningMoney(row.spent, language, currency)}
                            </Text>
                        </View>
                    ))}
                    <Text style={styles.note}>
                        Production insights will break down by category, period, and member using
                        team-scoped records only.
                    </Text>
                </TeamCard>
            ) : null}

            {page === 'monthly-plan' ? (
                <TeamCard>
                    <Text style={planningStyles.muted}>
                        {pooled ? 'Team allocation for the month' : 'Shared spending target for the month'}
                    </Text>
                    <Text style={planningStyles.large}>
                        {formatPlanningMoney(team.budgetTarget, language, currency)}
                    </Text>
                    {DEMO_BUDGET_ROWS.map((row) => (
                        <View key={row.name} style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                            <Text style={planningStyles.body}>{row.name}</Text>
                            <Text style={planningStyles.muted}>
                                {formatPlanningMoney(row.limit, language, currency)}
                            </Text>
                        </View>
                    ))}
                    <Text style={styles.note}>
                        Allocations are plans, not actual cash movement.
                    </Text>
                </TeamCard>
            ) : null}

            {page === 'cash-flow' ? (
                <TeamCard>
                    <Text style={planningStyles.muted}>
                        {pooled
                            ? 'Recorded fund outflows and projected commitments'
                            : 'Aggregate member spending activity'}
                    </Text>
                    <Text style={planningStyles.large}>
                        {formatPlanningMoney(team.spent, language, currency)}
                    </Text>
                    {DEMO_BUDGET_ROWS.map((row) => (
                        <View key={row.name} style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                            <Text style={planningStyles.body}>{row.name}</Text>
                            <Text style={planningStyles.muted}>
                                {formatPlanningMoney(row.spent, language, currency)}
                            </Text>
                        </View>
                    ))}
                    <Text style={styles.note}>
                        Planned costs are shown separately from actual cash movement.
                    </Text>
                </TeamCard>
            ) : null}

            <Text style={styles.note}>
                Preview data — not connected to the backend. Team records are demo-only.
            </Text>
        </PlanningScreen>
    );
};

/** Team Finance screen styles. */
const styles = StyleSheet.create({
    row: {
        gap: 8,
    },
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
    },
});

export default TeamFinanceScreen;
