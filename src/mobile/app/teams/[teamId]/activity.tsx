/**
 * Team Activity route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamActivityScreen } from '@/components/teams/TeamActivityAndBreakdown';
import { getDemoTeam, getDemoTeamActivity } from '@/constants/teamsDemo';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Activity route.
 *
 * @returns {JSX.Element} The activity screen or a not-found state.
 */
const TeamActivityRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
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
            <PlanningScreen title="Team Activity" subtitle="Audit history" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamActivityScreen
            team={team}
            activity={getDemoTeamActivity(team.id)}
            onBack={handleBack}
        />
    );
};

export default TeamActivityRoute;
