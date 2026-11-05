/**
 * Team Members route.
 *
 * Reads scoped demo members and invitations for the selected team.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamMembersScreen from '@/components/teams/TeamMembersScreen';
import { getDemoInvitations, getDemoMembers, getDemoTeam } from '@/constants/teamsDemo';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Members route.
 *
 * @returns {JSX.Element} The members screen or a not-found state.
 */
const TeamMembersRoute = () => {
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
            <PlanningScreen title="Team Members" subtitle="People and roles" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamMembersScreen
            team={team}
            members={getDemoMembers(team.id)}
            invitations={getDemoInvitations(team.id)}
            onBack={handleBack}
            onInvite={() =>
                router.push({ pathname: '/teams/[teamId]/invite' as never, params: { teamId: team.id } })
            }
        />
    );
};

export default TeamMembersRoute;
