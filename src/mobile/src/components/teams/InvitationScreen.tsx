/**
 * Invitation recipient screen.
 *
 * Represents the deep-link destination where an invited person reviews a team
 * invite and accepts or declines. The current screen is UI-only and does not
 * authenticate the recipient or mutate membership.
 */

import {
    PlanningButton,
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { teamModeLabel } from '@/components/teams/teamPresentation';
import { ModeBadge, TeamCard } from '@/components/teams/teamsPrimitives';
import type { FinanceMode, TeamRole } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the invitation recipient screen. */
export interface InvitationScreenProps {
    teamName: string;
    mode: FinanceMode;
    role: Exclude<TeamRole, 'Owner'>;
    onBack: () => void;
    onAccept: () => void;
    onDecline: () => void;
}

/**
 * Render the invitation recipient screen.
 *
 * @param {InvitationScreenProps} props Component props.
 * @returns {JSX.Element} The invitation screen.
 */
const InvitationScreen = ({
    teamName,
    mode,
    role,
    onBack,
    onAccept,
    onDecline,
}: InvitationScreenProps) => {
    const { t } = useTranslation('teams');
    return (
    <PlanningScreen title={t('Team Invitation')} subtitle={t('Review and respond')} onBack={onBack}>
        <TeamCard style={styles.card}>
            <PlanningIcon name="home" color={planningColors.emerald} size={48} />
            <Text style={planningStyles.large}>{t("You're invited to {{name}}", { name: teamName })}</Text>
            <Text style={planningStyles.muted}>
                {t('Join a shared finance workspace on AuditWallet.')}
            </Text>
            <ModeBadge mode={mode} />
            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.muted}>{t('Finance model')}</Text>
                <Text style={planningStyles.body}>{t(teamModeLabel(mode))}</Text>
            </View>
            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.muted}>{t('Your role')}</Text>
                <Text style={planningStyles.body}>{t(role)}</Text>
            </View>
            <PlanningButton label={t('Accept Invitation')} onPress={onAccept} />
            <PlanningButton label={t('Decline')} outline onPress={onDecline} />
            <Text style={styles.note}>{t('Demonstration only; no membership changes are made.')}</Text>
        </TeamCard>
    </PlanningScreen>
    );
};

/** Invitation screen styles. */
const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        textAlign: 'center',
    },
    note: {
        fontSize: 11,
        color: planningColors.muted,
        textAlign: 'center',
    },
});

export default InvitationScreen;
