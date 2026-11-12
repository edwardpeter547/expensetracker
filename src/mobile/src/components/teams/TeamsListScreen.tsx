/**
 * Teams list screen for the Teams tab.
 *
 * Lists the demo teams, shows their finance-mode badge and progress, and
 * routes to team creation or a selected team workspace. Personal finance
 * stays separate; the privacy card is an explicit reminder of that boundary.
 */

import {
    PlanningButton,
    PlanningIcon,
    PlanningIconTile,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { MoneyText } from '@/components/ui/MoneyText';
import { teamKindIcon, teamModeLabel } from '@/components/teams/teamPresentation';
import { ModeBadge, TeamCard, TeamSectionHeading } from '@/components/teams/teamsPrimitives';
import type { Team } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Props for the Teams list screen. */
export interface TeamsListScreenProps {
    teams: Team[];
    currency: string;
    language: string;
    onBack: () => void;
    onCreate: () => void;
    onOpenTeam: (teamId: string) => void;
    onRestoreTeam: (teamId: string) => void;
}

/**
 * Render the Teams list.
 *
 * @param {TeamsListScreenProps} props Component props.
 * @returns {JSX.Element} The Teams screen.
 */
const TeamsListScreen = ({
    teams,
    currency,
    language,
    onBack,
    onCreate,
    onOpenTeam,
    onRestoreTeam,
}: TeamsListScreenProps) => {
    const { t } = useTranslation('teams');
    const activeTeams = teams.filter((team) => team.status !== 'archived');
    const archivedTeams = teams.filter((team) => team.status === 'archived');

    return (
        <PlanningScreen
            title={t('Teams')}
            subtitle={t('Your shared financial spaces')}
            onBack={onBack}
        >
        <TeamCard>
            <Text style={planningStyles.muted}>{t('Your Shared Spaces')}</Text>
            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.large}>
                    {t('teamCount', { count: teams.length })}
                </Text>
                <PlanningIconTile
                    icon="users"
                    color={planningColors.emerald}
                    bg={planningColors.emeraldLight}
                    size={40}
                />
            </View>
            <Text style={planningStyles.muted}>{t('Plan and track money together, privately.')}</Text>
        </TeamCard>

        <TeamSectionHeading title={t('My Teams')} subtitle={t('Tap a team to open its workspace')} />

        {activeTeams.length === 0 ? (
            <TeamCard>
                <Text style={planningStyles.body}>{t('No teams yet.')}</Text>
                <Text style={planningStyles.muted}>
                    {t('Create a team to start planning shared finances.')}
                </Text>
            </TeamCard>
        ) : (
            activeTeams.map((team) => {
                const progress = team.budgetTarget > 0
                    ? Math.round((team.spent / team.budgetTarget) * 100)
                    : 0;
                const pooled = team.mode === 'POOLED';
                return (
                    <Pressable
                        key={team.id}
                        accessibilityRole="button"
                        accessibilityLabel={t('Open {{name}}', { name: team.name })}
                        onPress={() => onOpenTeam(team.id)}
                    >
                        <TeamCard>
                            <View style={[planningStyles.row, { gap: 12 }]}>
                                <PlanningIconTile
                                    icon={teamKindIcon(team.kind)}
                                    color={pooled ? planningColors.emerald : planningColors.blue}
                                    bg={pooled ? planningColors.emeraldLight : planningColors.blueLight}
                                    size={42}
                                />
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={planningStyles.body}>{team.name}</Text>
                                    <Text style={planningStyles.muted}>
                                        {t('memberCount', { count: team.memberCount })} · {t(team.kind)}
                                    </Text>
                                </View>
                                <PlanningIcon name="chevron-right" color={planningColors.muted} />
                            </View>

                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <Text style={planningStyles.muted}>{t(teamModeLabel(team.mode))}</Text>
                                <ModeBadge mode={team.mode} />
                            </View>

                            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                <Text style={planningStyles.muted}>
                                    {t('spentLabel')}{' '}
                                    <MoneyText
                                        value={team.spent}
                                        currency={currency}
                                        language={language}
                                        style={planningStyles.muted}
                                    />
                                </Text>
                                <Text style={planningStyles.muted}>
                                    {t('targetLabel')}{' '}
                                    <MoneyText
                                        value={team.budgetTarget}
                                        currency={currency}
                                        language={language}
                                        style={planningStyles.muted}
                                    />
                                </Text>
                            </View>
                            <PlanningProgress value={progress} color={pooled ? planningColors.emerald : planningColors.blue} />
                        </TeamCard>
                    </Pressable>
                );
            })
        )}

        {archivedTeams.length > 0 ? (
            <>
                <TeamSectionHeading
                    title={t('Archived')}
                    subtitle={t('Archived teams keep their history')}
                />
                {archivedTeams.map((team) => (
                    <TeamCard key={team.id}>
                        <View style={[planningStyles.row, { gap: 12 }]}>
                            <PlanningIconTile
                                icon={teamKindIcon(team.kind)}
                                color={planningColors.muted}
                                bg="#F0F3F8"
                                size={42}
                            />
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={planningStyles.body}>{team.name}</Text>
                                <Text style={planningStyles.muted}>
                                    {t('memberCount', { count: team.memberCount })} · {t(team.kind)}
                                </Text>
                            </View>
                            <Text style={styles.archivedBadge}>{t('Archived')}</Text>
                        </View>
                        <PlanningButton
                            label={t('Restore Team')}
                            outline
                            onPress={() => onRestoreTeam(team.id)}
                        />
                    </TeamCard>
                ))}
            </>
        ) : null}

        <TeamCard style={styles.privacyCard}>
            <PlanningIcon name="shield-check" color="#315D75" size={20} />
            <Text style={styles.privacyTitle}>{t('Your personal finances stay private')}</Text>
            <Text style={styles.privacyText}>
                {t('Only transactions deliberately assigned to a team are visible to its members.')}
            </Text>
        </TeamCard>

        <PlanningButton label={t('Create New Team')} onPress={onCreate} />

        <Text style={styles.demoNote}>
            {t('Preview data only — team records are kept in memory and are not persisted.')}
        </Text>
    </PlanningScreen>
    );
};

/** Teams list screen styles. */
const styles = StyleSheet.create({
    privacyCard: {
        backgroundColor: '#EAF5F9',
    },
    privacyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#315D75',
    },
    privacyText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#5D798C',
    },
    demoNote: {
        textAlign: 'center',
        fontSize: 12,
        color: planningColors.muted,
    },
    archivedBadge: {
        fontSize: 11,
        fontWeight: '700',
        color: '#708296',
        backgroundColor: '#F0F3F6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
});

export default TeamsListScreen;
