/**
 * Biometric App Lock screen.
 *
 * Rendered instead of the navigator while a protected session is locked. It
 * only offers an operating-system biometric prompt and a password sign-out
 * recovery path; cancel never unlocks the app.
 */

import { Ionicons } from '@expo/vector-icons';
import { profileTheme as t } from '@/constants/profileTheme';
import { useAppLock } from '@/contexts/AppLockContext';
import { useAuth } from '@/hooks/useAuth';
import {
    getBiometricCapability,
    type BiometricCapability,
} from '@/security/biometrics';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Resolve a device-appropriate unlock label.
 *
 * @param {BiometricCapability|null} capability The resolved capability.
 * @returns {string} The unlock button label.
 */
const unlockLabel = (capability: BiometricCapability | null): string => {
    if (capability?.methods.includes('face-id')) return 'Unlock with Face ID';
    if (capability?.methods.includes('fingerprint')) return 'Unlock with Fingerprint';
    return 'Unlock';
};

/**
 * Render the App Lock screen.
 *
 * @returns {JSX.Element} The lock screen.
 */
const AppLockScreen = () => {
    const insets = useSafeAreaInsets();
    const { unlock } = useAppLock();
    const { logout } = useAuth();
    const [capability, setCapability] = useState<BiometricCapability | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const promptedOnce = useRef(false);

    useEffect(() => {
        let active = true;
        getBiometricCapability()
            .then((value) => {
                if (active) setCapability(value);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    /**
     * Trigger a single biometric unlock attempt.
     *
     * @returns {Promise<void>}
     */
    const attemptUnlock = async () => {
        setBusy(true);
        setError(null);
        const result = await unlock();
        if (!result.success) {
            setError(result.error ?? 'Biometric authentication was not completed.');
        }
        setBusy(false);
    };

    useEffect(() => {
        if (promptedOnce.current || !capability) return;
        if (!capability.supported || !capability.enrolled) return;
        promptedOnce.current = true;
        void attemptUnlock();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [capability]);

    /**
     * Sign out so the user can recover with their password.
     *
     * @returns {void}
     */
    const confirmPasswordRecovery = () => {
        Alert.alert(
            'Use password instead',
            'Sign out to unlock ExpenseTracker with your password?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
            ],
        );
    };

    const canUnlock = Boolean(capability?.supported && capability?.enrolled);

    return (
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.body}>
                <View style={styles.iconRing}>
                    <Ionicons name="lock-closed" size={34} color={t.green} />
                </View>
                <Text style={styles.title}>ExpenseTracker is locked</Text>
                <Text style={styles.subtitle}>
                    Verify it is you to continue to your financial information.
                </Text>

                {error ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                        {error}
                    </Text>
                ) : null}

                {busy ? (
                    <ActivityIndicator size="large" color={t.green} style={styles.busy} />
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Unlock"
                        disabled={!canUnlock}
                        onPress={() => void attemptUnlock()}
                        style={[styles.primary, !canUnlock && styles.primaryDisabled]}
                    >
                        <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryText}>{unlockLabel(capability)}</Text>
                    </Pressable>
                )}

                {!canUnlock ? (
                    <Text style={styles.unavailable}>
                        Biometrics are not available on this device. Use your password instead.
                    </Text>
                ) : null}

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Use password instead"
                    onPress={confirmPasswordRecovery}
                    style={styles.recovery}
                >
                    <Text style={styles.recoveryText}>Use password instead</Text>
                </Pressable>
            </View>
        </View>
    );
};

/** App Lock screen styles. */
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: t.navyDeep,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    body: { width: '100%', maxWidth: 360, alignItems: 'center' },
    iconRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: t.greenLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 22, letterSpacing: -0.4 },
    subtitle: {
        color: '#C2D0DD',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 10,
    },
    error: { color: '#FFB4B9', fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 19 },
    busy: { marginTop: 22 },
    primary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        backgroundColor: t.green,
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginTop: 24,
        alignSelf: 'stretch',
    },
    primaryDisabled: { opacity: 0.5 },
    primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    unavailable: {
        color: '#C2D0DD',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginTop: 14,
    },
    recovery: { marginTop: 18, padding: 8 },
    recoveryText: { color: '#A8C8C6', fontSize: 14, fontWeight: '700' },
});

export default AppLockScreen;
