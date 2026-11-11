import axios, { create as createAxios } from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getBaseUrl } from './config';
import { createSingleFlight } from './singleFlight';
import { getApiLanguage } from './api-language';

interface RetryableAxiosRequestConfig {
    _retry?: boolean;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
}

const API_BASE_URL = getBaseUrl();
const REQUEST_TIMEOUT_MS = 15000;

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const apiClient = createAxios({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const headers = config.headers as Record<string, string> | undefined;
    if (headers) {
        headers['Accept-Language'] = getApiLanguage();
    }
    return config;
});

/**
 * Set the in-memory bearer token used for subsequent requests.
 *
 * @param {string|null} token The access token, or null to clear it.
 */
export const setAccessToken = (token: string | null): void => {
    if (token) {
        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
        return;
    }
    delete apiClient.defaults.headers.common.Authorization;
};

/**
 * Return the in-memory bearer token currently attached to the API client.
 *
 * This is a read-only accessor for callers that need to pass the same
 * credential out-of-band (for example, an authenticated image source), and it
 * never performs storage I/O.
 *
 * @returns {string|null} The raw access token, or null when unauthenticated.
 */
export const getAccessToken = (): string | null => {
    const header = apiClient.defaults.headers.common.Authorization;
    if (typeof header !== 'string') return null;
    const prefix = 'Bearer ';
    return header.startsWith(prefix) ? header.slice(prefix.length) : header;
};

/**
 * Clear stored tokens and the in-memory bearer header.
 *
 * @returns {Promise<void>}
 */
export const clearStoredTokens = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
};

/**
 * Persist a token pair and attach the new access token to future requests.
 *
 * @param {string} accessToken The new access token.
 * @param {string} refreshToken The new refresh token.
 * @returns {Promise<void>}
 */
export const storeTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    setAccessToken(accessToken);
};

/**
 * Read the persisted access and refresh tokens.
 *
 * @returns {Promise<{accessToken: string|null, refreshToken: string|null}>}
 *   The stored token pair.
 */
export const readStoredTokens = async (): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
}> => {
    const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    return { accessToken, refreshToken };
};

const refreshOnce = createSingleFlight<string | null>();

/**
 * Exchange a raw refresh token for a new access/refresh pair.
 *
 * This bypasses the axios response interceptor so a 401 during biometric
 * sign-in does not recursively attempt a refresh with a different token.
 *
 * @param {string} refreshToken The raw refresh token to rotate.
 * @returns {Promise<{accessToken: string, refreshToken: string}>} The new pair.
 */
export const refreshSession = async (
    refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await axios.post(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken },
        { timeout: REQUEST_TIMEOUT_MS },
    );
    return response.data.data as { accessToken: string; refreshToken: string };
};

/**
 * Revoke a refresh-token session directly, bypassing the response interceptor.
 *
 * Explicit logout must never be retried through the normal refresh path or
 * redirected by the interceptor, so this uses the bare Axios instance.
 *
 * @param {string} refreshToken The raw refresh token to revoke.
 * @returns {Promise<void>} Resolves when the session has been revoked.
 */
export const revokeSession = async (refreshToken: string): Promise<void> => {
    await axios.post(
        `${API_BASE_URL}/auth/logout`,
        { refreshToken },
        { timeout: REQUEST_TIMEOUT_MS },
    );
};

/**
 * Exchange the stored refresh token for a new token pair.
 *
 * @returns {Promise<string|null>} The new access token, or null when no
 *   refresh token is available.
 */
const performRefresh = async (): Promise<string | null> => {
    const { refreshToken } = await readStoredTokens();
    if (!refreshToken) return null;

    const { accessToken, refreshToken: newRefresh } = await refreshSession(refreshToken);
    await storeTokens(accessToken, newRefresh);
    return accessToken;
};

/**
 * Emit a development-only diagnostic line that never contains tokens or body.
 *
 * @param {string} method The HTTP method.
 * @param {string|undefined} url The request URL.
 * @param {number|undefined} status The response status, when available.
 */
const logNetworkEvent = (method: string, url: string | undefined, status?: number): void => {
    if (!__DEV__) return;
    if (status !== undefined) {
        console.info(`[api] ${method} ${url} -> ${status}`);
        return;
    }
    console.info(`[api] ${method} ${url} failed`);
};

apiClient.interceptors.response.use(

    (response) => response,
    async (error) => {
        const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;
        const requestUrl = originalRequest?.url;
        const requestMethod = originalRequest?.method;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const accessToken = await refreshOnce(performRefresh);
                if (!accessToken) {
                    await clearStoredTokens();
                    router.replace("/(auth)/login");
                } else {
                    originalRequest.headers = originalRequest.headers ?? {};
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return axios(originalRequest as import('axios').AxiosRequestConfig);
                }
            } catch {
                // Refresh failed - force logout
                await clearStoredTokens();
                setAccessToken(null);
                router.replace("/(auth)/login");
            }
        }

        logNetworkEvent(requestMethod?.toUpperCase() ?? 'GET', requestUrl, error.response?.status);
        return Promise.reject(error);
    }
);
