/**
 * Unit tests for biometric login credential storage.
 *
 * `expo-secure-store` is replaced with an in-memory map so read/write/delete
 * behaviour and null-on-invalidated semantics can be asserted directly.
 */

import * as SecureStore from 'expo-secure-store';
import {
    deleteBiometricLoginCredential,
    deleteBiometricLoginMarker,
    readBiometricLoginCredential,
    readBiometricLoginMarker,
    saveBiometricLoginCredential,
    saveBiometricLoginMarker,
} from '../biometricLoginStorage';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
    getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
        mockStore.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
        mockStore.delete(key);
    }),
}));

describe('biometric login credential storage', () => {
    beforeEach(() => {
        mockStore.clear();
        jest.clearAllMocks();
    });

    test('round-trips the account marker', async () => {
        await saveBiometricLoginMarker({ email: 'ada@example.com', userId: 7 });
        const marker = await readBiometricLoginMarker();

        expect(marker).toEqual({ email: 'ada@example.com', userId: 7 });
    });

    test('stores the credential with authentication required', async () => {
        await saveBiometricLoginCredential({ refreshToken: 'token-123' });

        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('token-123'),
            expect.objectContaining({ requireAuthentication: true }),
        );
    });

    test('returns null when the credential has been invalidated or is missing', async () => {
        const credential = await readBiometricLoginCredential();
        expect(credential).toBeNull();
    });

    test('deletes the credential and marker independently', async () => {
        await saveBiometricLoginMarker({ email: 'ada@example.com', userId: 7 });
        await saveBiometricLoginCredential({ refreshToken: 'token-123' });

        await deleteBiometricLoginCredential();
        await deleteBiometricLoginMarker();

        expect(await readBiometricLoginMarker()).toBeNull();
        expect(await readBiometricLoginCredential()).toBeNull();
    });
});
