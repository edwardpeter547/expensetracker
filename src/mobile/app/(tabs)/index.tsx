/**
 * Home tab: the approved Dashboard V1.5.
 *
 * Keeps the screen thin by managing the period selection and delegating data
 * loading to `useDashboard` and rendering to `ExpenseDashboard`. Bottom
 * navigation is owned by the Expo Router tab layout.
 */

import { getAccessToken } from '@/api/client';
import ExpenseDashboard from '@/components/dashboard/ExpenseDashboard';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import type { Team } from '@/types/team';
import type {
    DashboardPeriod,
    DashboardPeriodSelection,
    DateRangeSelection,
} from '@/types/dashboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Render the dashboard tab and own its period-selection state.
 *
 * @returns {JSX.Element} The dashboard screen.
 */
const DashboardScreen = () => {
    const { user } = useAuth();
    const { language, currency } = useLocale();
    const [period, setPeriod] = useState<DashboardPeriod>('This Month');
    const [customRange, setCustomRange] = useState<DateRangeSelection | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);

    const selection = useMemo<DashboardPeriodSelection>(
        () =>
            customRange
                ? { kind: 'range', start: customRange.start, end: customRange.end }
                : { kind: 'preset', period },
        [customRange, period],
    );

    const { data, loading, error, refresh, refreshSilently } = useDashboard(
        selection,
        currency,
        language,
    );
    const accessToken = getAccessToken();
    const firstFocus = useRef(true);

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
                return;
            }
            void refreshSilently();
        }, [refreshSilently]),
    );

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
        <ExpenseDashboard
            data={data}
            firstNameFallback={user?.firstname ?? ''}
            lastNameFallback={user?.lastname ?? ''}
            loading={loading}
            error={error}
            selection={selection}
            language={language}
            accessToken={accessToken}
            teams={teams}
            onOpenTeam={(teamId) =>
                router.push({ pathname: '/teams/[teamId]' as never, params: { teamId } })
            }
            onSelectPreset={(nextPeriod) => {
                setPeriod(nextPeriod);
                setCustomRange(null);
            }}
            onSelectRange={(start, end) => {
                setCustomRange({ start, end });
            }}
            onRetry={() => {
                void refresh();
            }}
            onAvatarPress={() => {
                router.push('/(tabs)/profile');
            }}
            onChatPress={() => {
                router.push('/ai-chat' as never);
            }}
        />
    );
};

export default DashboardScreen;
