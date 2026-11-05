/**
 * Biometric App Lock state.
 *
 * Tracks the persisted lock settings, arms the lock on cold launch and after
 * the configured background threshold, and gates rendering while an
 * authenticated session is present. It never creates a backend session.
 */

import { useAuth } from '@/hooks/useAuth';
import {
    clearBackgroundedAt,
    loadAppLockSettings,
    loadBackgroundedAt,
    saveAppLockEnabled,
    saveAppLockTiming,
    saveBackgroundedAt,
    shouldLockAfterBackground,
    type AppLockTiming,
} from '@/security/appLock';
import {
    authenticateBiometric,
    biometricErrorMessage,
    getBiometricCapability,
} from '@/security/biometrics';
import {
    AppState,
    type AppStateStatus,
} from 'react-native';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

/** State exposed to the root gate and Security settings. */
export interface AppLockContextValue {
    enabled: boolean;
    timing: AppLockTiming;
    locked: boolean;
    /** False until the cold-start lock decision has been made. */
    lockReady: boolean;
    hydrated: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
    setTiming: (timing: AppLockTiming) => Promise<void>;
    unlock: () => Promise<{ success: boolean; error?: string }>;
    lock: () => void;
}

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

/**
 * Provide Biometric App Lock state and actions.
 *
 * @param {{children: ReactNode}} props Provider props.
 * @returns {JSX.Element} The provider.
 */
export const AppLockProvider = ({ children }: { children: ReactNode }) => {
    const { user, isLoading: authLoading } = useAuth();
    const [enabled, setEnabledState] = useState(false);
    const [timing, setTimingState] = useState<AppLockTiming>('immediate');
    const [locked, setLocked] = useState(false);
    const [lockReady, setLockReady] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const coldStartChecked = useRef(false);
    const backgroundedAtRef = useRef<number | null>(null);

    useEffect(() => {
        let active = true;
        loadAppLockSettings()
            .then((settings) => {
                if (!active) return;
                setEnabledState(settings.enabled);
                setTimingState(settings.timing);
                setHydrated(true);
            })
            .catch(() => {
                if (active) setHydrated(true);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (authLoading || !hydrated || coldStartChecked.current) return;
        coldStartChecked.current = true;
        setLocked(Boolean(user && enabled));
        setLockReady(true);
    }, [authLoading, hydrated, user, enabled]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'background') {
                const now = Date.now();
                backgroundedAtRef.current = now;
                void saveBackgroundedAt(now);
                return;
            }
            if (next !== 'active') return;

            void (async () => {
                if (!enabled || !user) return;
                const persisted = await loadBackgroundedAt();
                const backgroundedAt = backgroundedAtRef.current ?? persisted;
                if (backgroundedAt === null) return;
                const elapsedMs = Date.now() - backgroundedAt;
                // Consume the timestamp once so a single backgrounding never
                // re-arms the lock on later transient active/inactive cycles.
                backgroundedAtRef.current = null;
                await clearBackgroundedAt().catch(() => undefined);
                if (shouldLockAfterBackground(timing, elapsedMs)) {
                    setLocked(true);
                }
            })();
        });
        return () => subscription.remove();
    }, [enabled, timing, user]);

    /**
     * Persist the enabled flag.
     *
     * @param {boolean} value Whether app lock is enabled.
     * @returns {Promise<void>}
     */
    const setEnabled = useCallback(async (value: boolean) => {
        await saveAppLockEnabled(value);
        setEnabledState(value);
        if (!value) setLocked(false);
    }, []);

    /**
     * Persist the lock timing preset.
     *
     * @param {AppLockTiming} value The selected preset.
     * @returns {Promise<void>}
     */
    const setTiming = useCallback(async (value: AppLockTiming) => {
        await saveAppLockTiming(value);
        setTimingState(value);
    }, []);

    /**
     * Unlock the app after a successful biometric prompt.
     *
     * @returns {Promise<{success: boolean, error?: string}>} The unlock result.
     */
    const unlock = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        const capability = await getBiometricCapability();
        if (!capability.supported || !capability.enrolled) {
            return {
                success: false,
                error: capability.reason ?? 'Biometrics are not available on this device.',
            };
        }

        const result = await authenticateBiometric({
            promptMessage: 'Unlock ExpenseTracker',
            cancelLabel: 'Cancel',
        });
        if (result.success) {
            setLocked(false);
            return { success: true };
        }
        return { success: false, error: biometricErrorMessage(result.error) };
    }, []);

    /**
     * Immediately lock the app.
     *
     * @returns {void}
     */
    const lock = useCallback(() => {
        setLocked(true);
    }, []);

    return (
        <AppLockContext.Provider
            value={{ enabled, timing, locked, lockReady, hydrated, setEnabled, setTiming, unlock, lock }}
        >
            {children}
        </AppLockContext.Provider>
    );
};

/**
 * Consume the App Lock context.
 *
 * @returns {AppLockContextValue} The app lock state.
 * @throws {Error} When used outside `AppLockProvider`.
 */
export const useAppLock = (): AppLockContextValue => {
    const context = useContext(AppLockContext);
    if (!context) throw new Error('useAppLock must be used within AppLockProvider');
    return context;
};
