/**
 * @file financial-period.js
 * @description Timezone-aware financial reporting period boundaries
 *
 * Reporting periods (month-to-date and weekly/monthly/yearly budgets) must
 * follow the recipient's IANA timezone rather than the server's local clock.
 * This module converts local calendar boundaries in a timezone into UTC
 * `Date` instants suitable for database queries, without any date library.
 */

/**
 * The timezone used when no valid recipient preference is available.
 */
export const DEFAULT_TIME_ZONE = 'UTC';

/**
 * The locale used to decode `Intl` parts. It is fixed to English so weekday
 * abbreviations are stable and never depend on the user's display language.
 */
const TIME_ZONE_LOCALE = 'en';

/**
 * English weekday abbreviations used to decode `Intl` weekday parts.
 */
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Resolve a recipient timezone preference to a usable IANA identifier.
 *
 * Missing, empty, or unrecognized values fall back to UTC so reporting never
 * fails and never silently depends on the server timezone.
 *
 * @param {string|undefined|null} timeZone The stored IANA timezone preference.
 * @returns {string} A valid IANA timezone identifier.
 */
export const resolveTimeZone = (timeZone) => {
    if (typeof timeZone !== 'string' || !timeZone.trim()) {
        return DEFAULT_TIME_ZONE;
    }

    const candidate = timeZone.trim();
    try {
        new Intl.DateTimeFormat(TIME_ZONE_LOCALE, {timeZone: candidate}).format(new Date());
        return candidate;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
};

/**
 * Return the millisecond offset of an instant in a timezone.
 *
 * Formats the instant's wall-clock components with `Intl` and subtracts the
 * instant, producing a positive offset for zones ahead of UTC.
 *
 * @param {Date} instant The UTC instant to inspect.
 * @param {string} timeZone A validated IANA timezone identifier.
 * @returns {number} The offset in milliseconds (UTC offset).
 */
const getTimeZoneOffsetMs = (instant, timeZone) => {
    const formatter = new Intl.DateTimeFormat(TIME_ZONE_LOCALE, {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parts = {};
    for (const {type, value} of formatter.formatToParts(instant)) {
        parts[type] = value;
    }

    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
    );

    return asUtc - instant.getTime();
};

/**
 * Convert local wall-clock date parts into their UTC instant.
 *
 * Iterates once or twice around a UTC guess so the result is correct across
 * daylight-saving transitions. Midnight boundaries always exist, so this is
 * deterministic for the period boundaries this module produces.
 *
 * @param {number} year The local year.
 * @param {number} month The local month index (0-11).
 * @param {number} day The local day of month.
 * @param {string} timeZone A validated IANA timezone identifier.
 * @returns {Date} The UTC instant of local midnight.
 */
const zonedMidnightToUtc = (year, month, day, timeZone) => {
    const guess = Date.UTC(year, month, day, 0, 0, 0);
    let timestamp = guess;

    for (let iteration = 0; iteration < 4; iteration += 1) {
        const offset = getTimeZoneOffsetMs(new Date(timestamp), timeZone);
        const next = guess - offset;
        if (next === timestamp) {
            break;
        }
        timestamp = next;
    }

    return new Date(timestamp);
};

/**
 * Extract local calendar components of an instant in a timezone.
 *
 * @param {Date} instant The UTC instant.
 * @param {string} timeZone A validated IANA timezone identifier.
 * @returns {{year: number, month: number, day: number, weekday: number}}
 *   Local year, zero-based month, day, and zero-based weekday (Sunday = 0).
 */
const getLocalDateParts = (instant, timeZone) => {
    const formatter = new Intl.DateTimeFormat(TIME_ZONE_LOCALE, {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
    });
    const parts = {};
    for (const {type, value} of formatter.formatToParts(instant)) {
        parts[type] = value;
    }

    return {
        year: Number(parts.year),
        month: Number(parts.month) - 1,
        day: Number(parts.day),
        weekday: WEEKDAY_NAMES.indexOf(parts.weekday),
    };
};

/**
 * Return the UTC instant at the start of the reference instant's local month.
 *
 * @param {Date} reference The reference UTC instant.
 * @param {string|undefined|null} timeZone The recipient timezone preference.
 * @returns {Date} The UTC instant of local month start.
 */
export const startOfMonthInTimeZone = (reference, timeZone) => {
    const zone = resolveTimeZone(timeZone);
    const {year, month} = getLocalDateParts(reference, zone);
    return zonedMidnightToUtc(year, month, 1, zone);
};

/**
 * Return the UTC start and exclusive end of a reporting period.
 *
 * Weeks start on Sunday to preserve the existing budget semantics. Month and
 * year boundaries roll correctly across December/year transitions, and DST
 * changes are absorbed by {@link zonedMidnightToUtc}.
 *
 * @param {Date} reference The reference UTC instant.
 * @param {string} period One of `MONTHLY`, `WEEKLY`, or `YEARLY`.
 * @param {string|undefined|null} timeZone The recipient timezone preference.
 * @returns {{start: Date, end: Date}} UTC query boundaries (`gte` and `lt`).
 * @throws {RangeError} If the period is unsupported.
 */
export const getPeriodBounds = (reference, period, timeZone) => {
    const zone = resolveTimeZone(timeZone);
    const {year, month, day, weekday} = getLocalDateParts(reference, zone);

    if (period === 'MONTHLY') {
        const start = zonedMidnightToUtc(year, month, 1, zone);
        const end = month === 11
            ? zonedMidnightToUtc(year + 1, 0, 1, zone)
            : zonedMidnightToUtc(year, month + 1, 1, zone);
        return {start, end};
    }

    if (period === 'YEARLY') {
        return {
            start: zonedMidnightToUtc(year, 0, 1, zone),
            end: zonedMidnightToUtc(year + 1, 0, 1, zone),
        };
    }

    if (period === 'WEEKLY') {
        return {
            start: zonedMidnightToUtc(year, month, day - weekday, zone),
            end: zonedMidnightToUtc(year, month, day - weekday + 7, zone),
        };
    }

    throw new RangeError(`Unsupported reporting period: ${period}`);
};
