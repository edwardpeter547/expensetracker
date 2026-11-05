/**
 * Insights route for the Planning workspace.
 *
 * Insights are demo-only until an insights endpoint or transaction-derived
 * mapping is available.
 */

import InsightsScreen from '@/components/planning/InsightsScreen';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Render the Insights route.
 *
 * @returns {JSX.Element} The Insights screen.
 */
const InsightsRoute = () => {
    const { language, currency } = useLocale();

    return (
        <InsightsScreen
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

export default InsightsRoute;
