/**
 * Team Members route.
 *
 * Reads scoped demo members and invitations for the selected team.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamMembersScreen from '@/components/teams/TeamMembersScreen';
import { teamDataSource } from '@/contracts';
import type { Team, TeamInvitation, TeamMember } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Team Members route.
 *
 * @returns {JSX.Element} The members screen or a not-found state.
 */
const TeamMembersRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.members(nextTeam.id).then((items) => {
                        if (active) setMembers(items);
                    });
                    void teamDataSource.invitations(nextTeam.id).then((items) => {
                        if (active) setInvitations(items);
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
            <PlanningScreen title="Team Members" subtitle="People and roles" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamMembersScreen
            team={team}
            members={members}
            invitations={invitations}
            onBack={handleBack}
            onInvite={() =>
                router.push({ pathname: '/teams/[teamId]/invite' as never, params: { teamId: team.id } })
            }
        />
    );
};

export default TeamMembersRoute;
