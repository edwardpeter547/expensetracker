/**
 * Team workspace route.
 *
 * Resolves the selected team by stable id and wires every team-scoped tool to
 * its matching route.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamWorkspaceScreen from '@/components/teams/TeamWorkspaceScreen';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team } from '@/types/team';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

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
    const [team, setTeam] = useState<Team | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [activityCount, setActivityCount] = useState(0);

    const load = useCallback(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (!active) return;
                setTeam(nextTeam);
                if (nextTeam) {
                    void teamDataSource.members(nextTeam.id).then((items) => {
                        if (active) setMemberCount(items.length);
                    });
                    void teamDataSource.messages(nextTeam.id).then((items) => {
                        if (active) setMessageCount(items.length);
                    });
                    void teamDataSource.activity(nextTeam.id).then((items) => {
                        if (active) setActivityCount(items.length);
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

    useFocusEffect(load);

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
            memberCount={memberCount}
            messageCount={messageCount}
            activityCount={activityCount}
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
            onSettings={() =>
                router.push({
                    pathname: '/teams/[teamId]/settings' as never,
                    params: { teamId: team.id },
                })
            }
            onRestore={() => {
                void teamDataSource.restore(team.id).then(() => {
                    router.replace('/(tabs)/goals');
                });
            }}
        />
    );
};

export default TeamWorkspaceRoute;
