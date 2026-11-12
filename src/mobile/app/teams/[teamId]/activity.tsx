/**
 * Team Activity route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamActivityScreen } from '@/components/teams/TeamActivityAndBreakdown';
import { teamDataSource } from '@/contracts';
import type { Team, TeamActivity } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

/**
 * Render the Team Activity route.
 *
 * @returns {JSX.Element} The activity screen or a not-found state.
 */
const TeamActivityRoute = () => {
    const { t } = useTranslation('teams');
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [activity, setActivity] = useState<TeamActivity[]>([]);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.activity(nextTeam.id).then((items) => {
                        if (active) setActivity(items);
                    });
                }
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
            router.replace({ pathname: '/teams/[teamId]' as never, params: { teamId } });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title={t('Team Activity')} subtitle={t('Audit history')} onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamActivityScreen
            team={team}
            activity={activity}
            onBack={handleBack}
        />
    );
};

export default TeamActivityRoute;
