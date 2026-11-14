/**
 * Unauthenticated auth endpoints for registration verification.
 *
 * These functions reuse the shared Axios client so base-URL resolution,
 * error normalization, and the `Accept-Language` header are inherited.
 */

import { apiClient } from '@/api/client';

/**
 * Verify an email address with the six-digit code emailed after registration.
 *
 * @param {string} email The account email address.
 * @param {string} code The six-digit verification code.
 * @returns {Promise<void>} Resolves when the account has been activated.
 */
export const verifyEmail = async (email: string, code: string): Promise<void> => {
    await apiClient.post('/auth/verify-email', { email, code });
};

/**
 * Request a fresh six-digit verification code for an unverified account.
 *
 * @param {string} email The account email address.
 * @returns {Promise<void>} Resolves whether or not the server delivered a new
 *   code, matching the backend's anti-enumeration contract.
 */
export const resendVerificationEmail = async (email: string): Promise<void> => {
    await apiClient.post('/auth/resend-verification', { email });
};
