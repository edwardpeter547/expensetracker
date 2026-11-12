/**
 * Team Invite screen.
 *
 * Invites by phone or email with a proposed role. This screen only records
 * the invitation locally; no message is delivered and no account existence is
 * probed.
 */

import {
    PlanningButton,
    PlanningField,
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { TeamCard, TeamSelectChips } from '@/components/teams/teamsPrimitives';
import type { Team, TeamInvitation } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

/** Props for the Team Invite screen. */
export interface TeamInviteScreenProps {
    team: Team;
    onBack: () => void;
    onSubmit: (input: {
        contact: string;
        method: TeamInvitation['method'];
        role: TeamInvitation['role'];
    }) => void;
}

/** The two supported invitation methods. */
const METHODS: readonly TeamInvitation['method'][] = ['Phone', 'Email'];
/** The roles an owner may propose. */
const ROLES: readonly TeamInvitation['role'][] = ['Member', 'Admin'];

/**
 * Render the Team Invite screen.
 *
 * @param {TeamInviteScreenProps} props Component props.
 * @returns {JSX.Element} The invite screen.
 */
const TeamInviteScreen = ({ team, onBack, onSubmit }: TeamInviteScreenProps) => {
    const { t } = useTranslation('teams');
    const [method, setMethod] = useState<TeamInvitation['method']>('Phone');
    const [contact, setContact] = useState('');
    const [role, setRole] = useState<TeamInvitation['role']>('Member');

    return (
        <PlanningScreen
            title={t('Invite Member')}
            subtitle={t('Invite someone to {{name}}', { name: team.name })}
            onBack={onBack}
        >
            <TeamCard>
                <PlanningIcon name="send" color={planningColors.emerald} size={30} />
                <Text style={planningStyles.muted}>
                    {t('Invite an existing AuditWallet user or someone new.')}
                </Text>

                <Text style={planningStyles.fieldLabel}>{t('Contact method')}</Text>
                <TeamSelectChips
                    options={METHODS.map((value) => ({ value, label: t(value) }))}
                    value={method}
                    onChange={setMethod}
                />

                <PlanningField
                    label={method === 'Phone' ? t('Phone number') : t('Email address')}
                    value={contact}
                    onChange={setContact}
                    placeholder={method === 'Phone' ? '+44 7700 900000' : 'name@example.com'}
                />

                <Text style={planningStyles.fieldLabel}>{t('Team role')}</Text>
                <TeamSelectChips
                    options={ROLES.map((value) => ({ value, label: t(value) }))}
                    value={role}
                    onChange={setRole}
                />

                <Text style={styles.hint}>
                    {t('Recipients open the invite in AuditWallet, or install the app and sign up before accepting. No message is sent in this preview.')}
                </Text>
            </TeamCard>

            <PlanningButton
                label={t('Send Invitation')}
                onPress={() => {
                    if (contact.trim()) {
                        onSubmit({ contact: contact.trim(), method, role });
                    }
                }}
            />
        </PlanningScreen>
    );
};

/** Team Invite screen styles. */
const styles = StyleSheet.create({
    hint: {
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
    },
});

export default TeamInviteScreen;
