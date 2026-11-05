/**
 * Presentation helpers for the Teams workspace.
 *
 * These pure helpers keep mode/kind labels and icon choices in one place so
 * screens never duplicate finance-model wording or glyph selection.
 */

import type { Ionicons } from '@expo/vector-icons';
import type { FinanceMode, TeamKind } from '@/types/team';

/** An Ionicons glyph name. */
type TeamGlyph = keyof typeof Ionicons.glyphMap;

/**
 * Return the long human label for a finance mode.
 *
 * @param {FinanceMode} mode The finance mode.
 * @returns {string} The display label.
 */
export const teamModeLabel = (mode: FinanceMode): string =>
    mode === 'POOLED' ? 'Pooled Funds' : 'Independent Spending';

/**
 * Return the short human label for a finance mode.
 *
 * @param {FinanceMode} mode The finance mode.
 * @returns {string} The short display label.
 */
export const teamModeShort = (mode: FinanceMode): string =>
    mode === 'POOLED' ? 'Pooled' : 'Independent';

/**
 * Return the Ionicons glyph for a team kind.
 *
 * @param {TeamKind} kind The team kind.
 * @returns {TeamGlyph} The Ionicons glyph name.
 */
export const teamKindIcon = (kind: TeamKind): TeamGlyph => {
    switch (kind) {
        case 'Travel':
            return 'airplane-outline';
        case 'Couple':
            return 'heart-outline';
        case 'Family':
            return 'home-outline';
        default:
            return 'people-outline';
    }
};
