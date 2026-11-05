/**
 * Authentication state and session lifecycle.
 *
 * Owns credential login/register/logout, session restore, profile refresh,
 * and biometric login enrollment/verification. All session mutations flow
 * through the existing backend endpoints; biometrics only gate access to a
 * securely stored refresh-token credential.
 */

import { normalizeApiError } from '@/api/errors';
import {
    apiClient,
    clearStoredTokens,
    readStoredTokens,
    refreshSession,
    revokeSession,
    setAccessToken,
    storeTokens,
} from '@/api/client';
import { useLocale } from '@/contexts/LocaleContext';
import {
    authenticateBiometric,
    biometricErrorMessage,
    getBiometricCapability,
} from '@/security/biometrics';
import {
    deleteBiometricLoginCredential,
    deleteBiometricLoginMarker,
    readBiometricLoginCredential,
    readBiometricLoginMarker,
    saveBiometricLoginCredential,
    saveBiometricLoginMarker,
    type BiometricLoginMarker,
} from '@/security/biometricLoginStorage';
import type { UserProfile } from '@/types/profile';
import {
    createContext,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

interface RegisterData {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    /** Account for which biometric login is enrolled, or null. */
    biometricLogin: BiometricLoginMarker | null;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    enrollBiometricLogin: () => Promise<void>;
    disableBiometricLogin: () => Promise<void>;
    loginWithBiometrics: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provide authentication state and session mutations.
 *
 * @param {{children: ReactNode}} props Provider props.
 * @returns {JSX.Element} The provider.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [biometricLogin, setBiometricLogin] = useState<BiometricLoginMarker | null>(null);
    const biometricLoginInFlight = useRef(false);
    const { language, currency, applyRemotePreferences } = useLocale();

    useEffect(() => {
        const loadTokens = async () => {
            try {
                const { accessToken, refreshToken } = await readStoredTokens();

                if (accessToken && refreshToken) {
                    setAccessToken(accessToken);

                    const response = await apiClient.get('/user/profile');
                    const profile = response.data.data.profile;
                    setUser(profile);
                    applyRemotePreferences(profile.language, profile.currency);
                }
            } catch {
                await clearStoredTokens();
            } finally {
                setIsLoading(false);
            }
        };

        void loadTokens();
    }, [applyRemotePreferences]);

    useEffect(() => {
        let active = true;
        readBiometricLoginMarker()
            .then((marker) => {
                if (active) setBiometricLogin(marker);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);

    const login = async (email: string, password: string) => {
        const response = await apiClient.post('/auth/login', { email, password });
        const { user: nextUser, accessToken, refreshToken } = response.data.data;

        await storeTokens(accessToken, refreshToken);
        setUser(nextUser);
        applyRemotePreferences(nextUser.language, nextUser.currency);
    };

    const register = async (data: RegisterData) => {
        const response = await apiClient.post('/auth/register', {
            ...data,
            language,
            currency,
        });
        const { user: nextUser, accessToken, refreshToken } = response.data.data;

        await storeTokens(accessToken, refreshToken);
        setUser(nextUser);
        applyRemotePreferences(nextUser.language, nextUser.currency);
    };

    const logout = async () => {
        try {
            const { refreshToken } = await readStoredTokens();
            if (refreshToken) {
                await revokeSession(refreshToken).catch(() => undefined);
            }
        } catch {
            // Reading or revoking the stored session is non-fatal.
        }

        await clearStoredTokens().catch(() => undefined);
        await deleteBiometricLoginCredential().catch(() => undefined);
        await deleteBiometricLoginMarker().catch(() => undefined);

        setBiometricLogin(null);
        setUser(null);
    };

    /**
     * Enroll biometric login for the currently authenticated account.
     *
     * @returns {Promise<void>}
     * @throws {Error} When the device cannot support biometrics, verification
     *   fails, or no authenticated session exists.
     */
    const enrollBiometricLogin = async () => {
        if (!user) throw new Error('Sign in again before enabling biometric login.');

        const capability = await getBiometricCapability();
        if (!capability.supported || !capability.enrolled) {
            throw new Error(capability.reason ?? 'Biometric authentication is unavailable.');
        }
        if (!capability.strong) {
            throw new Error('This device does not support strong biometrics.');
        }

        const verification = await authenticateBiometric({
            promptMessage: 'Verify it is you to enable biometric sign-in',
            cancelLabel: 'Cancel',
        });
        if (!verification.success) {
            throw new Error(biometricErrorMessage(verification.error));
        }

        const { refreshToken } = await readStoredTokens();
        if (!refreshToken) throw new Error('Sign in again before enabling biometric login.');

        await saveBiometricLoginCredential({ refreshToken });
        const marker = { email: user.email, userId: user.id };
        await saveBiometricLoginMarker(marker);
        setBiometricLogin(marker);
    };

    /**
     * Remove the biometric login credential and marker.
     *
     * @returns {Promise<void>}
     */
    const disableBiometricLogin = async () => {
        await deleteBiometricLoginCredential();
        await deleteBiometricLoginMarker();
        setBiometricLogin(null);
    };

    /**
     * Restore an authenticated session using the biometric-gated credential.
     *
     * @returns {Promise<void>}
     * @throws {Error} With a user-presentable message on failure.
     */
    const loginWithBiometrics = async () => {
        if (biometricLoginInFlight.current) return;
        biometricLoginInFlight.current = true;
        try {
            const credential = await readBiometricLoginCredential();
            if (!credential) {
                await deleteBiometricLoginMarker();
                setBiometricLogin(null);
                throw new Error(
                    'Biometric sign-in is no longer available. Sign in with your password.',
                );
            }

            let tokens;
            try {
                tokens = await refreshSession(credential.refreshToken);
            } catch (cause) {
                const status = (cause as { response?: { status?: number } })?.response?.status;
                if (status === 401) {
                    await deleteBiometricLoginCredential();
                    await deleteBiometricLoginMarker();
                    setBiometricLogin(null);
                    throw new Error(
                        'Your biometric sign-in has expired. Sign in with your password.',
                    );
                }
                throw new Error(normalizeApiError(cause).message);
            }

            await storeTokens(tokens.accessToken, tokens.refreshToken);
            try {
                await saveBiometricLoginCredential({ refreshToken: tokens.refreshToken });
            } catch {
                // The refreshed session is still valid. If the rotated
                // credential cannot be re-persisted, clear enrollment rather
                // than leave a stale, already-consumed token behind.
                await deleteBiometricLoginCredential().catch(() => undefined);
                await deleteBiometricLoginMarker().catch(() => undefined);
                setBiometricLogin(null);
            }

            const response = await apiClient.get('/user/profile');
            const profile = response.data.data.profile as UserProfile;
            setUser(profile);
            applyRemotePreferences(profile.language, profile.currency);
        } finally {
            biometricLoginInFlight.current = false;
        }
    };

    /**
     * Refetch the authenticated profile and adopt its display preferences.
     *
     * @returns {Promise<void>} Resolves when the user state has been replaced.
     */
    const refreshProfile = useCallback(async () => {
        const response = await apiClient.get('/user/profile');
        const profile = response.data.data.profile as UserProfile;
        setUser(profile);
        applyRemotePreferences(profile.language, profile.currency);
    }, [applyRemotePreferences]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                biometricLogin,
                login,
                register,
                logout,
                refreshProfile,
                enrollBiometricLogin,
                disableBiometricLogin,
                loginWithBiometrics,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
