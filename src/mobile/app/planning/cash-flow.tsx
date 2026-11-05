/**
 * Cash Flow route for the Planning workspace.
 *
 * Projections are demo-only until recurring-transaction data is wired in.
 */

import CashFlowScreen from '@/components/planning/CashFlowScreen';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';

/**
 * Render the Cash Flow route.
 *
 * @returns {JSX.Element} The Cash Flow screen.
 */
const CashFlowRoute = () => {
    const { language, currency } = useLocale();

    return (
        <CashFlowScreen
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

export default CashFlowRoute;
