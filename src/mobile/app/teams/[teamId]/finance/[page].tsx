/**
 * Team finance tool route.
 *
 * One route serves the five team-scoped finance pages; the page parameter is
 * validated before rendering.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import TeamFinanceScreen, {
    type TeamFinancePage,
} from '@/components/teams/TeamFinanceScreen';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/** Valid finance page values. */
const PAGES: readonly TeamFinancePage[] = ['budgets', 'goals', 'insights', 'monthly-plan', 'cash-flow'];

/**
 * Render the Team finance route.
 *
 * @returns {JSX.Element} The finance screen or a not-found state.
 */
const TeamFinanceRoute = () => {
    const { teamId, page } = useLocalSearchParams<{ teamId: string; page?: string }>();
    const { language, currency } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const resolvedPage: TeamFinancePage = PAGES.includes(page as TeamFinancePage)
        ? (page as TeamFinancePage)
        : 'budgets';

    useEffect(() => {
        let active = true;
        teamDataSource
            .get(teamId)
            .then((nextTeam) => {
                if (active) setTeam(nextTeam);
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
            <PlanningScreen title="Team Finance" subtitle="Team-scoped tools" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamFinanceScreen
            team={team}
            page={resolvedPage}
            currency={currency}
            language={language}
            onBack={handleBack}
        />
    );
};

export default TeamFinanceRoute;
