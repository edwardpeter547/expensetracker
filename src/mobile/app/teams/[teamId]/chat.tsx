/**
 * Team Chat route.
 *
 * Scoped to the selected team and demo-only.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamChatScreen from '@/components/teams/TeamChatScreen';
import { teamDataSource } from '@/contracts';
import type { Team, TeamChatMessage } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Team Chat route.
 *
 * @returns {JSX.Element} The chat screen or a not-found state.
 */
const TeamChatRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [messages, setMessages] = useState<TeamChatMessage[]>([]);

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.messages(nextTeam.id).then((items) => {
                        if (active) setMessages(items);
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
            <PlanningScreen title="Team Chat" subtitle="Group messages" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamChatScreen
            team={team}
            messages={messages}
            onBack={handleBack}
            onSend={(message) => {
                void teamDataSource.addMessage(team.id, message).then(() => {
                    void teamDataSource.messages(team.id).then(setMessages);
                });
            }}
        />
    );
};

export default TeamChatRoute;
