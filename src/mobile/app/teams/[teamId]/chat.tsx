/**
 * Team Chat route.
 *
 * Scoped to the selected team and demo-only.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamChatScreen from '@/components/teams/TeamChatScreen';
import { addDemoTeamMessage, getDemoTeam, getDemoTeamMessages } from '@/constants/teamsDemo';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

/**
 * Render the Team Chat route.
 *
 * @returns {JSX.Element} The chat screen or a not-found state.
 */
const TeamChatRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const team = getDemoTeam(teamId);
    const [messages, setMessages] = useState(() => (teamId ? getDemoTeamMessages(teamId) : []));

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
                addDemoTeamMessage(team.id, message);
                setMessages(getDemoTeamMessages(team.id));
            }}
        />
    );
};

export default TeamChatRoute;
