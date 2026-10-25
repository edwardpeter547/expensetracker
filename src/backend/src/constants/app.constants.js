import bcrypt from 'bcryptjs';
/**
 * Shared application constants.
 *
 * Includes calendar boundary values and the refresh-token security constants
 * used by token hashing, rotation, and replay detection.
 */

export const LAST_DAY_OF_MONTH = 31;
export const FIRST_DAY_OF_MONTH = 1;
export const FIRST_MONTH_OF_YEAR = 0;
export const LAST_MONTH_OF_YEAR = 11;

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_PATTERN = /^[0-9a-f]{80}$/i;
export const REUSE_DETECTED = 'REUSE_DETECTED';

/**
 * A fixed bcrypt hash used only to equalize login timing for unknown emails.
 * It is not a credential and is compared against the submitted password and
 * discarded, so unknown-email and known-email login attempts take similar time.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-hash-for-timing', 12);
