/**
 * Authenticated user-profile, security, session, and account data access.
 *
 * These functions reuse the shared Axios client so token refresh, error
 * normalization, and base-URL resolution are inherited rather than
 * duplicated. Response envelopes are mapped into the domain shapes used by
 * the Profile settings screens.
 */

import { apiClient } from '@/api/client';
import type { UserProfile } from '@/types/profile';

/** Fields accepted by `PUT /user/profile`. */
export interface UpdateProfileInput {
    firstname?: string;
    lastname?: string;
    username?: string;
    currency?: string;
    timezone?: string;
    language?: string;
    theme?: string;
}

/** Envelope returned by the profile read/update endpoints. */
interface ProfileEnvelope {
    success: boolean;
    message: string;
    data: { profile: UserProfile };
    errors: unknown;
}

/** One active refresh-token session returned by `GET /auth/sessions`. */
export interface UserSession {
    id: string;
    createdAt: string;
    expiresAt: string;
    createdByIp: string | null;
    userAgent: string | null;
    lastUsedAt: string | null;
}

/** Envelope returned by the session list endpoint. */
interface SessionsEnvelope {
    success: boolean;
    message: string;
    data: { sessions: UserSession[] };
    errors: unknown;
}

/** Deletion request status returned by `GET /user/deletion-request`. */
export interface DeletionRequestStatus {
    requestId: string;
    requestType: string;
    scope: string;
    status: string;
    acceptedAt: string | null;
    recoveryDeadline: string | null;
    completedAt: string | null;
    steps: { category: string; status: string; retentionReason?: string | null }[];
}

/**
 * Update the authenticated user's editable display and preference fields.
 *
 * @param {UpdateProfileInput} input The fields to persist.
 * @returns {Promise<UserProfile>} The updated public profile DTO.
 */
export const updateProfile = async (input: UpdateProfileInput): Promise<UserProfile> => {
    const response = await apiClient.put<ProfileEnvelope>('/user/profile', input);
    return response.data.data.profile;
};

/**
 * Change the authenticated user's password.
 *
 * @param {string} currentPassword The current password for reauthentication.
 * @param {string} newPassword The policy-compliant replacement password.
 * @returns {Promise<void>} Resolves when the password has been changed.
 */
export const changePassword = async (
    currentPassword: string,
    newPassword: string,
): Promise<void> => {
    await apiClient.post('/user/change-password', { currentPassword, newPassword });
};

/**
 * List the authenticated user's active device sessions.
 *
 * @returns {Promise<UserSession[]>} The active refresh-token sessions.
 */
export const fetchSessions = async (): Promise<UserSession[]> => {
    const response = await apiClient.get<SessionsEnvelope>('/auth/sessions');
    return Array.isArray(response.data?.data?.sessions) ? response.data.data.sessions : [];
};

/**
 * Revoke a single active session by refresh-token id.
 *
 * @param {string} sessionId The session id to revoke.
 * @returns {Promise<void>} Resolves when the session has been revoked.
 */
export const revokeSession = async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${sessionId}`);
};

/**
 * Revoke every active session except the caller's current presentation.
 *
 * The backend revokes all refresh-token sessions; the caller should expect to
 * re-authenticate on another device.
 *
 * @returns {Promise<void>} Resolves when all sessions have been revoked.
 */
export const revokeAllSessions = async (): Promise<void> => {
    await apiClient.delete('/auth/sessions');
};

/**
 * Request voluntary account closure with password reauthentication.
 *
 * The backend immediately deactivates the account, revokes sessions, and
 * schedules durable erasure after the documented recovery window.
 *
 * @param {string} password The current password for reauthentication.
 * @param {string} confirmation The literal confirmation text.
 * @returns {Promise<{requestId: string; recoveryDeadline: string}>} Request details.
 */
export const requestAccountDeletion = async (
    password: string,
    confirmation: string,
): Promise<{ requestId: string; recoveryDeadline: string }> => {
    const response = await apiClient.post<{
        data: { requestId: string; recoveryDeadline: string };
    }>('/user/deletion-request', { password, confirmation });
    return response.data.data;
};

/**
 * Fetch the authenticated user's latest account-deletion request status.
 *
 * @returns {Promise<DeletionRequestStatus|null>} The latest request, or null.
 */
export const fetchDeletionStatus = async (): Promise<DeletionRequestStatus | null> => {
    const response = await apiClient.get<{
        data: { request: DeletionRequestStatus | null };
    }>('/user/deletion-request');
    return response.data?.data?.request ?? null;
};
