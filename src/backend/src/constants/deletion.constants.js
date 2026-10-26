/**
 * Account-deletion constants that are safe to import from lightweight modules
 * such as validation schemas without pulling in the database or service stack.
 */

/** Voluntary closure recovery window in calendar days. */
export const VOLUNTARY_RECOVERY_DAYS = 14;

/** Literal confirmation text required to request voluntary closure. */
export const DELETE_CONFIRMATION_TEXT = 'DELETE';

/** Default policy version persisted on new deletion requests. */
export const DEFAULT_POLICY_VERSION = 1;

/** Default worker lease duration in milliseconds. */
export const DEFAULT_LEASE_TTL_MS = 60_000;

/** Default worker polling interval in milliseconds. */
export const DEFAULT_WORKER_INTERVAL_MS = 60_000;
