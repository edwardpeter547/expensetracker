/**
 * Record Team Expense route.
 *
 * Reuses the existing receipt and line-item components and saves only to the
 * in-memory team store.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamRecordExpenseScreen } from '@/components/teams/TeamExpensesScreens';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team, TeamMember } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the Record Team Expense route.
 *
 * @returns {JSX.Element} The record expense screen or a not-found state.
 */
const TeamRecordExpenseRoute = () => {
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
            router.replace({ pathname: '/teams/[teamId]/expenses' as never, params: { teamId } });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title="Record Team Expense" subtitle="Team-scoped purchase" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamRecordExpenseScreen
            team={team}
            members={members}
            currency={currency}
            language={language}
            onBack={handleBack}
            onSave={(input) => {
                void teamDataSource
                    .addExpense({ teamId: team.id, ...input })
                    .then(() => {
                        router.replace({
                            pathname: '/teams/[teamId]/expenses' as never,
                            params: { teamId: team.id },
                        });
                    });
            }}
        />
    );
};

export default TeamRecordExpenseRoute;
