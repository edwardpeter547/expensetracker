/**
 * Invitation recipient route.
 *
 * Deep-link destination for accepting or declining a team invite. The
 * recipient is not authenticated here, so this route is UI-only.
 */

import { PlanningScreen } from '@/components/planning/PlanningUI';
import InvitationScreen from '@/components/teams/InvitationScreen';
import { router, useLocalSearchParams } from 'expo-router';

/**
 * Render the invitation recipient route.
 *
 * @returns {JSX.Element} The invitation screen.
 */
const InvitationRoute = () => {
    const { token } = useLocalSearchParams<{ token: string }>();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/goals');
        }
    };

    if (!token) {
        return (
            <PlanningScreen title="Team Invitation" subtitle="Invitation not found" onBack={handleBack}>
                <></>
            </PlanningScreen>
        );
    }

    return (
        <InvitationScreen
            teamName="Family Finance"
            mode="POOLED"
            role="Member"
            onBack={handleBack}
            onAccept={() => {
                // No membership mutation exists yet; return to the Teams tab.
                router.replace('/(tabs)/goals');
            }}
            onDecline={() => {
                router.replace('/(tabs)/goals');
            }}
        />
    );
};

export default InvitationRoute;
