/**
 * Spending-goal progress calculation for the dashboard.
 *
 * The goal is tracked in integer-scaled monetary units so threshold and
 * percentage decisions never depend on floating-point precision. The returned
 * values are presentation-only.
 */

import { toScaledInteger } from '@/utils/money';

/** Visual tone used by the goal progress bar. */
export type SpendingProgressTone = 'green' | 'amber' | 'red';

/** Progress values consumed by the goal progress bar. */
export interface SpendingProgress {
    /** Whole-number percentage of the goal spent (may exceed 100). */
    actualPercent: number;
    /** Fill percentage clamped to 0–100 for the bar width. */
    fillPercent: number;
    /** Color tone derived from how close spending is to the goal. */
    tone: SpendingProgressTone;
    /** True when spending exceeds the goal. */
    isOverGoal: boolean;
}

/** Amber begins at 65% of the goal and red begins at 90%. */
const AMBER_THRESHOLD = 65;
const RED_THRESHOLD = 90;

/**
 * Calculate goal-progress presentation values from exact decimal strings.
 *
 * A non-positive goal is treated as "no goal" and returns an empty green
 * progress state rather than dividing by zero.
 *
 * @param {string|number} spent The amount spent in the current month.
 * @param {string|number} goal The monthly spending goal.
 * @returns {SpendingProgress} Rounded percentage, fill width, tone, and state.
 */
export const spendingProgress = (
    spent: string | number,
    goal: string | number,
): SpendingProgress => {
    const spentScaled = toScaledInteger(spent);
    const goalScaled = toScaledInteger(goal);

    if (goalScaled <= 0n) {
        return {
            actualPercent: 0,
            fillPercent: 0,
            tone: 'green',
            isOverGoal: false,
        };
    }

    const numerator = spentScaled * 100n;
    const half = goalScaled / 2n;
    const actualPercent = Number(
        (numerator + (numerator >= 0n ? half : -half)) / goalScaled,
    );
    const fillPercent = Math.max(0, Math.min(100, actualPercent));
    const isOverGoal = spentScaled > goalScaled;
    const tone: SpendingProgressTone =
        isOverGoal || actualPercent >= RED_THRESHOLD
            ? 'red'
            : actualPercent >= AMBER_THRESHOLD
                ? 'amber'
                : 'green';

    return { actualPercent, fillPercent, tone, isOverGoal };
};
