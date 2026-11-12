/**
 * Team Activity and mode-specific member breakdown screens.
 *
 * Activity is an auditable history. Contributions is pooled-only and shows
 * linked inflows; Member Spending is independent-oriented and shows purchases
 * paid by each member. All values are demo-only.
 */

import {
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { MoneyText } from '@/components/ui/MoneyText';
import { TeamCard } from '@/components/teams/teamsPrimitives';
import type { Team, TeamActivity, TeamMember } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the Team Activity screen. */
export interface TeamActivityScreenProps {
    team: Team;
    activity: TeamActivity[];
    onBack: () => void;
}

/**
 * Render the Team Activity screen.
 *
 * @param {TeamActivityScreenProps} props Component props.
 * @returns {JSX.Element} The activity screen.
 */
export const TeamActivityScreen = ({ team, activity, onBack }: TeamActivityScreenProps) => {
    const { t } = useTranslation('teams');
    return (
    <PlanningScreen title={t('Team Activity')} subtitle={t('{{name}} · audit history', { name: team.name })} onBack={onBack}>
        {activity.length === 0 ? (
            <TeamCard>
                <Text style={planningStyles.body}>{t('No activity yet.')}</Text>
            </TeamCard>
        ) : (
            activity.map((entry) => (
                <TeamCard key={entry.id}>
                    <View style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIcon
                            name={entry.icon as Parameters<typeof PlanningIcon>[0]['name']}
                            color={planningColors.muted}
                            size={22}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={planningStyles.body}>{entry.title}</Text>
                            <Text style={planningStyles.muted}>{entry.detail}</Text>
                        </View>
                    </View>
                </TeamCard>
            ))
        )}
        <Text style={styles.note}>
            {t('Production activity must come from server-side audit history, not client state.')}
        </Text>
    </PlanningScreen>
    );
};

/** Props for the member breakdown screen. */
export interface TeamBreakdownScreenProps {
    team: Team;
    variant: 'contributions' | 'spending';
    members: TeamMember[];
    currency: string;
    language: string;
    onBack: () => void;
}

/** Demo contribution amounts by member name. */
const DEMO_CONTRIBUTIONS: Record<string, number> = {
    You: 2000,
    Sarah: 1000,
    Michael: 500,
};

/** Demo spending amounts by member name. */
const DEMO_SPENDING: Record<string, number> = {
    You: 300,
    Sarah: 180,
    Michael: 120,
};

/**
 * Render a pooled contributions or independent member-spending breakdown.
 *
 * @param {TeamBreakdownScreenProps} props Component props.
 * @returns {JSX.Element} The breakdown screen.
 */
export const TeamBreakdownScreen = ({
    team,
    variant,
    members,
    currency,
    language,
    onBack,
}: TeamBreakdownScreenProps) => {
    const { t } = useTranslation('teams');
    const pooled = variant === 'contributions';
    const amounts = pooled ? DEMO_CONTRIBUTIONS : DEMO_SPENDING;

    return (
        <PlanningScreen
            title={pooled ? t('Team Contributions') : t('Member Spending')}
            subtitle={pooled ? t('{{name}} · shared inflows', { name: team.name }) : t('{{name}} · purchases paid by member', { name: team.name })}
            onBack={onBack}
        >
            <TeamCard>
                <Text style={planningStyles.body}>
                    {pooled ? t('Member Contributions') : t('Spending by Member')}
                </Text>
                <Text style={planningStyles.muted}>
                    {pooled ? t('Pooled teams only · demo amounts') : t('Demo amounts · no pooled balance')}
                </Text>
                {members.map((member) => (
                    <View key={member.id} style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                        <Text style={planningStyles.body}>{member.name}</Text>
                        <MoneyText
                            value={amounts[member.name] ?? 0}
                            currency={currency}
                            language={language}
                            style={planningStyles.muted}
                        />
                    </View>
                ))}
            </TeamCard>

            <TeamCard style={styles.infoCard}>
                <Text style={styles.infoText}>
                    {pooled
                        ? t("Contributions are linked to a personal team category and appear as team inflows. Team spending is never double-counted in a contributor's personal ledger.")
                        : t('Each member retains their own money. The team aggregates eligible purchases; there is no pooled balance or approval process.')}
                </Text>
            </TeamCard>
        </PlanningScreen>
    );
};

/** Breakdown screen styles. */
const styles = StyleSheet.create({
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
        textAlign: 'center',
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
