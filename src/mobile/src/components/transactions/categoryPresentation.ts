/**
 * Visual presentation mapping for transaction categories.
 *
 * The backend stores an Ionicons glyph name on system categories, and stable
 * category ids on both transactions and categories. This module resolves a
 * consistent icon and tinted circle background for list rows and selectors
 * without embedding financial fixtures.
 */

import { Ionicons } from '@expo/vector-icons';

/** A valid Ionicons glyph name. */
export type TransactionIconName = keyof typeof Ionicons.glyphMap;

/** Stable fallback icons for known system category ids. */
const CATEGORY_ICONS: Record<string, TransactionIconName> = {
    'sys.salary': 'cash-outline',
    'sys.investment': 'trending-up',
    'sys.freelancing': 'briefcase-outline',
    'sys.gifts': 'gift-outline',
    'sys.bonus': 'star-outline',
    'sys.food': 'restaurant-outline',
    'sys.transport': 'car-outline',
    'sys.shopping': 'cart-outline',
    'sys.bills': 'receipt-outline',
    'sys.entertainment': 'game-controller-outline',
    'sys.health': 'heart-outline',
};

/** Approved tinted backgrounds for the same stable ids. */
const CATEGORY_COLORS: Record<string, { color: string; background: string }> = {
    'sys.salary': { color: '#0C9C69', background: '#E4F5EC' },
    'sys.investment': { color: '#2B7CE8', background: '#E8F1FE' },
    'sys.freelancing': { color: '#6478F6', background: '#ECEFFE' },
    'sys.gifts': { color: '#C44ED6', background: '#F6E8FA' },
    'sys.bonus': { color: '#E8992C', background: '#FCF1DF' },
    'sys.food': { color: '#F06B3A', background: '#FDEAE1' },
    'sys.transport': { color: '#3296FB', background: '#E6F2FF' },
    'sys.shopping': { color: '#7B5BE6', background: '#EFEBFD' },
    'sys.bills': { color: '#B34BE0', background: '#F5E8FA' },
    'sys.entertainment': { color: '#E2588A', background: '#FCEAF2' },
    'sys.health': { color: '#20A397', background: '#E3F6F4' },
};

/** Generic fallbacks when a category has no known stable id. */
const FALLBACK: Record<'income' | 'expense', {
    icon: TransactionIconName;
    color: string;
    background: string;
}> = {
    income: { icon: 'cash-outline', color: '#0C9C69', background: '#E4F5EC' },
    expense: { icon: 'receipt-outline', color: '#52627F', background: '#E9EEF5' },
};

/**
 * Resolve an Ionicons glyph for a category-like value.
 *
 * A stored icon is preferred, then the stable id mapping, then a direction
 * fallback.
 *
 * @param {object|undefined|null} category A category or category-shaped value.
 * @param {'income'|'expense'} kind The transaction direction fallback.
 * @returns {TransactionIconName} The resolved icon name.
 */
export const categoryIconName = (
    category?: {
        id?: string | null;
        name?: string | null;
        icon?: string | null;
    } | null,
    kind: 'income' | 'expense' = 'expense',
): TransactionIconName => {
    const stored = category?.icon;
    if (typeof stored === 'string' && stored in Ionicons.glyphMap) {
        return stored as TransactionIconName;
    }
    if (category?.id && CATEGORY_ICONS[category.id]) {
        return CATEGORY_ICONS[category.id];
    }
    return FALLBACK[kind].icon;
};

/**
 * Resolve an icon color for a category-like value.
 *
 * @param {object|undefined|null} category A category or category-shaped value.
 * @param {'income'|'expense'} kind The transaction direction fallback.
 * @returns {string} The icon color.
 */
export const categoryIconColor = (
    category?: {
        id?: string | null;
        name?: string | null;
    } | null,
    kind: 'income' | 'expense' = 'expense',
): string => {
    if (category?.id && CATEGORY_COLORS[category.id]) {
        return CATEGORY_COLORS[category.id].color;
    }
    return FALLBACK[kind].color;
};

/**
 * Resolve a tinted circle background for a category-like value.
 *
 * @param {object|undefined|null} category A category or category-shaped value.
 * @param {'income'|'expense'} kind The transaction direction fallback.
 * @returns {string} The circle background color.
 */
export const categoryIconBackground = (
    category?: {
        id?: string | null;
        name?: string | null;
    } | null,
    kind: 'income' | 'expense' = 'expense',
): string => {
    if (category?.id && CATEGORY_COLORS[category.id]) {
        return CATEGORY_COLORS[category.id].background;
    }
    return FALLBACK[kind].background;
};
