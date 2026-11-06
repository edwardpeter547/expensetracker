/**
 * Team Member Spending route (independent teams).
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamBreakdownScreen } from '@/components/teams/TeamActivityAndBreakdown';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team, TeamMember } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Team Member Spending route.
 *
 * @returns {JSX.Element} The member spending screen or a not-found state.
 */
const TeamMemberSpendingRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);

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
            <PlanningScreen title="Member Spending" subtitle="Purchases by member" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamBreakdownScreen
            team={team}
            variant="spending"
            members={members}
            currency={currency}
            language={language}
            onBack={handleBack}
        />
    );
};

export default TeamMemberSpendingRoute;
