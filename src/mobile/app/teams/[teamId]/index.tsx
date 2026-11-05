/**
 * Team workspace route.
 *
 * Resolves the selected team by stable id and wires every team-scoped tool to
 * its matching route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamWorkspaceScreen from '@/components/teams/TeamWorkspaceScreen';
import {
    getDemoMembers,
    getDemoTeam,
    getDemoTeamActivity,
    getDemoTeamMessages,
} from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/** Finance tool keys that map to the generic team finance route. */
const FINANCE_KEYS = ['budgets', 'goals', 'insights', 'monthly-plan', 'cash-flow'];

/**
 * Render the Team workspace route.
 *
 * @returns {JSX.Element} The team workspace or a not-found state.
 */
const TeamWorkspaceRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const team = getDemoTeam(teamId);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/goals');
        }
    };

    if (!team) {
        return (
            <PlanningScreen title="Team" subtitle="Team workspace" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamWorkspaceScreen
            team={team}
            currency={currency}
            language={language}
            memberCount={getDemoMembers(team.id).length}
            messageCount={getDemoTeamMessages(team.id).length}
            activityCount={getDemoTeamActivity(team.id).length}
            onBack={handleBack}
            onMembers={() =>
                router.push({ pathname: '/teams/[teamId]/members' as never, params: { teamId: team.id } })
            }
            onChat={() =>
                router.push({ pathname: '/teams/[teamId]/chat' as never, params: { teamId: team.id } })
            }
            onTool={(key) => {
                if (FINANCE_KEYS.includes(key)) {
                    router.push({
                        pathname: '/teams/[teamId]/finance/[page]' as never,
                        params: { teamId: team.id, page: key },
                    });
                    return;
                }
                if (key === 'planned-expenses') {
                    router.push({
                        pathname: '/teams/[teamId]/planned-expenses' as never,
                        params: { teamId: team.id },
                    });
                    return;
                }
                if (key === 'expenses') {
                    router.push({
                        pathname: '/teams/[teamId]/expenses' as never,
                        params: { teamId: team.id },
                    });
                    return;
                }
                router.push({ pathname: '/teams/[teamId]/activity' as never, params: { teamId: team.id } });
            }}
            onInvite={() =>
                router.push({ pathname: '/teams/[teamId]/invite' as never, params: { teamId: team.id } })
            }
            onBreakdown={() =>
                router.push({
                    pathname: team.mode === 'POOLED'
                        ? ('/teams/[teamId]/contributions' as never)
                        : ('/teams/[teamId]/member-spending' as never),
                    params: { teamId: team.id },
                })
            }
        />
    );
};

export default TeamWorkspaceRoute;
