/**
 * Shared API error normalization for the mobile client.
 *
 * This module converts Axios/network errors into a stable shape so screens can
 * distinguish timeouts, authorization failures, server errors, and transport
 * failures without inspecting Axios internals.
 */

import { StatusCodes } from 'http-status-codes';

/**
 * Stable error categories used by callers.
 */
export type ApiErrorKind =
    | 'network'
    | 'timeout'
    | 'unauthorized'
    | 'forbidden'
    | 'validation'
    | 'server'
    | 'unknown';

/**
 * A normalized API error.
 */
export interface NormalizedApiError {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    cause?: unknown;
}

/**
 * Best-effort extraction of a server-provided message from an error payload.
 *
 * @param {unknown} data The error response body.
 * @returns {string|undefined} A human-readable message, when present.
 */
const readServerMessage = (data: unknown): string | undefined => {
    if (data && typeof data === 'object' && 'message' in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    return undefined;
};

/**
 * Normalize an unknown thrown value into an `NormalizedApiError`.
 *
 * @param {unknown} error The thrown value, typically an Axios error.
 * @returns {NormalizedApiError} A stable, user-presentable error.
 */
export const normalizeApiError = (error: unknown): NormalizedApiError => {
    const candidate = error as {
        code?: string;
        message?: string;
        isAxiosError?: boolean;
        response?: { status?: number; data?: unknown };
    };

    if (candidate?.isAxiosError && candidate.code === 'ECONNABORTED') {
        return {
            kind: 'timeout',
            message: 'The server took too long to respond. Please try again.',
            cause: error,
        };
    }

    if (candidate?.isAxiosError && !candidate.response) {
        return {
            kind: 'network',
            message: 'Could not reach the server. Check your connection and try again.',
            cause: error,
        };
    }

    const status = candidate?.response?.status;
    const response = candidate?.response;
    if (status === 401) {
        return {
            kind: 'unauthorized',
            message: readServerMessage(response?.data) || 'Your session has expired. Please sign in again.',
            status,
            cause: error,
        };
    }

    if (status === 403) {
        return {
            kind: 'forbidden',
            message: readServerMessage(response?.data) || 'You do not have permission to do that.',
            status,
            cause: error,
        };
    }

    if (status === StatusCodes.BAD_REQUEST || status === StatusCodes.UNPROCESSABLE_ENTITY) {
        return {
            kind: 'validation',
            message: readServerMessage(response?.data) || 'Please check your input and try again.',
            status,
            cause: error,
        };
    }

    if (status && status >= StatusCodes.INTERNAL_SERVER_ERROR) {
        return {
            kind: 'server',
            message: 'The server encountered an error. Please try again later.',
            status,
            cause: error,
        };
    }

    if (status) {
        return {
            kind: 'unknown',
            message: readServerMessage(response?.data) || 'Something went wrong. Please try again.',
            status,
            cause: error,
        };
    }

    return {
        kind: 'unknown',
        message: candidate?.message || 'Something went wrong. Please try again.',
        cause: error,
    };
};
