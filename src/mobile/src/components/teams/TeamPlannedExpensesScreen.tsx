/**
 * Team Planned Expenses screen.
 *
 * For pooled teams this hosts the request/approval workflow. For independent
 * teams it shows optional planned purchases without an approval requirement
 * and offers direct expense recording. Planned amounts are never treated as
 * actual spending.
 */

import {
    PlanningButton,
    PlanningIcon,
    PlanningIconTile,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { MoneyText } from '@/components/ui/MoneyText';
import { TeamCard, TeamSelectChips } from '@/components/teams/teamsPrimitives';
import type { Team, TeamPlannedRequest } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Pooled request filters. */
type RequestFilter = 'All' | 'Pending' | 'Approved' | 'Completed';

/** Filters shown above the pooled request list. */
const REQUEST_FILTERS: readonly RequestFilter[] = ['All', 'Pending', 'Approved', 'Completed'];

/** Props for the Team Planned Expenses screen. */
export interface TeamPlannedExpensesScreenProps {
    team: Team;
    requests: TeamPlannedRequest[];
    currency: string;
    language: string;
    onBack: () => void;
    onNewRequest: () => void;
    onOpenRequest: (requestId: string) => void;
    onRecordExpense: () => void;
}

/** Demo independent planned purchases. */
const INDEPENDENT_PLANS = [
    { id: 'plan-1', name: 'Family Shopping', amount: 300, date: 'Nov 8' },
    { id: 'plan-2', name: 'School Supplies', amount: 150, date: 'Nov 15' },
    { id: 'plan-3', name: 'Holiday Shopping', amount: 500, date: 'Dec 3' },
];

/**
 * Render the Team Planned Expenses screen.
 *
 * @param {TeamPlannedExpensesScreenProps} props Component props.
 * @returns {JSX.Element} The planned expenses screen.
 */
const TeamPlannedExpensesScreen = ({
    team,
    requests,
    currency,
    language,
    onBack,
    onNewRequest,
    onOpenRequest,
    onRecordExpense,
}: TeamPlannedExpensesScreenProps) => {
    const { t } = useTranslation('teams');
    const [filter, setFilter] = useState<RequestFilter>('All');
    const pooled = team.mode === 'POOLED';

    const visibleRequests = useMemo(
        () =>
            requests.filter(
                (request) =>
                    request.teamId === team.id
                    && (filter === 'All' || request.status === filter),
            ),
        [filter, requests, team.id],
    );
    const pendingCount = requests.filter(
        (request) => request.teamId === team.id && request.status === 'Pending',
    ).length;
    const approvedNotSpent = requests
        .filter((request) => request.teamId === team.id && request.status === 'Approved')
        .reduce((sum, request) => sum + request.estimatedAmount, 0);

    return (
        <PlanningScreen title={t('Planned Expenses')} subtitle={t('{{name}} · {{kind}}', { name: team.name, kind: t(team.kind) })} onBack={onBack}>
            {pooled ? (
                <>
                    <View style={styles.summaryRow}>
                        <TeamCard style={styles.summaryCard}>
                            <Text style={planningStyles.muted}>{t('Awaiting Approval')}</Text>
                            <Text style={planningStyles.large}>{pendingCount}</Text>
                            <Text style={styles.warnText}>{t('Needs review')}</Text>
                        </TeamCard>
                        <TeamCard style={styles.summaryCard}>
                            <Text style={planningStyles.muted}>{t('Approved, Not Spent')}</Text>
                            <MoneyText
                                value={approvedNotSpent}
                                currency={currency}
                                language={language}
                                style={planningStyles.large}
                            />
                            <Text style={styles.blueText}>{t('Pending completion')}</Text>
                        </TeamCard>
                    </View>

                    <TeamSelectChips
                        options={REQUEST_FILTERS.map((value) => ({ value, label: t(value) }))}
                        value={filter}
                        onChange={setFilter}
                    />

                    {visibleRequests.length === 0 ? (
                        <TeamCard>
                            <Text style={planningStyles.body}>{t('No matching requests.')}</Text>
                        </TeamCard>
                    ) : (
                        visibleRequests.map((request) => (
                            <Pressable
                                key={request.id}
                                accessibilityRole="button"
                                accessibilityLabel={request.name}
                                onPress={() => onOpenRequest(request.id)}
                            >
                                <TeamCard>
                                    <View style={[planningStyles.row, { gap: 12 }]}>
                                        <PlanningIconTile
                                            icon={requestStatusIcon(request.status)}
                                            color={requestStatusColor(request.status)}
                                            bg={requestStatusBackground(request.status)}
                                            size={42}
                                        />
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <Text style={planningStyles.body}>{request.name}</Text>
                                            <Text style={planningStyles.muted}>
                                                {t('Requested by {{name}}', { name: request.requesterName })}
                                            </Text>
                                        </View>
                                        <PlanningIcon name="chevron-right" color={planningColors.muted} />
                                    </View>
                                    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                        <MoneyText
                                            value={
                                                request.status === 'Completed'
                                                    ? (request.actualAmount ?? 0)
                                                    : request.estimatedAmount
                                            }
                                            currency={currency}
                                            language={language}
                                            style={planningStyles.body}
                                        />
                                        <Text
                                            style={[
                                                styles.statusText,
                                                { color: requestStatusColor(request.status) },
                                            ]}
                                        >
                                            {t(request.status)}
                                        </Text>
                                    </View>
                                </TeamCard>
                            </Pressable>
                        ))
                    )}

                    <PlanningButton label={t('Request Planned Expense')} onPress={onNewRequest} />

                    <TeamCard style={styles.infoCard}>
                        <PlanningIcon name="shield-check" color="#315D75" size={20} />
                        <Text style={styles.infoTitle}>{t('Approval is not payment')}</Text>
                        <Text style={styles.infoText}>
                            {t('Approved requests remain planned until the requester confirms actual expenditure. Only completion creates a recorded expense.')}
                        </Text>
                    </TeamCard>
                </>
            ) : (
                <>
                    <TeamCard>
                        <Text style={planningStyles.muted}>{t('Upcoming Planned Purchases')}</Text>
                        <MoneyText
                            value={INDEPENDENT_PLANS.reduce((sum, plan) => sum + plan.amount, 0)}
                            currency={currency}
                            language={language}
                            style={planningStyles.large}
                        />
                        {INDEPENDENT_PLANS.map((plan) => (
                            <View key={plan.id} style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={planningStyles.body}>{plan.name}</Text>
                                    <Text style={planningStyles.muted}>{plan.date}</Text>
                                </View>
                                <MoneyText
                                    value={plan.amount}
                                    currency={currency}
                                    language={language}
                                    style={planningStyles.body}
                                />
                            </View>
                        ))}
                    </TeamCard>

                    <TeamCard style={styles.infoCard}>
                        <PlanningIcon name="shield-check" color="#315D75" size={20} />
                        <Text style={styles.infoTitle}>{t('No approval required')}</Text>
                        <Text style={styles.infoText}>
                            {t('Members may plan purchases or record expenses directly. Planned amounts are not money already spent.')}
                        </Text>
                    </TeamCard>

                    <PlanningButton label={t('Record Team Expense')} onPress={onRecordExpense} />
                </>
            )}

            <Text style={styles.note}>
                {t('Preview data only — requests and planned purchases are not persisted.')}
            </Text>
        </PlanningScreen>
    );
};

/**
 * Return the Ionicons glyph for a request status.
 *
 * @param {TeamPlannedRequest['status']} status The request status.
 * @returns {Parameters<typeof PlanningIconTile>[0]['icon']} The glyph.
 */
const requestStatusIcon = (
    status: TeamPlannedRequest['status'],
): Parameters<typeof PlanningIconTile>[0]['icon'] => {
    switch (status) {
        case 'Pending':
            return 'time';
        case 'Approved':
            return 'clipboard';
        case 'Completed':
            return 'checkmark-circle';
        default:
            return 'close-circle';
    }
};

/**
 * Return the accent color for a request status.
 *
 * @param {TeamPlannedRequest['status']} status The request status.
 * @returns {string} The accent color.
 */
const requestStatusColor = (status: TeamPlannedRequest['status']): string => {
    switch (status) {
        case 'Pending':
            return planningColors.orange;
        case 'Approved':
            return planningColors.blue;
        case 'Completed':
            return planningColors.emerald;
        default:
            return planningColors.muted;
    }
};

/**
 * Return the tinted background for a request status.
 *
 * @param {TeamPlannedRequest['status']} status The request status.
 * @returns {string} The tinted background.
 */
const requestStatusBackground = (status: TeamPlannedRequest['status']): string => {
    switch (status) {
        case 'Pending':
            return planningColors.orangeLight;
        case 'Approved':
            return planningColors.blueLight;
        case 'Completed':
            return planningColors.emeraldLight;
        default:
            return '#F0F3F8';
    }
};

/** Team Planned Expenses screen styles. */
const styles = StyleSheet.create({
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    summaryCard: {
        flex: 1,
    },
    warnText: {
        fontSize: 12,
        color: '#A96E26',
    },
    blueText: {
        fontSize: 12,
        color: planningColors.blue,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '800',
    },
    infoCard: {
        backgroundColor: '#EAF5F9',
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#315D75',
    },
    infoText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#5D798C',
    },
    note: {
        textAlign: 'center',
        fontSize: 12,
        color: planningColors.muted,
    },
});

export default TeamPlannedExpensesScreen;
