/**
 * Team Member Spending route (independent teams).
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamBreakdownScreen } from '@/components/teams/TeamActivityAndBreakdown';
import { getDemoMembers, getDemoTeam } from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Team Member Spending route.
 *
 * @returns {JSX.Element} The member spending screen or a not-found state.
 */
const TeamMemberSpendingRoute = () => {
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
            <PlanningScreen title="Member Spending" subtitle="Purchases by member" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamBreakdownScreen
            team={team}
            variant="spending"
            members={getDemoMembers(team.id)}
            currency={currency}
            language={language}
            onBack={handleBack}
        />
    );
};

export default TeamMemberSpendingRoute;
