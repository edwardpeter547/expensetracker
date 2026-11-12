/**
 * Team Invite route.
 *
 * Records an invitation in memory and returns to the members list. No message
 * is delivered.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamInviteScreen from '@/components/teams/TeamInviteScreen';
import { teamDataSource } from '@/contracts';
import type { Team } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

/**
 * Render the Team Invite route.
 *
 * @returns {JSX.Element} The invite screen or a not-found state.
 */
const TeamInviteRoute = () => {
    const { t } = useTranslation('teams');
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (active) setTeam(nextTeam);
            })
            .catch(() => {
                if (active) setTeam(null);
            });
        return () => {
            active = false;
        };
    }, [teamId]);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace({ pathname: '/teams/[teamId]/members' as never, params: { teamId } });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title={t('Invite Member')} subtitle={t('Invite someone to your team')} onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamInviteScreen
            team={team}
            onBack={handleBack}
            onSubmit={(input) => {
                void teamDataSource
                    .addInvitation({ teamId: team.id, ...input })
                    .then(() => {
                        router.replace({
                            pathname: '/teams/[teamId]/members' as never,
                            params: { teamId: team.id },
                        });
                    });
            }}
        />
    );
};

export default TeamInviteRoute;
