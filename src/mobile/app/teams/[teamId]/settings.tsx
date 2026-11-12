/**
 * Team Settings route.
 *
 * Loads the team through the resolved data source and wires metadata editing,
 * soft archive, and restore through the team data-source contract.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamSettingsScreen from '@/components/teams/TeamSettingsScreen';
import { teamDataSource } from '@/contracts';
import type { Team } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { planningColors } from '@/components/planning/planningTheme';

/**
 * Render the Team Settings route.
 *
 * @returns {JSX.Element} The settings screen or a not-found state.
 */
const TeamSettingsRoute = () => {
    const { t } = useTranslation('teams');
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (active) setTeam(nextTeam);
            })
            .catch(() => {
                if (active) setTeam(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [teamId]);

    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/goals');
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={planningColors.emerald} />
            </View>
        );
    }

    if (!team) {
        return (
            <PlanningScreen title={t('Team Settings')} subtitle={t('Settings')} onBack={goBack}>
                <View style={styles.centered}>
                    <Text style={styles.notFound}>{t('Team not found.')}</Text>
                </View>
            </PlanningScreen>
        );
    }

    return (
        <TeamSettingsScreen
            team={team}
            onBack={goBack}
            onSave={(input) => {
                void teamDataSource.edit(team.id, input).then(() => {
                    router.back();
                });
            }}
            onArchive={() => {
                void teamDataSource.archive(team.id).then(() => {
                    router.replace('/(tabs)/goals');
                });
            }}
            onRestore={() => {
                void teamDataSource.restore(team.id).then(() => {
                    router.replace('/(tabs)/goals');
                });
            }}
        />
    );
};

/** Team settings route styles. */
const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: planningColors.background,
    },
    notFound: {
        fontSize: 15,
        color: planningColors.muted,
    },
});

export default TeamSettingsRoute;
