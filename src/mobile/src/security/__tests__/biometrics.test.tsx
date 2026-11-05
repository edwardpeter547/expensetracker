/**
 * Unit tests for device biometric capability detection and prompt mapping.
 *
 * The native `expo-local-authentication` module is mocked so capability
 * branches and error text can be verified without a device.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import {
    authenticateBiometric,
    biometricErrorMessage,
    getBiometricCapability,
} from '../biometrics';

jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(),
    isEnrolledAsync: jest.fn(),
    supportedAuthenticationTypesAsync: jest.fn(),
    getEnrolledLevelAsync: jest.fn(),
    authenticateAsync: jest.fn(),
    AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
    SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const mockIsEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const mockTypes = LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock;
const mockAuthenticate = LocalAuthentication.authenticateAsync as jest.Mock;

describe('getBiometricCapability', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('reports unavailable when the device has no biometric hardware', async () => {
        mockHasHardware.mockResolvedValue(false);

        const capability = await getBiometricCapability();

        expect(capability.supported).toBe(false);
        expect(capability.reason).toContain('biometric hardware');
    });

    test('reports not enrolled when hardware exists but no biometrics are enrolled', async () => {
        mockHasHardware.mockResolvedValue(true);
        mockIsEnrolled.mockResolvedValue(false);

        const capability = await getBiometricCapability();

        expect(capability.supported).toBe(true);
        expect(capability.enrolled).toBe(false);
        expect(capability.reason).toContain('enrolled');
    });

    test('maps supported authentication types to UI methods', async () => {
        mockHasHardware.mockResolvedValue(true);
        mockIsEnrolled.mockResolvedValue(true);
        mockTypes.mockResolvedValue([
            LocalAuthentication.AuthenticationType.FINGERPRINT,
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        ]);

        const capability = await getBiometricCapability();

        expect(capability.supported).toBe(true);
        expect(capability.enrolled).toBe(true);
        expect(capability.strong).toBe(true);
        expect(capability.methods).toEqual(expect.arrayContaining(['fingerprint', 'face-id']));
    });
});

describe('authenticateBiometric', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('shares a single in-flight prompt across concurrent callers', async () => {
        let resolvePrompt: ((value: unknown) => void) | undefined;
        mockAuthenticate.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePrompt = resolve;
                }),
        );

        const first = authenticateBiometric({ promptMessage: 'Unlock' });
        const second = authenticateBiometric({ promptMessage: 'Unlock' });

        await Promise.resolve();
        expect(mockAuthenticate).toHaveBeenCalledTimes(1);

        resolvePrompt?.({ success: true });
        await Promise.all([first, second]);
    });

    test('returns a normalized failure result', async () => {
        mockAuthenticate.mockResolvedValue({ success: false, error: 'user_cancel' });

        const result = await authenticateBiometric({ promptMessage: 'Unlock' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('user_cancel');
    });
});

describe('biometricErrorMessage', () => {
    test('maps known native errors to readable messages', () => {
        expect(biometricErrorMessage('user_cancel')).toContain('canceled');
        expect(biometricErrorMessage('lockout')).toContain('password');
        expect(biometricErrorMessage('not_enrolled')).toContain('enrolled');
        expect(biometricErrorMessage('missing_usage_description')).toContain('development build');
    });

    test('falls back for unknown errors', () => {
        expect(biometricErrorMessage('unknown')).toContain('failed');
    });
});
