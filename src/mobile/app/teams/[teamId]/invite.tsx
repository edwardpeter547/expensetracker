/**
 * Team Invite route.
 *
 * Records an invitation in memory and returns to the members list. No message
 * is delivered.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamInviteScreen from '@/components/teams/TeamInviteScreen';
import { addDemoInvitation, getDemoTeam } from '@/constants/teamsDemo';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Invite route.
 *
 * @returns {JSX.Element} The invite screen or a not-found state.
 */
const TeamInviteRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const team = getDemoTeam(teamId);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace({ pathname: '/teams/[teamId]/members' as never, params: { teamId } });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title="Invite Member" subtitle="Invite someone to your team" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamInviteScreen
            team={team}
            onBack={handleBack}
            onSubmit={(input) => {
                addDemoInvitation({ teamId: team.id, ...input });
                router.replace({ pathname: '/teams/[teamId]/members' as never, params: { teamId: team.id } });
            }}
        />
    );
};

export default TeamInviteRoute;
