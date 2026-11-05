/**
 * Biometric login credential storage.
 *
 * The refresh token is kept in `expo-secure-store` with
 * `requireAuthentication` enabled so the operating system gates every read
 * behind biometric verification. A separate non-sensitive marker records the
 * enrolled account without exposing any credential and without prompting.
 */

import * as SecureStore from 'expo-secure-store';

const MARKER_KEY = 'expensetracker.biometricLogin.marker.v1';
const CREDENTIAL_KEY = 'expensetracker.biometricLogin.credential.v1';

/** Non-sensitive account marker for the biometric login UI. */
export interface BiometricLoginMarker {
    email: string;
    userId: number;
}

/** Biometric-gated credential exchanged through the refresh endpoint. */
export interface BiometricLoginCredential {
    refreshToken: string;
}

/**
 * Read the enrolled-account marker without triggering a prompt.
 *
 * @returns {Promise<BiometricLoginMarker|null>} The marker, or null.
 */
export const readBiometricLoginMarker = async (): Promise<BiometricLoginMarker | null> => {
    const raw = await SecureStore.getItemAsync(MARKER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as BiometricLoginMarker;
    } catch {
        return null;
    }
};

/**
 * Persist the enrolled-account marker.
 *
 * @param {BiometricLoginMarker} marker The account marker.
 * @returns {Promise<void>}
 */
export const saveBiometricLoginMarker = async (marker: BiometricLoginMarker): Promise<void> => {
    await SecureStore.setItemAsync(MARKER_KEY, JSON.stringify(marker));
};

/**
 * Remove the enrolled-account marker.
 *
 * @returns {Promise<void>}
 */
export const deleteBiometricLoginMarker = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(MARKER_KEY);
};

/**
 * Persist the biometric-gated refresh token.
 *
 * @param {BiometricLoginCredential} credential The credential.
 * @returns {Promise<void>}
 */
export const saveBiometricLoginCredential = async (
    credential: BiometricLoginCredential,
): Promise<void> => {
    await SecureStore.setItemAsync(CREDENTIAL_KEY, JSON.stringify(credential), {
        requireAuthentication: true,
        authenticationPrompt: 'Unlock your biometric sign-in',
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
};

/**
 * Read the biometric-gated refresh token, prompting the user to authenticate.
 *
 * A null result also represents an invalidated key (for example after the
 * user changes their enrolled fingerprints or face).
 *
 * @returns {Promise<BiometricLoginCredential|null>} The credential, or null.
 */
export const readBiometricLoginCredential = async (): Promise<BiometricLoginCredential | null> => {
    const raw = await SecureStore.getItemAsync(CREDENTIAL_KEY, {
        requireAuthentication: true,
        authenticationPrompt: 'Unlock your biometric sign-in',
    });
    if (!raw) return null;
    try {
        return JSON.parse(raw) as BiometricLoginCredential;
    } catch {
        return null;
    }
};

/**
 * Remove the biometric-gated credential.
 *
 * @returns {Promise<void>}
 */
export const deleteBiometricLoginCredential = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
};
