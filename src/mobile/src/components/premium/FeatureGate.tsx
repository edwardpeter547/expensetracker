/**
 * Route and section-level feature guard.
 *
 * Renders children only when access is allowed. Denied access renders the
 * reusable premium gate, loading renders a pending state, and unknown renders
 * a retryable unavailable state. The guard never claims a network error is a
 * confirmed subscription denial.
 */

import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import type { FeatureKey } from '@/types/featureAccess';
import type { ReactNode } from 'react';
import {
    FeatureAccessLoading,
    FeatureAccessUnavailable,
} from './AccessStateViews';
import PremiumFeatureGate from './PremiumFeatureGate';

/** Props for the feature guard. */
export interface FeatureGateProps {
    featureId: FeatureKey;
    /**
     * `screen` replaces the whole surface (route protection). `inline` shows a
     * compact upgrade in place of the restricted section.
     */
    presentation?: 'screen' | 'inline';
    /** Called by the premium gate's secondary action. */
    onDeniedDismiss?: () => void;
    /** Called by the pending/unavailable states' back control. */
    onBack?: () => void;
    children: ReactNode;
}

/**
 * Render the feature guard.
 *
 * @param {FeatureGateProps} props Component props.
 * @returns {JSX.Element} The guard.
 */
const FeatureGate = ({
    featureId,
    presentation = 'screen',
    onDeniedDismiss,
    onBack,
    children,
}: FeatureGateProps) => {
    const { status, reason, refresh } = useFeatureAccess(featureId);

    if (status === 'allowed') {
        return <>{children}</>;
    }

    if (status === 'loading') {
        return <FeatureAccessLoading onBack={onBack} />;
    }

    if (status === 'unknown') {
        return (
            <FeatureAccessUnavailable
                onRetry={() => {
                    void refresh();
                }}
                onBack={onBack}
                reason={reason}
            />
        );
    }

    return (
        <PremiumFeatureGate
            feature={featureId}
            presentation={presentation === 'inline' ? 'compact' : 'full'}
            onDismiss={onDeniedDismiss ?? onBack}
        />
    );
};

export default FeatureGate;
