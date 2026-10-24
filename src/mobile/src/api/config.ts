import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { Platform } from 'react-native';
import {
    ApiEnvironment,
    DEFAULT_API_PORT,
    resolveApiBaseUrl,
} from './config.resolver';

/**
 * Read Expo public configuration supplied by `app.config.js`.
 *
 * `app.config.js` is the single bridge between `.env` values and the app
 * bundle; runtime code never reads `process.env` directly.
 */
const readExtra = (): {
    apiUrl?: string;
    apiPort: number;
    environment: ApiEnvironment;
} => {
    const extra = (Constants.expoConfig?.extra ?? {}) as {
        apiUrl?: string;
        apiPort?: string | number;
        environment?: string;
    };

    const apiPort = typeof extra.apiPort === 'number'
        ? extra.apiPort
        : Number.parseInt(String(extra.apiPort ?? ''), 10) || DEFAULT_API_PORT;

    const environment = extra.environment === 'staging' || extra.environment === 'production'
        ? extra.environment
        : 'development';

    return {
        apiUrl: typeof extra.apiUrl === 'string' && extra.apiUrl.trim() ? extra.apiUrl : undefined,
        apiPort,
        environment,
    };
};

/**
 * Return the Metro dev-server host when running in development.
 *
 * Physical devices connect to the same host that serves the JS bundle, which
 * is also where the backend listens in local development.
 *
 * @returns {string|undefined} The Metro host URI, when available.
 */
const getMetroHost = (): string | undefined => {
    const hostUri = Constants.expoConfig?.hostUri;
    return typeof hostUri === 'string' && hostUri.trim() ? hostUri : undefined;
};

/**
 * Resolve the authoritative API base URL for the current runtime.
 *
 * @returns {string} The absolute API base URL, including `/api/v1`.
 */
export const getBaseUrl = (): string => {
    const extra = readExtra();

    return resolveApiBaseUrl({
        explicitUrl: extra.apiUrl,
        apiPort: extra.apiPort,
        environment: extra.environment,
        platform: Platform.OS,
        isDevice: Boolean(isDevice),
        isDev: __DEV__,
        metroHost: getMetroHost(),
    });
};

export { DEFAULT_API_PORT } from './config.resolver';
