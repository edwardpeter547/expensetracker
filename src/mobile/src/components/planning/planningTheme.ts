/**
 * Planning feature design tokens and icon mapping.
 *
 * The Planning screens are an approved, frozen light design that intentionally
 * does not follow the user-selected app theme. These tokens replicate the
 * handoff palette and semantic icon map so the screens stay visually stable
 * regardless of the global theme, while money formatting still respects the
 * user's active locale and currency.
 */

import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@/localization/format';

/** Approved light palette for the Planning screens. */
export const planningColors = {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#17263C',
    muted: '#8492A4',
    border: '#E8EDF3',
    emerald: '#15966B',
    emeraldLight: '#E7F7EF',
    blue: '#5689ED',
    blueLight: '#EAF1FF',
    purple: '#9D67E6',
    purpleLight: '#F3EBFE',
    orange: '#F3A046',
    orangeLight: '#FFF0DF',
    pink: '#E55B99',
    pinkLight: '#FFEAF3',
    teal: '#168F8B',
    tealLight: '#E5F6F4',
    track: '#EDF1F5',
} as const;

/** Standard corner radius used by Planning cards. */
export const planningRadius = 20;

/**
 * Semantic Planning icon names mapped to their Ionicons glyphs.
 *
 * The `satisfies` clause validates every glyph against the installed Ionicons
 * glyph map while preserving the literal keys for strongly-typed callers.
 */
export const PLANNING_ICONS = {
    wallet: 'wallet-outline',
    target: 'radio-button-on-outline',
    'chart-no-axes-combined': 'stats-chart-outline',
    'calendar-days': 'calendar-outline',
    'calendar-range': 'calendar-outline',
    'trending-up': 'trending-up-outline',
    'shopping-bag': 'bag-handle-outline',
    utensils: 'restaurant-outline',
    'car-front': 'car-outline',
    clapperboard: 'film-outline',
    'shield-check': 'shield-checkmark-outline',
    plane: 'airplane-outline',
    laptop: 'laptop-outline',
    'piggy-bank': 'cash-outline',
    house: 'home-outline',
    'shopping-basket': 'basket-outline',
    coffee: 'cafe-outline',
    'arrow-left': 'arrow-back',
    'chevron-back': 'chevron-back',
    'chevron-right': 'chevron-forward',
    plus: 'add',
    'arrow-up-right': 'arrow-up-outline',
    'trending-down': 'trending-down-outline',
    'calendar-clock': 'time-outline',
    armchair: 'bed-outline',
    wifi: 'wifi-outline',
    repeat: 'repeat-outline',
    'briefcase-business': 'briefcase-outline',
    'arrow-down-left': 'arrow-down-outline',
    users: 'people-outline',
    sparkles: 'sparkles-outline',
    'circle-check': 'checkmark-circle-outline',
    receipt: 'receipt-outline',
} as const satisfies Record<string, keyof typeof Ionicons.glyphMap>;

/** A semantic Planning icon key. */
export type PlanningIconName = keyof typeof PLANNING_ICONS;

/** A raw Ionicons glyph name (used by real category data). */
export type PlanningGlyphName = keyof typeof Ionicons.glyphMap;

/** Either a semantic Planning icon or a raw Ionicons glyph. */
export type PlanningIconSource = PlanningIconName | PlanningGlyphName;

/**
 * Format a Planning amount with the user's active locale and currency.
 *
 * @param {number} amount The amount to format.
 * @param {string} language The display locale.
 * @param {string} currency The ISO 4217 currency code.
 * @param {number} [decimals=0] The displayed fraction digits.
 * @returns {string} The formatted currency string.
 */
export const formatPlanningMoney = (
    amount: number,
    language: string,
    currency: string,
    decimals = 0,
): string => formatMoney(amount, language, currency, decimals);
