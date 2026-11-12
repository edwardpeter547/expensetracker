/**
 * New pooled expense request route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamNewRequestScreen } from '@/components/teams/TeamRequestScreens';
import { teamDataSource } from '@/contracts';
import type { Team } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

/**
 * Render the new request route.
 *
 * @returns {JSX.Element} The new request screen or a not-found state.
 */
const TeamNewRequestRoute = () => {
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
            router.replace({
                pathname: '/teams/[teamId]/planned-expenses' as never,
                params: { teamId },
            });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title={t('New Expense Request')} subtitle={t('Pooled planned expense')} onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamNewRequestScreen
            team={team}
            onBack={handleBack}
            onSubmit={(input) => {
                void teamDataSource
                    .addPlannedRequest({ teamId: team.id, ...input })
                    .then(() => {
                        router.replace({
                            pathname: '/teams/[teamId]/planned-expenses' as never,
                            params: { teamId: team.id },
                        });
                    });
            }}
        />
    );
};

export default TeamNewRequestRoute;
