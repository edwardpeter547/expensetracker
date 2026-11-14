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

/**
 * Request a password-reset code for an account email address.
 *
 * The backend returns the same generic success response for known and unknown
 * emails, so callers must not infer account existence from the result.
 *
 * @param {string} email The account email address.
 * @returns {Promise<void>} Resolves once the request has been accepted.
 */
export const forgotPassword = async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
};

/**
 * Verify a six-digit password-reset code without consuming it.
 *
 * Consumption happens on the subsequent password reset, keeping the verify
 * step non-destructive so the reset code remains valid for the reset call.
 *
 * @param {string} email The account email address.
 * @param {string} code The six-digit reset code.
 * @returns {Promise<void>} Resolves when the code is valid and unexpired.
 */
export const verifyOtp = async (email: string, code: string): Promise<void> => {
    await apiClient.post('/auth/verify-otp', { email, code });
};

/**
 * Reset an account password using a verified reset code.
 *
 * @param {string} email The account email address.
 * @param {string} code The verified six-digit reset code.
 * @param {string} password The new password.
 * @returns {Promise<void>} Resolves when the password has been changed.
 */
export const resetPassword = async (
    email: string,
    code: string,
    password: string,
): Promise<void> => {
    await apiClient.post('/auth/reset-password', { email, code, password });
};
