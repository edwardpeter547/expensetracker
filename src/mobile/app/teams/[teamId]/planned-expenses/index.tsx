/**
 * Team Planned Expenses route.
 *
 * Conditional on the team finance mode: pooled teams get the request workflow,
 * independent teams get planned purchases and direct recording.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamPlannedExpensesScreen from '@/components/teams/TeamPlannedExpensesScreen';
import { getDemoPlannedRequests, getDemoTeam } from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Planned Expenses route.
 *
 * @returns {JSX.Element} The planned expenses screen or a not-found state.
 */
const TeamPlannedExpensesRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const team = getDemoTeam(teamId);

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
            requests={getDemoPlannedRequests(team.id)}
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
