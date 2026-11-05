/**
 * Device biometric capability detection and prompt wrapper.
 *
 * This module never collects or stores raw biometric information; it only
 * uses the operating system's LocalAuthentication service to confirm the
 * current user. A single in-flight prompt is reused so concurrent callers can
 * never stack overlapping biometric dialogs.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Device biometric methods relevant to the UI. */
export type BiometricMethod = 'face-id' | 'touch-id' | 'fingerprint' | 'iris';

/** Resolved device capability for the security and lock screens. */
export interface BiometricCapability {
    /** The device has biometric hardware. */
    supported: boolean;
    /** At least one biometric (or device credential) is enrolled. */
    enrolled: boolean;
    /** The device supports strong biometrics suitable for authentication. */
    strong: boolean;
    methods: BiometricMethod[];
    /** Human-readable reason capability is not sufficient, when applicable. */
    reason?: string;
}

/** A normalized biometric prompt result. */
export interface BiometricPromptResult {
    success: boolean;
    /** LocalAuthentication error code, when the prompt failed. */
    error?: string;
}

let inFlightPrompt: Promise<BiometricPromptResult> | null = null;

/**
 * Resolve whether the device can authenticate with biometrics.
 *
 * @returns {Promise<BiometricCapability>} The device capability.
 */
export const getBiometricCapability = async (): Promise<BiometricCapability> => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    if (!supported) {
        return {
            supported: false,
            enrolled: false,
            strong: false,
            methods: [],
            reason: 'This device does not have biometric hardware.',
        };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
        return {
            supported: true,
            enrolled: false,
            strong: false,
            methods: [],
            reason: 'No fingerprint or face is enrolled on this device.',
        };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const methods = types.map(mapAuthenticationType).filter((value): value is BiometricMethod => value !== null);

    let strong = true;
    if (Platform.OS === 'android') {
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        strong = level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
    }

    return {
        supported: true,
        enrolled: true,
        strong,
        methods,
        reason: strong ? undefined : 'This device does not support strong biometrics.',
    };
};

/**
 * Map an AuthenticationType enum value to a UI method label.
 *
 * @param {LocalAuthentication.AuthenticationType} type The native type.
 * @returns {BiometricMethod|null} The mapped method, or null.
 */
const mapAuthenticationType = (
    type: LocalAuthentication.AuthenticationType,
): BiometricMethod | null => {
    switch (type) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face-id';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
        case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
        default:
            return null;
    }
};

/**
 * Prompt the operating system for biometric authentication.
 *
 * The Android prompt requires strong biometrics and disables unrestricted
 * device-credential fallback, so weak camera face unlock is not accepted.
 *
 * @param {object} options Prompt options.
 * @param {string} options.promptMessage The message shown in the prompt.
 * @param {string} [options.cancelLabel] The cancel button label.
 * @returns {Promise<BiometricPromptResult>} The normalized result.
 */
export const authenticateBiometric = async (options: {
    promptMessage: string;
    cancelLabel?: string;
}): Promise<BiometricPromptResult> => {
    if (inFlightPrompt) return inFlightPrompt;

    const commonOptions = {
        promptMessage: options.promptMessage,
        cancelLabel: options.cancelLabel ?? 'Use password',
    };
    const prompt = LocalAuthentication.authenticateAsync(
        Platform.OS === 'android'
            ? {
                  ...commonOptions,
                  disableDeviceFallback: true,
                  biometricsSecurityLevel: 'strong',
              }
            : {
                  ...commonOptions,
                  disableDeviceFallback: true,
              },
    ).then(
        (result) => ({
            success: result.success,
            error: result.success ? undefined : result.error,
        }),
        () => ({ success: false, error: 'unknown' }),
    );

    inFlightPrompt = prompt.finally(() => {
        inFlightPrompt = null;
    });

    return inFlightPrompt;
};

/**
 * Return a user-presentable message for a native biometric error code.
 *
 * @param {string|undefined} error The native error code.
 * @returns {string} A readable message.
 */
export const biometricErrorMessage = (error?: string): string => {
    switch (error) {
        case 'user_cancel':
            return 'Biometric authentication was canceled.';
        case 'system_cancel':
        case 'app_cancel':
            return 'Biometric authentication was interrupted.';
        case 'not_enrolled':
            return 'No fingerprint or face is enrolled on this device.';
        case 'not_available':
            return 'Biometric authentication is not available on this device.';
        case 'lockout':
            return 'Too many failed attempts. Use your password instead.';
        case 'authentication_failed':
            return 'Biometric verification failed. Please try again.';
        case 'invalid_context':
            return 'Biometric authentication was interrupted.';
        case 'passcode_not_set':
            return 'Set a device passcode before using biometrics.';
        case 'missing_usage_description':
            return 'Face ID is available but not configured for this build. Use a development build with Face ID enabled.';
        case 'user_fallback':
            return 'Face ID fell back to the device passcode.';
        case 'unable_to_process':
            return 'Biometric authentication is temporarily unavailable. Try again.';
        default:
            return 'Biometric authentication failed.';
    }
};
