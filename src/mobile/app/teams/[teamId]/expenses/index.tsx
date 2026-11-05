/**
 * Team Shared Expenses route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamSharedExpensesScreen } from '@/components/teams/TeamExpensesScreens';
import { getDemoTeam, getDemoTeamExpenses } from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Shared Expenses route.
 *
 * @returns {JSX.Element} The expenses screen or a not-found state.
 */
const TeamExpensesRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const team = getDemoTeam(teamId);
    const expenses = team ? getDemoTeamExpenses(team.id) : [];

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
