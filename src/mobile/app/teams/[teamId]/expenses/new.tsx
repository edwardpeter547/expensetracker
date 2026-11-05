/**
 * Record Team Expense route.
 *
 * Reuses the existing receipt and line-item components and saves only to the
 * in-memory team store.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamRecordExpenseScreen } from '@/components/teams/TeamExpensesScreens';
import { addDemoTeamExpense, getDemoMembers, getDemoTeam } from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the Record Team Expense route.
 *
 * @returns {JSX.Element} The record expense screen or a not-found state.
 */
const TeamRecordExpenseRoute = () => {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { language, currency } = useLocale();
    const team = getDemoTeam(teamId);

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
            members={getDemoMembers(team.id)}
            currency={currency}
            language={language}
            onBack={handleBack}
            onSave={(input) => {
                addDemoTeamExpense({ teamId: team.id, ...input });
                router.replace({ pathname: '/teams/[teamId]/expenses' as never, params: { teamId: team.id } });
            }}
        />
    );
};

export default TeamRecordExpenseRoute;
