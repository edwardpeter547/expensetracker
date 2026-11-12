/**
 * Pooled planned-expense request creation and detail screens.
 *
 * The detail screen keeps approval and completion separate: approval changes
 * status only, while completion records an actual amount. Rejected and
 * canceled requests remain visible history without becoming expenses.
 */

import {
    PlanningButton,
    PlanningField,
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { MoneyText } from '@/components/ui/MoneyText';
import { TeamCard } from '@/components/teams/teamsPrimitives';
import type { Team, TeamPlannedRequest } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the new request screen. */
export interface TeamNewRequestScreenProps {
    team: Team;
    onBack: () => void;
    onSubmit: (input: {
        name: string;
        description?: string;
        estimatedAmount: number;
        plannedDate?: string;
    }) => void;
}

/**
 * Render the new pooled request form.
 *
 * @param {TeamNewRequestScreenProps} props Component props.
 * @returns {JSX.Element} The new request screen.
 */
export const TeamNewRequestScreen = ({ team, onBack, onSubmit }: TeamNewRequestScreenProps) => {
    const { t } = useTranslation('teams');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [plannedDate, setPlannedDate] = useState('');

    const submit = () => {
        const numericAmount = Number(amount);
        if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
        onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            estimatedAmount: numericAmount,
            plannedDate: plannedDate.trim() || undefined,
        });
    };

    return (
        <PlanningScreen title={t('New Expense Request')} subtitle={t('{{name}} · pooled', { name: team.name })} onBack={onBack}>
            <TeamCard>
                <PlanningField
                    label={t('What do you need to purchase?')}
                    value={name}
                    onChange={setName}
                    placeholder={t('e.g. Washing Machine')}
                />
                <PlanningField
                    label={t('Description (optional)')}
                    value={description}
                    onChange={setDescription}
                    placeholder={t('Why is this needed?')}
                />
                <PlanningField
                    label={t('Estimated amount')}
                    value={amount}
                    onChange={setAmount}
                    keyboardType="numeric"
                    placeholder="650"
                />
                <PlanningField
                    label={t('Planned date (optional)')}
                    value={plannedDate}
                    onChange={setPlannedDate}
                    placeholder="YYYY-MM-DD"
                />
                <Text style={styles.note}>{t('Submitting a request does not spend team money.')}</Text>
            </TeamCard>
            <PlanningButton label={t('Submit for Approval')} onPress={submit} />
        </PlanningScreen>
    );
};

/** Props for the request detail screen. */
export interface TeamRequestDetailScreenProps {
    request: TeamPlannedRequest;
    currency: string;
    language: string;
    onBack: () => void;
    onApprove: () => void;
    onReject: () => void;
    onComplete: (actualAmount: number) => void;
}

/**
 * Render the request detail screen with status-specific actions.
 *
 * @param {TeamRequestDetailScreenProps} props Component props.
 * @returns {JSX.Element} The request detail screen.
 */
export const TeamRequestDetailScreen = ({
    request,
    currency,
    language,
    onBack,
    onApprove,
    onReject,
    onComplete,
}: TeamRequestDetailScreenProps) => {
    const { t } = useTranslation('teams');
    const [actualAmount, setActualAmount] = useState(
        request.actualAmount !== undefined ? String(request.actualAmount) : String(request.estimatedAmount),
    );

    return (
        <PlanningScreen title={t('Expense Request')} subtitle={t(request.status)} onBack={onBack}>
            <TeamCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.large}>{request.name}</Text>
                    <Text style={[styles.status, { color: statusColor(request.status) }]}>
                        {t(request.status)}
                    </Text>
                </View>

                {request.description ? (
                    <Text style={planningStyles.muted}>{request.description}</Text>
                ) : null}

                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>{t('Requested by')}</Text>
                    <Text style={planningStyles.body}>{request.requesterName}</Text>
                </View>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>{t('Estimated cost')}</Text>
                    <MoneyText
                        value={request.estimatedAmount}
                        currency={currency}
                        language={language}
                        style={planningStyles.body}
                    />
                </View>

                {request.status === 'Pending' ? (
                    <>
                        <Text style={styles.note}>
                            {t('An authorized approver can approve or reject this request.')}
                        </Text>
                        <PlanningButton label={t('Approve')} onPress={onApprove} />
                        <PlanningButton label={t('Reject')} outline onPress={onReject} />
                    </>
                ) : null}

                {request.status === 'Approved' ? (
                    <>
                        <Text style={styles.approvedNote}>
                            {t('Approved; no team money has been deducted.')}
                        </Text>
                        <PlanningField
                            label={t('Actual amount spent')}
                            value={actualAmount}
                            onChange={setActualAmount}
                            keyboardType="numeric"
                            placeholder={t('Actual amount')}
                        />
                        <PlanningButton
                            label={t('Mark as Completed')}
                            onPress={() => {
                                const numeric = Number(actualAmount);
                                if (Number.isFinite(numeric) && numeric > 0) onComplete(numeric);
                            }}
                        />
                        <Text style={styles.note}>
                            {t('Production: requester or an explicitly authorized delegate only. Attach a receipt through the shared expense flow.')}
                        </Text>
                    </>
                ) : null}

                {request.status === 'Completed' ? (
                    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                        <Text style={planningStyles.muted}>{t('Recorded expenditure')}</Text>
                        <MoneyText
                            value={request.actualAmount ?? 0}
                            currency={currency}
                            language={language}
                            style={planningStyles.body}
                        />
                    </View>
                ) : null}

                {request.status === 'Rejected' || request.status === 'Canceled' ? (
                    <Text style={styles.note}>
                        {t('Kept in history without recording any expenditure.')}
                    </Text>
                ) : null}
            </TeamCard>

            <TeamCard style={styles.infoCard}>
                <PlanningIcon name="shield-check" color="#315D75" size={20} />
                <Text style={styles.infoText}>
                    {t('Approval is not payment. Only completion creates or links an actual team expense, exactly once.')}
                </Text>
            </TeamCard>
        </PlanningScreen>
    );
};

/**
 * Return the accent color for a request status.
 *
 * @param {TeamPlannedRequest['status']} status The request status.
 * @returns {string} The accent color.
 */
const statusColor = (status: TeamPlannedRequest['status']): string => {
    switch (status) {
        case 'Pending':
            return '#A96E26';
        case 'Approved':
            return planningColors.blue;
        case 'Completed':
            return planningColors.emerald;
        default:
            return planningColors.muted;
    }
};

/** Request screen styles. */
const styles = StyleSheet.create({
    status: {
        fontSize: 12,
        fontWeight: '800',
    },
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
    },
    approvedNote: {
        fontSize: 12,
        color: planningColors.blue,
    },
    infoCard: {
        backgroundColor: '#EAF5F9',
    },
    infoText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#5D798C',
    },
});
