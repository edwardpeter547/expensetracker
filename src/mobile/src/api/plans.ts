/**
 * Expo-specific plans-URL adapter.
 *
 * `app.config.js` is the single bridge between `.env` values and the app
 * bundle; runtime code never reads `process.env` directly. This module reads
 * that bridged value and delegates validation to the pure resolver.
 */

import Constants from 'expo-constants';
import { normalizeAuditWalletPlansUrl } from './plans.resolver';

/**
 * Return the configured AuditWallet plan-comparison URL.
 *
 * The value comes from `EXPO_PUBLIC_AUDITWALLET_PLANS_URL` via
 * `Constants.expoConfig.extra.auditWalletPlansUrl`. It is intentionally left
 * unconfigured until the real website URL is known, in which case this returns
 * `undefined` and the gate visibly disables the external CTA.
 *
 * @returns {string|undefined} The normalized HTTPS URL, or `undefined`.
 */
export const getAuditWalletPlansUrl = (): string | undefined => {
    const extra = (Constants.expoConfig?.extra ?? {}) as {
        auditWalletPlansUrl?: string;
    };

    return normalizeAuditWalletPlansUrl(extra.auditWalletPlansUrl);
};
