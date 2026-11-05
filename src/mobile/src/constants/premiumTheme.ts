/**
 * Premium feature-gate surface tokens.
 *
 * These match the approved emerald/ivory/navy gate concept and intentionally
 * stay fixed like `planningTheme.ts` rather than following the user-selected
 * app theme. The emerald value is shared with the Planning palette so the
 * gate reads as part of the same product.
 */

/** Approved premium gate palette. */
export const premiumColors = {
    /** Ivory app background behind the gate. */
    background: '#F7F8F6',
    /** White rounded card surfaces. */
    surface: '#FFFFFF',
    /** Primary emerald accent. */
    emerald: '#15966B',
    /** Darker emerald for the illustration lock. */
    emeraldDark: '#0F8060',
    /** Soft emerald fill for the sparkle pill. */
    emeraldLight: '#E4F4EA',
    /** Pale emerald fill for benefit ticks. */
    emeraldPale: '#E7F6EC',
    /** Deep navy typography. */
    text: '#192F40',
    /** Secondary slate supporting copy. */
    textSecondary: '#748595',
    /** Muted blue-gray for footnotes. */
    muted: '#8B9AA5',
    /** Subtle card and divider borders. */
    border: '#E6EAE7',
    /** Muted pill text color. */
    pill: '#718294',
    /** Disabled CTA opacity. */
    disabledOpacity: 0.45,
} as const;

/** Standard corner radius for premium cards and CTAs. */
export const premiumRadius = 20;
