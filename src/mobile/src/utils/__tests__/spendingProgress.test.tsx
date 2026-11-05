/**
 * Unit tests for the monthly spending-goal progress calculation.
 *
 * The scenarios verify percentage rounding, tone thresholds, the over-goal
 * state, and the non-positive-goal fallback.
 */

import { spendingProgress } from '@/utils/spendingProgress';

describe('spendingProgress', () => {
    it('reports green below the amber threshold', () => {
        expect(spendingProgress('400', '1000')).toEqual({
            actualPercent: 40,
            fillPercent: 40,
            tone: 'green',
            isOverGoal: false,
        });
    });

    it('reports amber between the amber and red thresholds', () => {
        expect(spendingProgress('700', '1000').tone).toBe('amber');
    });

    it('reports red near the goal', () => {
        expect(spendingProgress('920', '1000').tone).toBe('red');
    });

    it('reports red and over-goal above the goal with a clamped fill', () => {
        const progress = spendingProgress('1200', '1000');
        expect(progress.tone).toBe('red');
        expect(progress.isOverGoal).toBe(true);
        expect(progress.actualPercent).toBe(120);
        expect(progress.fillPercent).toBe(100);
    });

    it('returns an empty green state for a non-positive goal', () => {
        expect(spendingProgress('400', '0')).toEqual({
            actualPercent: 0,
            fillPercent: 0,
            tone: 'green',
            isOverGoal: false,
        });
    });
});
