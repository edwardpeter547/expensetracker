/**
 * Unit tests for Biometric App Lock timing and settings persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    clearBackgroundedAt,
    loadAppLockSettings,
    loadBackgroundedAt,
    saveAppLockEnabled,
    saveAppLockTiming,
    saveBackgroundedAt,
    shouldLockAfterBackground,
} from '../appLock';

jest.mock('@react-native-async-storage/async-storage', () =>
    jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('shouldLockAfterBackground', () => {
    test('locks immediately for the immediate preset', () => {
        expect(shouldLockAfterBackground('immediate', 0)).toBe(true);
    });

    test('locks after one minute only once the threshold is crossed', () => {
        expect(shouldLockAfterBackground('1m', 59_999)).toBe(false);
        expect(shouldLockAfterBackground('1m', 60_000)).toBe(true);
    });

    test('locks after five minutes only once the threshold is crossed', () => {
        expect(shouldLockAfterBackground('5m', 299_999)).toBe(false);
        expect(shouldLockAfterBackground('5m', 300_000)).toBe(true);
    });
});

describe('app lock settings persistence', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    test('loads safe defaults when nothing has been persisted', async () => {
        const settings = await loadAppLockSettings();
        expect(settings).toEqual({ enabled: false, timing: 'immediate' });
    });

    test('persists and reloads the enabled flag and timing preset', async () => {
        await saveAppLockEnabled(true);
        await saveAppLockTiming('5m');

        const settings = await loadAppLockSettings();
        expect(settings).toEqual({ enabled: true, timing: '5m' });
    });

    test('clears the background timestamp after it is consumed', async () => {
        await saveBackgroundedAt(1_700_000_000_000);
        await clearBackgroundedAt();

        expect(await loadBackgroundedAt()).toBeNull();
    });
});
