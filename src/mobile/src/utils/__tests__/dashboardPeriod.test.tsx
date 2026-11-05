/**
 * Unit tests for dashboard calendar period boundaries.
 *
 * The reference dates are constructed with the same local calendar helpers as
 * the implementation, so the assertions hold regardless of the machine's
 * timezone.
 */

import {
    buildPeriodBounds,
    buildBoundsForSelection,
    buildPreviousPeriodBounds,
    formatRangeLabel,
    isWithinBounds,
    selectionLabel,
    startOfDay,
} from '@/utils/dashboardPeriod';

describe('buildPeriodBounds', () => {
    const now = new Date(2026, 9, 15, 12);

    it('bounds This Month from the first to the first of next month', () => {
        expect(buildPeriodBounds('This Month', now)).toEqual({
            start: new Date(2026, 9, 1),
            end: new Date(2026, 10, 1),
            label: 'This Month',
        });
    });

    it('bounds Last Month to the previous calendar month', () => {
        expect(buildPeriodBounds('Last Month', now)).toEqual({
            start: new Date(2026, 8, 1),
            end: new Date(2026, 9, 1),
            label: 'Last Month',
        });
    });

    it('bounds Last 3 Months to the current and two prior months', () => {
        expect(buildPeriodBounds('Last 3 Months', now)).toEqual({
            start: new Date(2026, 7, 1),
            end: new Date(2026, 10, 1),
            label: 'Last 3 Months',
        });
    });

    it('bounds This Year to the calendar year', () => {
        expect(buildPeriodBounds('This Year', now)).toEqual({
            start: new Date(2026, 0, 1),
            end: new Date(2027, 0, 1),
            label: 'This Year',
        });
    });
});

describe('buildPreviousPeriodBounds', () => {
    const now = new Date(2026, 9, 15, 12);

    it('returns the immediately preceding month for This Month', () => {
        expect(buildPreviousPeriodBounds('This Month', now)).toEqual({
            start: new Date(2026, 8, 1),
            end: new Date(2026, 9, 1),
            label: 'Previous period',
        });
    });

    it('returns the preceding three months for Last 3 Months', () => {
        expect(buildPreviousPeriodBounds('Last 3 Months', now)).toEqual({
            start: new Date(2026, 4, 1),
            end: new Date(2026, 7, 1),
            label: 'Previous period',
        });
    });

    it('returns the previous calendar year for This Year', () => {
        expect(buildPreviousPeriodBounds('This Year', now)).toEqual({
            start: new Date(2025, 0, 1),
            end: new Date(2026, 0, 1),
            label: 'Previous period',
        });
    });
});

describe('isWithinBounds', () => {
    const bounds = {
        start: new Date(2026, 9, 1),
        end: new Date(2026, 10, 1),
        label: 'This Month',
    };

    it('accepts dates inside the half-open period', () => {
        expect(isWithinBounds(new Date(2026, 9, 15), bounds)).toBe(true);
        expect(isWithinBounds(new Date(2026, 9, 1), bounds)).toBe(true);
    });

    it('rejects dates at or after the exclusive end', () => {
        expect(isWithinBounds(new Date(2026, 10, 1), bounds)).toBe(false);
        expect(isWithinBounds(new Date(2026, 8, 30), bounds)).toBe(false);
    });
});

describe('startOfDay', () => {
    it('returns local midnight for the same calendar day', () => {
        expect(startOfDay(new Date(2026, 9, 15, 23, 45))).toEqual(new Date(2026, 9, 15));
    });
});

describe('formatRangeLabel and selectionLabel', () => {
    it('formats a single-day range as one date', () => {
        const label = formatRangeLabel(new Date(2026, 9, 10), new Date(2026, 9, 10), 'en-US');
        expect(label).toContain('10');
        expect(label).toContain('2026');
    });

    it('formats a multi-day range with a separator', () => {
        const label = formatRangeLabel(new Date(2026, 9, 10), new Date(2026, 9, 12), 'en-US');
        expect(label).toContain('–');
    });

    it('returns the preset name for preset selections', () => {
        expect(selectionLabel({ kind: 'preset', period: 'This Year' })).toBe('This Year');
    });
});

describe('buildBoundsForSelection', () => {
    const now = new Date(2026, 9, 15, 12);

    it('resolves preset bounds exactly like buildPeriodBounds', () => {
        const { current, previous } = buildBoundsForSelection(
            { kind: 'preset', period: 'Last Month' },
            now,
        );

        expect(current).toEqual(buildPeriodBounds('Last Month', now));
        expect(previous).toEqual(buildPreviousPeriodBounds('Last Month', now));
    });

    it('resolves an inclusive range and an equal-length previous range', () => {
        const { current, previous } = buildBoundsForSelection(
            { kind: 'range', start: new Date(2026, 9, 10), end: new Date(2026, 9, 12) },
            now,
        );

        expect(current.start).toEqual(new Date(2026, 9, 10));
        expect(current.end).toEqual(new Date(2026, 9, 13));
        expect(previous.end).toEqual(new Date(2026, 9, 10));
        expect(previous.start).toEqual(new Date(2026, 9, 7));
    });
});
