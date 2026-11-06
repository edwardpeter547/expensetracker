/**
 * Team Shared Expenses route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamSharedExpensesScreen } from '@/components/teams/TeamExpensesScreens';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team, TeamExpense } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Team Shared Expenses route.
 *
 * @returns {JSX.Element} The expenses screen or a not-found state.
 */
const TeamExpensesRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const [expenses, setExpenses] = useState<TeamExpense[]>([]);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.expenses(nextTeam.id).then((items) => {
                        if (active) setExpenses(items);
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
            <PlanningScreen title="Shared Expenses" subtitle="Recorded team purchases" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamSharedExpensesScreen
            team={team}
            expenses={expenses}
            currency={currency}
            language={language}
            onBack={handleBack}
            onRecordExpense={() =>
                router.push({
                    pathname: '/teams/[teamId]/expenses/new' as never,
                    params: { teamId: team.id },
                })
            }
        />
    );
};

export default TeamExpensesRoute;
