/**
 * Frontend feature-entitlement provider.
 *
 * Resolves per-feature access decisions through a replaceable adapter. The
 * default is a clearly-labelled development-only mock; a future authenticated
 * backend adapter can be injected without changing individual screens. The
 * provider also owns the reusable upgrade modal used by action-level
 * `requestAccess` calls.
 */

import {
    FeatureAccessLoading,
    FeatureAccessUnavailable,
} from '@/components/premium/AccessStateViews';
import PremiumFeatureGate from '@/components/premium/PremiumFeatureGate';
import { FEATURE_CATALOG } from '@/constants/featureCatalog';
import type {
    EntitlementSnapshot,
    FeatureAccessResult,
    FeatureAccessStatus,
    FeatureEntitlementAdapter,
    FeatureKey,
    GatePresentation,
    RequestAccessOptions,
} from '@/types/featureAccess';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Development-only mock entitlement map. Replace with a server adapter. */
const DEMO_ENTITLEMENTS: Record<FeatureKey, FeatureAccessStatus> = {
    'teams.create': 'denied',
    'teams.invite': 'denied',
    'teams.contributions': 'denied',
    'teams.manage': 'allowed',
    'planning.insights': 'denied',
    'planning.cashflow': 'denied',
    'receipts.scan': 'denied',
    'transactions.export': 'denied',
};

/** Value exposed by the feature-access context. */
export interface FeatureAccessContextValue {
    /** Resolve the current access decision for one feature. */
    getAccess: (featureId: FeatureKey) => FeatureAccessResult;
    /** Gate an action: runs `onAllowed` or presents the appropriate state. */
    requestAccess: (
        featureId: FeatureKey,
        onAllowed: () => void,
        options?: RequestAccessOptions,
    ) => void;
    /** Development-only mock override; no-op outside `__DEV__`. */
    setMockStatus: (featureId: FeatureKey, status: FeatureAccessStatus) => void;
    /** Clear all development mock overrides; no-op outside `__DEV__`. */
    resetMock: () => void;
    /** Re-fetch entitlements from the adapter when one exists. */
    refresh: () => Promise<void>;
}

/** Modal content state owned by the provider. */
type GateModalState =
    | { kind: 'gate'; featureId: FeatureKey; presentation: GatePresentation }
    | { kind: 'loading' }
    | { kind: 'unknown'; featureId: FeatureKey }
    | null;

export const FeatureAccessContext = createContext<FeatureAccessContextValue | undefined>(
    undefined,
);

/** Props for the feature-access provider. */
export interface FeatureAccessProviderProps {
    /** Optional server adapter; omitted, the development mock is used. */
    adapter?: FeatureEntitlementAdapter;
    children: ReactNode;
}

/**
 * Provide feature-access decisions and the shared upgrade modal.
 *
 * @param {FeatureAccessProviderProps} props Provider props.
 * @returns {JSX.Element} The provider.
 */
export const FeatureAccessProvider = ({
    adapter,
    children,
}: FeatureAccessProviderProps) => {
    const [overrides, setOverrides] = useState<
        Partial<Record<FeatureKey, FeatureAccessStatus>>
    >({});
    const [modal, setModal] = useState<GateModalState>(null);
    const pendingRef = useRef<{
        featureId: FeatureKey;
        onAllowed: () => void;
        presentation: GatePresentation;
    } | null>(null);

    /**
     * Resolve the current access decision for one feature.
     *
     * @param {FeatureKey} featureId The stable feature identifier.
     * @returns {FeatureAccessResult} The effective access decision.
     */
    const resolveAccess = useCallback(
        (featureId: FeatureKey): FeatureAccessResult => {
            if (adapter) {
                const snapshot: EntitlementSnapshot = adapter.getAccess(featureId);
                return {
                    featureId,
                    status: snapshot.status,
                    reason: snapshot.reason,
                };
            }

            const status =
                overrides[featureId] ?? DEMO_ENTITLEMENTS[featureId] ?? 'unknown';
            return {
                featureId,
                status,
                reason:
                    status === 'unknown'
                        ? 'Entitlement information is unavailable right now.'
                        : undefined,
            };
        },
        [adapter, overrides],
    );

    /**
     * Close the shared modal and clear its pending callback.
     */
    const closeModal = useCallback(() => {
        pendingRef.current = null;
        setModal(null);
    }, []);

    /**
     * Gate an action by feature.
     *
     * Allowed actions run immediately; denied, loading, and unknown decisions
     * present their dedicated states rather than navigating or claiming an
     * upgrade.
     *
     * @param {FeatureKey} featureId The stable feature identifier.
     * @param {() => void} onAllowed Called when access is allowed.
     * @param {RequestAccessOptions} [options] Optional presentation override.
     */
    const requestAccess = useCallback(
        (
            featureId: FeatureKey,
            onAllowed: () => void,
            options?: RequestAccessOptions,
        ) => {
            const presentation =
                options?.presentation ?? FEATURE_CATALOG[featureId].presentation;
            const result = resolveAccess(featureId);

            if (result.status === 'allowed') {
                onAllowed();
                return;
            }

            pendingRef.current = { featureId, onAllowed, presentation };

            if (result.status === 'denied') {
                setModal({ kind: 'gate', featureId, presentation });
                return;
            }

            if (result.status === 'loading') {
                setModal({ kind: 'loading' });
                return;
            }

            setModal({ kind: 'unknown', featureId });
        },
        [resolveAccess],
    );

    /**
     * Re-check the pending unknown decision.
     */
    const retryUnknown = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) {
            closeModal();
            return;
        }

        const result = resolveAccess(pending.featureId);

        if (result.status === 'allowed') {
            const { onAllowed } = pending;
            pendingRef.current = null;
            setModal(null);
            onAllowed();
            return;
        }

        if (result.status === 'denied') {
            setModal({
                kind: 'gate',
                featureId: pending.featureId,
                presentation: pending.presentation,
            });
            return;
        }

        if (result.status === 'loading') {
            setModal({ kind: 'loading' });
        }
    }, [closeModal, resolveAccess]);

    /**
     * Set a development-only mock override.
     *
     * @param {FeatureKey} featureId The feature to override.
     * @param {FeatureAccessStatus} status The simulated status.
     */
    const setMockStatus = useCallback(
        (featureId: FeatureKey, status: FeatureAccessStatus) => {
            if (!__DEV__) return;
            setOverrides((previous) => ({ ...previous, [featureId]: status }));
        },
        [],
    );

    /**
     * Clear all development-only mock overrides.
     */
    const resetMock = useCallback(() => {
        if (!__DEV__) return;
        setOverrides({});
    }, []);

    /**
     * Re-fetch entitlements when a server adapter is present.
     *
     * @returns {Promise<void>} Resolves when the refresh settles.
     */
    const refresh = useCallback(async () => {
        await adapter?.refresh?.();
    }, [adapter]);

    const insets = useSafeAreaInsets();
    const isFullScreen = !(modal?.kind === 'gate' && modal.presentation === 'compact');
    const topPadding = Platform.OS === 'ios' && isFullScreen ? insets.top : 0;

    const value = useMemo<FeatureAccessContextValue>(
        () => ({
            getAccess: resolveAccess,
            requestAccess,
            setMockStatus,
            resetMock,
            refresh,
        }),
        [resolveAccess, requestAccess, setMockStatus, resetMock, refresh],
    );

    return (
        <FeatureAccessContext.Provider value={value}>
            {children}
            <Modal
                visible={modal !== null}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                {modal?.kind === 'gate' ? (
                    <View style={styles.overlay}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={closeModal}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss upgrade"
                        />
                        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
                            <PremiumFeatureGate
                                feature={modal.featureId}
                                presentation={modal.presentation}
                                onDismiss={closeModal}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={[styles.fullScreen, { paddingTop: topPadding, paddingBottom: insets.bottom }]}>
                        {modal?.kind === 'loading' ? (
                            <FeatureAccessLoading onBack={closeModal} />
                        ) : null}
                        {modal?.kind === 'unknown' ? (
                            <FeatureAccessUnavailable
                                onRetry={retryUnknown}
                                onBack={closeModal}
                            />
                        ) : null}
                    </View>
                )}
            </Modal>
        </FeatureAccessContext.Provider>
    );
};

/** Upgrade modal layout styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
    },
    sheet: {
        height: '72%',
        backgroundColor: '#F7F8F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    fullScreen: {
        flex: 1,
        backgroundColor: '#F7F8F6',
    },
});

/**
 * Consume the feature-access context.
 *
 * @returns {FeatureAccessContextValue} The context value.
 */
export const useFeatureAccessContext = (): FeatureAccessContextValue => {
    const context = useContext(FeatureAccessContext);
    if (!context) {
        throw new Error(
            'useFeatureAccessContext must be used within FeatureAccessProvider',
        );
    }
    return context;
};
