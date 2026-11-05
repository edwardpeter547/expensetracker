/**
 * Feature-access hooks for the frontend entitlement layer.
 *
 * Screens ask for an access decision through `useFeatureAccess` and gate
 * actions through `useFeatureGate`; they never compare subscription strings
 * such as `user.plan === "premium"` directly.
 */

import { useFeatureAccessContext } from '@/contexts/FeatureAccessContext';
import type {
    FeatureAccessResult,
    FeatureKey,
    RequestAccessOptions,
} from '@/types/featureAccess';

/** Normalized access view for a single feature. */
export interface FeatureAccessView {
    status: FeatureAccessResult['status'];
    featureId: FeatureKey;
    reason?: string;
    isAllowed: boolean;
    isDenied: boolean;
    isLoading: boolean;
    isUnknown: boolean;
    refresh: () => Promise<void>;
}

/**
 * Read the current access decision for one feature.
 *
 * @param {FeatureKey} featureId The stable feature identifier.
 * @returns {FeatureAccessView} The normalized access view.
 */
export const useFeatureAccess = (featureId: FeatureKey): FeatureAccessView => {
    const { getAccess, refresh } = useFeatureAccessContext();
    const result = getAccess(featureId);

    return {
        ...result,
        isAllowed: result.status === 'allowed',
        isDenied: result.status === 'denied',
        isLoading: result.status === 'loading',
        isUnknown: result.status === 'unknown',
        refresh,
    };
};

/** Action-level gate API exposed by `useFeatureGate`. */
export interface FeatureGateApi {
    /**
     * Run an action when access is allowed, otherwise present the gate.
     *
     * @param featureId The stable feature identifier.
     * @param onAllowed The action to run when access is allowed.
     * @param options Optional presentation override.
     */
    requestAccess: (
        featureId: FeatureKey,
        onAllowed: () => void,
        options?: RequestAccessOptions,
    ) => void;
}

/**
 * Access the action-level gate API.
 *
 * @returns {FeatureGateApi} The `requestAccess` helper.
 */
export const useFeatureGate = (): FeatureGateApi => {
    const { requestAccess } = useFeatureAccessContext();
    return { requestAccess };
};
