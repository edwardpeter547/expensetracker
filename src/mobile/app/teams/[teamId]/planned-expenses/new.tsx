/**
 * New pooled expense request route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamNewRequestScreen } from '@/components/teams/TeamRequestScreens';
import { addDemoPlannedRequest, getDemoTeam } from '@/constants/teamsDemo';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the new request route.
 *
 * @returns {JSX.Element} The new request screen or a not-found state.
 */
const TeamNewRequestRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const team = getDemoTeam(teamId);

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
            <PlanningScreen title="New Expense Request" subtitle="Pooled planned expense" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamNewRequestScreen
            team={team}
            onBack={handleBack}
            onSubmit={(input) => {
                addDemoPlannedRequest({ teamId: team.id, ...input });
                router.replace({
                    pathname: '/teams/[teamId]/planned-expenses' as never,
                    params: { teamId: team.id },
                });
            }}
        />
    );
};

export default TeamNewRequestRoute;
