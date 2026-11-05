/**
 * Membership & Billing route.
 *
 * Supplies the resolved membership presentation to the dedicated screen and
 * owns back navigation. Billing management and plan selection callbacks are
 * intentionally omitted because no verified billing flow exists.
 */

import MembershipBillingScreen from '@/components/profile/MembershipBillingScreen';
import { useMembership } from '@/hooks/useMembership';
import { router } from 'expo-router';

/**
 * Render the Membership & Billing route.
 *
 * @returns {JSX.Element} The membership screen.
 */
const MembershipRoute = () => {
    const { membership, loading, error } = useMembership();

    return (
        <MembershipBillingScreen
            membership={membership}
            loading={loading}
            error={error}
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)/profile');
                }
            }}
        />
    );
};

export default MembershipRoute;
