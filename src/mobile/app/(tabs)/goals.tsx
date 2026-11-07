/**
 * Teams tab route.
 *
 * Keeps the tab thin by reading the in-memory team store and delegating
 * rendering to `TeamsListScreen`. The route keeps its `goals` file name for
 * deep-link compatibility while presenting the Teams workspace, matching the
 * Planning tab's `budgets` route-name convention.
 */

import TeamsListScreen from '@/components/teams/TeamsListScreen';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import { useFeatureGate } from '@/hooks/useFeatureAccess';
import type { Team } from '@/types/team';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Render the Teams tab.
 *
 * @returns {JSX.Element} The Teams list screen.
 */
const TeamsTabScreen = () => {
    const { language, currency } = useLocale();
    const { requestAccess } = useFeatureGate();
    const [teams, setTeams] = useState<Team[]>([]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            teamDataSource
                .list()
                .then((items) => {
                    if (active) setTeams(items);
                })
                .catch(() => {
                    if (active) setTeams([]);
                });
            return () => {
                active = false;
            };
        }, []),
    );

    return (
        <TeamsListScreen
            teams={teams}
            currency={currency}
            language={language}
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)');
                }
            }}
            onCreate={() =>
                requestAccess('teams.create', () =>
                    router.push('/teams/create' as never),
                )
            }
            onOpenTeam={(teamId) =>
                router.push({ pathname: '/teams/[teamId]' as never, params: { teamId } })
            }
            onRestoreTeam={(teamId) => {
                void teamDataSource
                    .restore(teamId)
                    .then(() => teamDataSource.list())
                    .then(setTeams);
            }}
        />
    );
};

export default TeamsTabScreen;
