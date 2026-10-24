/**
 * Pure API base-URL resolution for the ExpenseTracker mobile client.
 *
 * This module has no React Native or Expo imports so it can be unit-tested in
 * a plain Node environment. The thin Expo-specific adapter lives in
 * `config.ts`.
 */

export const DEFAULT_API_PORT = 7001;
export const API_PREFIX = '/api/v1';

/**
 * Supported application environments.
 */
export type ApiEnvironment = 'development' | 'staging' | 'production';

/**
 * Inputs needed to resolve the API base URL.
 */
export interface ApiResolutionInput {
    explicitUrl?: string;
    apiPort: number;
    environment: ApiEnvironment;
    platform: string;
    isDevice: boolean;
    isDev: boolean;
    metroHost?: string;
}

/**
 * Remove a trailing slash from a URL string.
 *
 * @param {string} value The URL to normalize.
 * @returns {string} The URL without a trailing slash.
 */
const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/**
 * Parse a Metro host string such as `192.168.1.20:8081` into its host part.
 *
 * @param {string|undefined} hostUri The Metro host URI from Expo constants.
 * @returns {string|undefined} The host without its port.
 */
export const parseMetroHost = (hostUri: string | undefined): string | undefined => {
    if (!hostUri) return undefined;

    const trimmed = hostUri.trim();
    if (!trimmed) return undefined;

    try {
        // `hostUri` has no scheme, so prepend one before handing it to URL.
        const parsed = new URL(`http://${trimmed}`);
        return parsed.hostname || undefined;
    } catch {
        return undefined;
    }
};

/**
 * Validate and normalize an explicitly configured API base URL.
 *
 * @param {string} value The raw configured URL.
 * @returns {string} The normalized URL.
 * @throws {Error} When the value is not an http/https URL.
 */
const normalizeExplicitUrl = (value: string): string => {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(
            `Invalid EXPO_PUBLIC_API_URL: "${value}". Expected an absolute http(s) URL.`,
        );
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(
            `Invalid EXPO_PUBLIC_API_URL protocol: "${parsed.protocol}". Use http or https.`,
        );
    }

    const normalized = stripTrailingSlash(parsed.toString());
    if (!new URL(normalized).pathname.endsWith(API_PREFIX)) {
        throw new Error(
            `EXPO_PUBLIC_API_URL must include the "${API_PREFIX}" prefix.`,
        );
    }
    return normalized;
};

/**
 * Resolve the authoritative API base URL using an explicit override first,
 * then platform-aware development defaults.
 *
 * @param {ApiResolutionInput} input Resolution inputs from Expo/runtime.
 * @returns {string} The absolute API base URL, including `/api/v1`.
 * @throws {Error} When no safe URL can be resolved.
 */
export const resolveApiBaseUrl = (input: ApiResolutionInput): string => {
    const port = Number.isInteger(input.apiPort) && input.apiPort > 0
        ? input.apiPort
        : DEFAULT_API_PORT;

    const explicitUrl = input.explicitUrl?.trim();
    if (explicitUrl) {
        const url = normalizeExplicitUrl(explicitUrl);
        const protocol = new URL(url).protocol;

        // Any release build must use HTTPS; only development may use HTTP.
        if (!input.isDev && protocol !== 'https:') {
            throw new Error(
                `${input.environment} builds require an https EXPO_PUBLIC_API_URL.`,
            );
        }

        return url;
    }

    if (!input.isDev) {
        throw new Error(
            'EXPO_PUBLIC_API_URL is required for non-development builds.',
        );
    }

    // iOS Simulator reaches the macOS host over the host loopback.
    if (input.platform === 'ios' && !input.isDevice) {
        return `http://localhost:${port}${API_PREFIX}`;
    }

    // Android Emulator reaches the macOS host through the documented alias.
    if (input.platform === 'android' && !input.isDevice) {
        return `http://10.0.2.2:${port}${API_PREFIX}`;
    }

    // Web development runs on the same machine.
    if (input.platform === 'web') {
        return `http://localhost:${port}${API_PREFIX}`;
    }

    // Physical devices use the LAN address that Metro itself is served from.
    const host = parseMetroHost(input.metroHost);
    if (!host) {
        throw new Error(
            'Cannot resolve the development host for this device. Start Metro in LAN mode or set EXPO_PUBLIC_API_URL.',
        );
    }

    return `http://${host}:${port}${API_PREFIX}`;
};
