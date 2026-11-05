/**
 * Pure plans-URL resolution for the premium feature gate.
 *
 * This module has no React Native or Expo imports so it can be unit-tested in
 * a plain Node environment, mirroring the `config.resolver.ts` pattern.
 */

/**
 * Normalize and validate a configured plan-comparison URL.
 *
 * The gate must never open a guessed or insecure destination, so this fails
 * closed: anything that is not a well-formed HTTPS URL resolves to
 * `undefined`, which the UI treats as "not configured".
 *
 * @param {string|undefined|null} value The raw configured URL.
 * @returns {string|undefined} The normalized HTTPS URL, or `undefined` when
 *   it is missing or invalid.
 */
export const normalizeAuditWalletPlansUrl = (
    value: string | undefined | null,
): string | undefined => {
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return undefined;
    }

    if (parsed.protocol !== 'https:') return undefined;

    // Preserve path/query/hash but drop an incidental trailing slash.
    return parsed.toString().replace(/\/+$/, '');
};
