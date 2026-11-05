/**
 * Biometric App Lock settings and timing helpers.
 *
 * Settings are non-sensitive and therefore use the existing AsyncStorage
 * preferences infrastructure. A persisted background timestamp lets the lock
 * threshold survive process suspension without relying on JavaScript timers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Supported lock timing presets. */
export type AppLockTiming = 'immediate' | '1m' | '5m';

/** Thresholds in milliseconds for each non-immediate preset. */
const TIMING_MS: Record<Exclude<AppLockTiming, 'immediate'>, number> = {
    '1m': 60_000,
    '5m': 300_000,
};

const ENABLED_KEY = 'appLock.enabled.v1';
const TIMING_KEY = 'appLock.timing.v1';
const BACKGROUNDED_AT_KEY = 'appLock.backgroundedAt.v1';

/** Persisted app lock settings. */
export interface AppLockSettings {
    enabled: boolean;
    timing: AppLockTiming;
}

/**
 * Determine whether a background duration crosses the chosen threshold.
 *
 * @param {AppLockTiming} timing The selected timing preset.
 * @param {number} elapsedMs The elapsed background duration.
 * @returns {boolean} True when the app should lock.
 */
export const shouldLockAfterBackground = (
    timing: AppLockTiming,
    elapsedMs: number,
): boolean => {
    if (timing === 'immediate') return true;
    return elapsedMs >= TIMING_MS[timing];
};

/**
 * Load the persisted app lock settings.
 *
 * @returns {Promise<AppLockSettings>} The settings with sane defaults.
 */
export const loadAppLockSettings = async (): Promise<AppLockSettings> => {
    const [enabledRaw, timingRaw] = await Promise.all([
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(TIMING_KEY),
    ]);
    return {
        enabled: enabledRaw === 'true',
        timing: timingRaw === '1m' || timingRaw === '5m' ? timingRaw : 'immediate',
    };
};

/**
 * Persist the enabled flag.
 *
 * @param {boolean} enabled Whether the app lock is enabled.
 * @returns {Promise<void>}
 */
export const saveAppLockEnabled = async (enabled: boolean): Promise<void> => {
    await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
};

/**
 * Persist the lock timing preset.
 *
 * @param {AppLockTiming} timing The selected timing preset.
 * @returns {Promise<void>}
 */
export const saveAppLockTiming = async (timing: AppLockTiming): Promise<void> => {
    await AsyncStorage.setItem(TIMING_KEY, timing);
};

/**
 * Persist the instant the app entered the background.
 *
 * @param {number} timestampMs The epoch millisecond timestamp.
 * @returns {Promise<void>}
 */
export const saveBackgroundedAt = async (timestampMs: number): Promise<void> => {
    await AsyncStorage.setItem(BACKGROUNDED_AT_KEY, String(timestampMs));
};

/**
 * Read the last persisted background timestamp.
 *
 * @returns {Promise<number|null>} The epoch millisecond timestamp, or null.
 */
export const loadBackgroundedAt = async (): Promise<number | null> => {
    const raw = await AsyncStorage.getItem(BACKGROUNDED_AT_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Clear the persisted background timestamp after it has been consumed.
 *
 * @returns {Promise<void>}
 */
export const clearBackgroundedAt = async (): Promise<void> => {
    await AsyncStorage.removeItem(BACKGROUNDED_AT_KEY);
};
