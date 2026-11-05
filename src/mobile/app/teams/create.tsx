/**
 * Create Team route.
 *
 * Owns the in-memory team creation and routes into the new team workspace.
 */

import FeatureGate from '@/components/premium/FeatureGate';
import CreateTeamScreen from '@/components/teams/CreateTeamScreen';
import { createDemoTeam } from '@/constants/teamsDemo';
import { router } from 'expo-router';

/**
 * Render the Create Team route.
 *
 * @returns {JSX.Element} The create team screen.
 */
const CreateTeamRoute = () => {
    /**
     * Return to the Teams tab without leaving a broken navigation entry.
     */
    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/goals');
        }
    };

    return (
        <FeatureGate
            featureId="teams.create"
            presentation="screen"
            onDeniedDismiss={goBack}
            onBack={goBack}
        >
            <CreateTeamScreen
                onBack={goBack}
                onCreate={(input) => {
                    const team = createDemoTeam(input);
                    router.replace({
                        pathname: '/teams/[teamId]' as never,
                        params: { teamId: team.id },
                    });
                }}
            />
        </FeatureGate>
    );
};

export default CreateTeamRoute;
