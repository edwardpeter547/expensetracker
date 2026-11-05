/**
 * Savings Goals route for the Planning workspace.
 *
 * Goals are demo-only until a backend goals model exists.
 */

import SavingsGoalsScreen from '@/components/planning/SavingsGoalsScreen';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Render the Savings Goals route.
 *
 * @returns {JSX.Element} The Savings Goals screen.
 */
const SavingsGoalsRoute = () => {
    const { language, currency } = useLocale();

    return (
        <SavingsGoalsScreen
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

export default SavingsGoalsRoute;
