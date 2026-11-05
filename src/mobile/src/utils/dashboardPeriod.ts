/**
 * Calendar period boundaries for the dashboard date selector.
 *
 * Boundaries are derived from the runtime's local calendar (the same
 * month/day semantics used by the existing backend dashboard summary, which
 * builds `new Date(year, month, 1)`). This keeps the four supported periods
 * deterministic and testable while avoiding any dependency on a timezone
 * database. The previous-period helpers always return the immediately
 * preceding range of equal length, which is what the spending percentage
 * comparison uses.
 */

import type { DashboardPeriod, DashboardPeriodSelection } from '@/types/dashboard';

/** Inclusive start and exclusive end for a reporting period. */
export interface PeriodBounds {
    /** Inclusive lower bound. */
    start: Date;
    /** Exclusive upper bound. */
    end: Date;
    /** Human-readable label for the selected period. */
    label: string;
}

/**
 * Build the inclusive/exclusive bounds for a dashboard reporting period.
 *
 * @param {DashboardPeriod} period The selected period.
 * @param {Date} [now=new Date()] The reference instant.
 * @returns {PeriodBounds} The computed calendar bounds.
 */
export const buildPeriodBounds = (
    period: DashboardPeriod,
    now: Date = new Date(),
): PeriodBounds => {
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
        case 'This Month':
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 1),
                label: period,
            };
        case 'Last Month':
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month, 1),
                label: period,
            };
        case 'Last 3 Months':
            return {
                start: new Date(year, month - 2, 1),
                end: new Date(year, month + 1, 1),
                label: period,
            };
        case 'This Year':
            return {
                start: new Date(year, 0, 1),
                end: new Date(year + 1, 0, 1),
                label: period,
            };
    }
};

/**
 * Build the immediately preceding period of the same length as the selection.
 *
 * This is the denominator for the Total Spending percentage change. The label
 * is intentionally generic so the UI can describe the comparison clearly.
 *
 * @param {DashboardPeriod} period The selected period.
 * @param {Date} [now=new Date()] The reference instant.
 * @returns {PeriodBounds} The previous period bounds.
 */
export const buildPreviousPeriodBounds = (
    period: DashboardPeriod,
    now: Date = new Date(),
): PeriodBounds => {
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
        case 'This Month':
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month, 1),
                label: 'Previous period',
            };
        case 'Last Month':
            return {
                start: new Date(year, month - 2, 1),
                end: new Date(year, month - 1, 1),
                label: 'Previous period',
            };
        case 'Last 3 Months':
            return {
                start: new Date(year, month - 5, 1),
                end: new Date(year, month - 2, 1),
                label: 'Previous period',
            };
        case 'This Year':
            return {
                start: new Date(year - 1, 0, 1),
                end: new Date(year, 0, 1),
                label: 'Previous period',
            };
    }
};

/**
 * Determine whether a transaction timestamp falls within period bounds.
 *
 * ISO strings are parsed to instants before the half-open `[start, end)`
 * comparison, so a transaction at the exact end boundary belongs to the next
 * period.
 *
 * @param {string|Date} timestamp The transaction date.
 * @param {PeriodBounds} bounds The period bounds.
 * @returns {boolean} True when the timestamp is inside the bounds.
 */
export const isWithinBounds = (timestamp: string | Date, bounds: PeriodBounds): boolean => {
    const value = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return value >= bounds.start && value < bounds.end;
};

/**
 * Return a date at local midnight for the supplied instant.
 *
 * @param {Date} date The source date.
 * @returns {Date} The same calendar day at local midnight.
 */
export const startOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Return the local midnight of the day after the supplied date.
 *
 * @param {Date} date The source date.
 * @returns {Date} The next calendar day at local midnight.
 */
export const nextDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

/**
 * Format an inclusive custom date range for the period selector.
 *
 * A single-day range renders as one date; a multi-day range renders with an
 * en-dash separator. The year is always included so multi-year ranges stay
 * unambiguous.
 *
 * @param {Date} start The inclusive start date.
 * @param {Date} end The inclusive end date.
 * @param {string} [locale='en-US'] The display locale.
 * @returns {string} The formatted range label.
 */
export const formatRangeLabel = (
    start: Date,
    end: Date,
    locale = 'en-US',
): string => {
    const startDay = startOfDay(start);
    const endDay = startOfDay(end);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    };

    if (startDay.getTime() === endDay.getTime()) {
        return startDay.toLocaleDateString(locale, options);
    }

    const formattedStart = startDay.toLocaleDateString(locale, options);
    const formattedEnd = endDay.toLocaleDateString(locale, options);
    return `${formattedStart} – ${formattedEnd}`;
};

/**
 * Resolve current and previous period bounds for a dashboard selection.
 *
 * Presets use the calendar helpers above; custom ranges use inclusive dates
 * and an equal-length preceding range for the percentage comparison.
 *
 * @param {DashboardPeriodSelection} selection The selected preset or range.
 * @param {Date} [now=new Date()] The reference instant.
 * @param {string} [locale='en-US'] The display locale for range labels.
 * @returns {{current: PeriodBounds, previous: PeriodBounds}} The bounds pair.
 */
export const buildBoundsForSelection = (
    selection: DashboardPeriodSelection,
    now: Date = new Date(),
    locale = 'en-US',
): { current: PeriodBounds; previous: PeriodBounds } => {
    if (selection.kind === 'preset') {
        return {
            current: buildPeriodBounds(selection.period, now),
            previous: buildPreviousPeriodBounds(selection.period, now),
        };
    }

    const start = startOfDay(selection.start);
    const end = nextDay(startOfDay(selection.end));
    const durationMs = end.getTime() - start.getTime();

    return {
        current: {
            start,
            end,
            label: formatRangeLabel(selection.start, selection.end, locale),
        },
        previous: {
            start: new Date(start.getTime() - durationMs),
            end: start,
            label: 'Previous period',
        },
    };
};

/**
 * Return the human-readable label for a dashboard period selection.
 *
 * @param {DashboardPeriodSelection} selection The selected preset or range.
 * @param {string} [locale='en-US'] The display locale.
 * @returns {string} The selection label.
 */
export const selectionLabel = (
    selection: DashboardPeriodSelection,
    locale = 'en-US',
): string => {
    if (selection.kind === 'preset') return selection.period;
    return formatRangeLabel(selection.start, selection.end, locale);
};
