/**
 * Team Settings screen.
 *
 * Edits permitted metadata (name and type), shows the immutable finance model,
 * and offers soft archive/restore. The finance mode is intentionally read-only.
 */

import {
    PlanningButton,
    PlanningField,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { teamModeLabel } from '@/components/teams/teamPresentation';
import { ModeBadge, TeamCard, TeamSelectChips } from '@/components/teams/teamsPrimitives';
import type { Team, TeamKind } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Team types available for editing. */
const TEAM_KINDS: readonly TeamKind[] = ['Family', 'Couple', 'Travel', 'Other'];

/** Props for the Team Settings screen. */
export interface TeamSettingsScreenProps {
    team: Team;
    onBack: () => void;
    onSave: (input: { name: string; kind: TeamKind }) => void;
    onArchive: () => void;
    onRestore: () => void;
}

/**
 * Render the Team Settings screen.
 *
 * @param {TeamSettingsScreenProps} props Component props.
 * @returns {JSX.Element} The settings screen.
 */
const TeamSettingsScreen = ({
    team,
    onBack,
    onSave,
    onArchive,
    onRestore,
}: TeamSettingsScreenProps) => {
    const { t } = useTranslation('teams');
    const [name, setName] = useState(team.name);
    const [kind, setKind] = useState<TeamKind>(team.kind);
    const archived = team.status === 'archived';

    return (
        <PlanningScreen
            title={t('Team Settings')}
            subtitle={t('{{name}} · settings', { name: team.name })}
            onBack={onBack}
        >
            <TeamCard>
                <PlanningField
                    label={t('Team name')}
                    value={name}
                    onChange={setName}
                    placeholder={t('e.g. Our Family')}
                />
                <Text style={planningStyles.fieldLabel}>{t('Team type')}</Text>
                <TeamSelectChips
                    options={TEAM_KINDS.map((value) => ({ value, label: t(value) }))}
                    value={kind}
                    onChange={setKind}
                />
            </TeamCard>

            <TeamCard>
                <Text style={planningStyles.fieldLabel}>{t('Finance model')}</Text>
                <View style={[planningStyles.row, { gap: 10 }]}>
                    <ModeBadge mode={team.mode} />
                    <Text style={planningStyles.body}>{t(teamModeLabel(team.mode))}</Text>
                </View>
                <Text style={planningStyles.muted}>
                    {t('The finance model cannot be changed after a team has financial history.')}
                </Text>
            </TeamCard>

            {archived ? (
                <TeamCard style={styles.archivedCard}>
                    <Text style={styles.archivedTitle}>{t('Archived team')}</Text>
                    <Text style={styles.archivedText}>
                        {t('Restoring makes the team active again. All history is kept.')}
                    </Text>
                    <PlanningButton label={t('Restore Team')} onPress={onRestore} />
                </TeamCard>
            ) : (
                <PlanningButton label={t('Archive Team')} outline onPress={onArchive} />
            )}

            <PlanningButton
                label={t('Save Changes')}
                onPress={() => onSave({ name, kind })}
            />
        </PlanningScreen>
    );
};

/** Team settings styles. */
const styles = StyleSheet.create({
    archivedCard: {
        backgroundColor: '#F0F3F6',
    },
    archivedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4A5B6A',
    },
    archivedText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#708296',
    },
});

export default TeamSettingsScreen;
