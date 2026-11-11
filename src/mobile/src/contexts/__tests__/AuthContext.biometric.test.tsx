/**
 * AuthContext biometric login lifecycle tests.
 *
 * The API client, locale, biometric prompt, and secure storage modules are
 * mocked so enrollment, expired-credential handling, and logout cleanup can
 * be asserted without a backend or device.
 */

import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '@/hooks/useAuth';
import {
    apiClient,
    readStoredTokens,
    refreshSession,
} from '@/api/client';
import {
    deleteBiometricLoginCredential,
    deleteBiometricLoginMarker,
    readBiometricLoginCredential,
    saveBiometricLoginCredential,
    saveBiometricLoginMarker,
} from '@/security/biometricLoginStorage';
import {
    authenticateBiometric,
    getBiometricCapability,
} from '@/security/biometrics';

jest.mock('@/api/client', () => ({
    apiClient: { get: jest.fn(), post: jest.fn() },
    readStoredTokens: jest.fn(),
    storeTokens: jest.fn(),
    clearStoredTokens: jest.fn(() => Promise.resolve()),
    setAccessToken: jest.fn(),
    refreshSession: jest.fn(),
    revokeSession: jest.fn(() => Promise.resolve()),
}));

const mockApplyRemotePreferences = jest.fn();

jest.mock('@/contexts/LocaleContext', () => ({
    useLocale: jest.fn(() => ({
        language: 'en',
        currency: 'USD',
        isLanguageOverridden: false,
        applyRemotePreferences: mockApplyRemotePreferences,
        clearRemotePreferences: jest.fn(),
    })),
}));

jest.mock('@/api/errors', () => ({
    normalizeApiError: jest.fn((error: { message?: string }) => ({
        message: error?.message || 'Network error',
    })),
}));

jest.mock('@/security/biometrics', () => ({
    getBiometricCapability: jest.fn(),
    authenticateBiometric: jest.fn(),
    biometricErrorMessage: jest.fn(() => 'Biometric authentication failed.'),
}));

jest.mock('@/security/biometricLoginStorage', () => ({
    readBiometricLoginMarker: jest.fn(() => Promise.resolve(null)),
    saveBiometricLoginMarker: jest.fn(() => Promise.resolve()),
    deleteBiometricLoginMarker: jest.fn(() => Promise.resolve()),
    saveBiometricLoginCredential: jest.fn(() => Promise.resolve()),
    readBiometricLoginCredential: jest.fn(() => Promise.resolve(null)),
    deleteBiometricLoginCredential: jest.fn(() => Promise.resolve()),
}));

const mockApiGet = apiClient.get as jest.Mock;
const mockReadStoredTokens = readStoredTokens as jest.Mock;
const mockRefreshSession = refreshSession as jest.Mock;
const mockGetCapability = getBiometricCapability as jest.Mock;
const mockAuthenticate = authenticateBiometric as jest.Mock;

const PROFILE = {
    id: 7,
    email: 'ada@example.com',
    username: 'ada',
    firstname: 'Ada',
    lastname: 'Lovelace',
};

let capturedAuth: ReturnType<typeof useAuth> | undefined;
let tree: ReturnType<typeof create>;

/** Capture the auth context value without rendering UI. */
const Probe = () => {
    const auth = useAuth();
    useEffect(() => {
        capturedAuth = auth;
    });
    return <Text accessibilityLabel="auth-status">{auth.user ? 'authenticated' : 'signed-out'}</Text>;
};

/**
 * Mount the provider and flush its initial effects.
 *
 * @returns {Promise<void>}
 */
const mountProvider = async () => {
    await act(async () => {
        tree = create(
            <AuthProvider>
                <Probe />
            </AuthProvider>,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

describe('AuthContext biometric login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        capturedAuth = undefined;
        mockReadStoredTokens.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' });
        mockApiGet.mockResolvedValue({ data: { data: { profile: PROFILE } } });
    });

    test('enrolls biometric login after verification and provisions a credential', async () => {
        mockGetCapability.mockResolvedValue({
            supported: true,
            enrolled: true,
            strong: true,
            methods: ['fingerprint'],
        });
        mockAuthenticate.mockResolvedValue({ success: true });

        await mountProvider();
        await act(async () => {
            await capturedAuth!.enrollBiometricLogin();
        });

        expect(saveBiometricLoginCredential).toHaveBeenCalledWith({ refreshToken: 'ref' });
        expect(saveBiometricLoginMarker).toHaveBeenCalledWith({
            email: 'ada@example.com',
            userId: 7,
        });
        expect(capturedAuth!.biometricLogin).toEqual({
            email: 'ada@example.com',
            userId: 7,
        });
    });

    test('rejects enrollment when the device cannot support biometrics', async () => {
        mockGetCapability.mockResolvedValue({
            supported: false,
            enrolled: false,
            strong: false,
            methods: [],
            reason: 'No biometric hardware',
        });

        await mountProvider();

        await expect(
            act(async () => {
                await capturedAuth!.enrollBiometricLogin();
            }),
        ).rejects.toThrow('No biometric hardware');
        expect(saveBiometricLoginCredential).not.toHaveBeenCalled();
    });

    test('clears an expired biometric credential and explains the failure', async () => {
        (readBiometricLoginCredential as jest.Mock).mockResolvedValue({
            refreshToken: 'expired',
        });
        mockRefreshSession.mockRejectedValue({ response: { status: 401 } });

        await mountProvider();

        let thrown: Error | undefined;
        await act(async () => {
            try {
                await capturedAuth!.loginWithBiometrics();
            } catch (cause) {
                thrown = cause as Error;
            }
        });

        expect(thrown?.message).toContain('expired');
        expect(deleteBiometricLoginCredential).toHaveBeenCalled();
        expect(deleteBiometricLoginMarker).toHaveBeenCalled();
    });

    test('explicit logout removes the biometric credential', async () => {
        mockApiGet.mockResolvedValue({ data: { data: { profile: PROFILE } } });
        (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

        await mountProvider();
        await act(async () => {
            await capturedAuth!.logout();
        });
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(deleteBiometricLoginCredential).toHaveBeenCalled();
        expect(deleteBiometricLoginMarker).toHaveBeenCalled();
        expect(tree.root.findByProps({ accessibilityLabel: 'auth-status' }).props.children).toBe(
            'signed-out',
        );
    });
});
