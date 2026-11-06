/**
 * Pooled request detail route.
 *
 * Wires approve/reject/complete transitions to the in-memory store and
 * refreshes the request afterwards.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamRequestDetailScreen } from '@/components/teams/TeamRequestScreens';
import { teamDataSource } from '@/contracts';
import { useLocale } from '@/contexts/LocaleContext';
import type { Team, TeamPlannedRequest } from '@/types/team';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

/**
 * Render the request detail route.
 *
 * @returns {JSX.Element} The request detail screen or a not-found state.
 */
const TeamRequestDetailRoute = () => {
    const { teamId, requestId } = useLocalSearchParams<{ teamId: string; requestId: string }>();
    const { language, currency } = useLocale();
    const [team, setTeam] = useState<Team | null>(null);
    const [request, setRequest] = useState<TeamPlannedRequest | null>(null);

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
        teamDataSource
            .plannedRequest(requestId)
            .then((nextRequest) => {
                if (active) setRequest(nextRequest);
            })
            .catch(() => {
                if (active) setRequest(null);
            });
        return () => {
            active = false;
        };
    }, [teamId, requestId]);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace({
                pathname: '/teams/[teamId]/planned-expenses' as never,
                params: { teamId },
            });
        }
    };

    if (!team) {
        return (
            <PlanningScreen title="Expense Request" subtitle="Request details" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    if (!request) {
        return (
            <PlanningScreen title="Expense Request" subtitle="Request not found" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <TeamRequestDetailScreen
            request={request}
            currency={currency}
            language={language}
            onBack={handleBack}
            onApprove={() => {
                void teamDataSource
                    .decideRequest(request.id, 'Approved')
                    .then((updated) => {
                        if (updated) setRequest(updated);
                    });
            }}
            onReject={() => {
                void teamDataSource
                    .decideRequest(request.id, 'Rejected')
                    .then((updated) => {
                        if (updated) setRequest(updated);
                    });
            }}
            onComplete={(actualAmount) => {
                void teamDataSource
                    .completeRequest(request.id, actualAmount)
                    .then((result) => {
                        if (result) setRequest(result.request);
                    });
            }}
        />
    );
};

export default TeamRequestDetailRoute;
