/**
 * Team Planned Expenses route.
 *
 * Conditional on the team finance mode: pooled teams get the request workflow,
 * independent teams get planned purchases and direct recording.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamPlannedExpensesScreen from '@/components/teams/TeamPlannedExpensesScreen';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team, TeamPlannedRequest } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Team Planned Expenses route.
 *
 * @returns {JSX.Element} The planned expenses screen or a not-found state.
 */
const TeamPlannedExpensesRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const [requests, setRequests] = useState<TeamPlannedRequest[]>([]);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.plannedRequests(nextTeam.id).then((items) => {
                        if (active) setRequests(items);
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
            <PlanningScreen title="Planned Expenses" subtitle="Team planned expenses" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamPlannedExpensesScreen
            team={team}
            requests={requests}
            currency={currency}
            language={language}
            onBack={handleBack}
            onNewRequest={() =>
                router.push({
                    pathname: '/teams/[teamId]/planned-expenses/new' as never,
                    params: { teamId: team.id },
                })
            }
            onOpenRequest={(requestId) =>
                router.push({
                    pathname: '/teams/[teamId]/planned-expenses/[requestId]' as never,
                    params: { teamId: team.id, requestId },
                })
            }
            onRecordExpense={() =>
                router.push({
                    pathname: '/teams/[teamId]/expenses/new' as never,
                    params: { teamId: team.id },
                })
            }
        />
    );
};

export default TeamPlannedExpensesRoute;
