/**
 * Planning tab: the approved Planning Dashboard V1 landing screen.
 *
 * The tab keeps its `budgets` route name for deep-link compatibility while
 * presenting the Planning workspace. Tool cards navigate to the root-level
 * Planning stack routes.
 */

import PlanningDashboard from '@/components/planning/PlanningDashboard';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Open the route for a selected Planning tool.
 *
 * @param {string} key The selected tool key.
 * @returns {void}
 */
const openPlanningTool = (key: string): void => {
    switch (key) {
        case 'budgets':
            router.push('/planning/budgets');
            break;
        case 'goals':
            router.push('/planning/goals');
            break;
        case 'insights':
            router.push('/planning/insights');
            break;
        case 'monthly-plan':
            router.push('/planning/monthly-plan');
            break;
        case 'cash-flow':
            router.push('/planning/cash-flow');
            break;
        case 'planned-expenses':
            router.push('/planning/planned-expenses');
            break;
        default:
            break;
    }
};

/**
 * Render the Planning tab.
 *
 * @returns {JSX.Element} The Planning dashboard.
 */
const PlanningTabScreen = () => {
    const { language, currency } = useLocale();

    return (
        <PlanningDashboard
            currency={currency}
            language={language}
            onOpenTool={openPlanningTool}
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)');
                }
            }}
        />
    );
};

export default PlanningTabScreen;
