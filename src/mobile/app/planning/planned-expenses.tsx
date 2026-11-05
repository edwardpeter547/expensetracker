/**
 * Planned Expenses route for the Planning workspace.
 *
 * Planned expenses are demo-only until a backend model exists.
 */

import PlannedExpensesScreen from '@/components/planning/PlannedExpensesScreen';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Render the Planned Expenses route.
 *
 * @returns {JSX.Element} The Planned Expenses screen.
 */
const PlannedExpensesRoute = () => {
    const { language, currency } = useLocale();

    return (
        <PlannedExpensesScreen
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

export default PlannedExpensesRoute;
