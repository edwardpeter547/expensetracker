/**
 * Team Contributions route (pooled teams).
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamBreakdownScreen } from '@/components/teams/TeamActivityAndBreakdown';
import { getDemoMembers, getDemoTeam } from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Contributions route.
 *
 * @returns {JSX.Element} The contributions screen or a not-found state.
 */
const TeamContributionsRoute = () => {
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
            <PlanningScreen title="Team Contributions" subtitle="Shared inflows" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamBreakdownScreen
            team={team}
            variant="contributions"
            members={getDemoMembers(team.id)}
            currency={currency}
            language={language}
            onBack={handleBack}
        />
    );
};

export default TeamContributionsRoute;
