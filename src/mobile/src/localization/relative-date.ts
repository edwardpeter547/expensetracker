/**
 * Timezone-aware calendar-day helpers for relative date labels.
 *
 * "Today" and "Yesterday" are calendar concepts, so they must be computed in
 * the user's IANA timezone rather than the device's local clock. `Intl`
 * decodes local date parts in the requested timezone and UTC arithmetic
 * measures whole-day differences without floating-point or DST ambiguity.
 */

/** Locale used only to decode `Intl` parts; fixed to English for stability. */
const PARTS_LOCALE = 'en';

/**
 * Resolve a usable timezone option for `Intl`.
 *
 * Empty and malformed timezone identifiers fall back to `undefined` so `Intl`
 * uses the device timezone instead of throwing.
 *
 * @param {string|null|undefined} timeZone The IANA timezone preference.
 * @returns {string|undefined} The validated timezone, or undefined.
 */
const resolveTimeZone = (timeZone?: string | null): string | undefined => {
    if (typeof timeZone !== 'string' || !timeZone.trim()) return undefined;
    const candidate = timeZone.trim();

    try {
        new Intl.DateTimeFormat(PARTS_LOCALE, {timeZone: candidate}).format(new Date());
        return candidate;
    } catch {
        return undefined;
    }
};

/**
 * Extract calendar date parts for an instant in a timezone.
 *
 * @param {Date} date The instant.
 * @param {string|null|undefined} [timeZone] The IANA timezone preference.
 * @returns {{year: number, month: number, day: number}} Zero-based month.
 */
export const datePartsInTimeZone = (
    date: Date,
    timeZone?: string | null,
): {year: number; month: number; day: number} => {
    const zone = resolveTimeZone(timeZone);

    try {
        const parts: Record<string, string> = {};
        const formatter = new Intl.DateTimeFormat(PARTS_LOCALE, {
            timeZone: zone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        for (const {type, value} of formatter.formatToParts(date)) {
            parts[type] = value;
        }
        return {
            year: Number(parts.year),
            month: Number(parts.month) - 1,
            day: Number(parts.day),
        };
    } catch {
        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
        };
    }
};

/**
 * Return the whole-day calendar difference between two instants in a timezone.
 *
 * A positive result means `reference` is that many calendar days after
 * `date`. The result is independent of clock time and daylight-saving shifts.
 *
 * @param {Date} date The earlier/compared instant.
 * @param {Date} reference The reference instant (usually now).
 * @param {string|null|undefined} [timeZone] The IANA timezone preference.
 * @returns {number} The whole-day difference.
 */
export const calendarDayDifference = (
    date: Date,
    reference: Date,
    timeZone?: string | null,
): number => {
    const target = datePartsInTimeZone(date, timeZone);
    const current = datePartsInTimeZone(reference, timeZone);

    const targetUtc = Date.UTC(target.year, target.month, target.day);
    const currentUtc = Date.UTC(current.year, current.month, current.day);

    return Math.round((currentUtc - targetUtc) / 86400000);
};
