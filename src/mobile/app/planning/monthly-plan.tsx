/**
 * Monthly Plan route for the Planning workspace.
 *
 * Allocations are demo-only intended plans until editable allocations exist.
 */

import MonthlyPlanScreen from '@/components/planning/MonthlyPlanScreen';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Render the Monthly Plan route.
 *
 * @returns {JSX.Element} The Monthly Plan screen.
 */
const MonthlyPlanRoute = () => {
    const { language, currency } = useLocale();

    return (
        <MonthlyPlanScreen
            currency={currency}
            language={language}
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)/budgets');
                }
            }}
        />
    );
};

export default MonthlyPlanRoute;
