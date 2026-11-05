/**
 * Pooled request detail route.
 *
 * Wires approve/reject/complete transitions to the in-memory store and
 * refreshes the request afterwards.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import { TeamRequestDetailScreen } from '@/components/teams/TeamRequestScreens';
import {
    completeDemoPlannedRequest,
    decideDemoPlannedRequest,
    getDemoPlannedRequest,
    getDemoTeam,
} from '@/constants/teamsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

/**
 * Render the request detail route.
 *
 * @returns {JSX.Element} The request detail screen or a not-found state.
 */
const TeamRequestDetailRoute = () => {
    const { teamId, requestId } = useLocalSearchParams<{ teamId: string; requestId: string }>();
    const { language, currency } = useLocale();
    const team = getDemoTeam(teamId);
    const [request, setRequest] = useState(() => getDemoPlannedRequest(requestId));

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
                const updated = decideDemoPlannedRequest(request.id, 'Approved');
                if (updated) setRequest(updated);
            }}
            onReject={() => {
                const updated = decideDemoPlannedRequest(request.id, 'Rejected');
                if (updated) setRequest(updated);
            }}
            onComplete={(actualAmount) => {
                const result = completeDemoPlannedRequest(request.id, actualAmount);
                if (result) setRequest(result.request);
            }}
        />
    );
};

export default TeamRequestDetailRoute;
