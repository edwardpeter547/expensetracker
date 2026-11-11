/**
 * Locale-aware money parsing and formatting helpers.
 *
 * Parsing is string-based and produces a canonical decimal string without
 * floating-point arithmetic. Formatting uses `Intl` for display only.
 */

/**
 * Resolve the locale used for money parsing and display.
 *
 * Translation language, display region, and currency are independent: the
 * language comes from the user preference while the region comes from the
 * device, so a French speaker in Canada formats with `fr-CA` rather than
 * `fr-FR`. A language that already carries a region is preserved when no
 * explicit region is supplied.
 *
 * @param {string} language The base translation language (for example `fr`).
 * @param {string|null} [regionCode] The ISO 3166-1 alpha-2 device region.
 * @returns {string} A BCP-47 locale such as `fr-CA` or `en-GB`.
 */
export const resolveMoneyLocale = (language: string, regionCode?: string | null): string => {
    const raw = (language ?? '').trim();
    if (!raw) return 'en';

    const [basePart, existingRegion] = raw.split('-');
    const base = basePart.toLowerCase() || 'en';

    const region = (
        typeof regionCode === 'string' && /^[A-Za-z]{2}$/.test(regionCode.trim())
            ? regionCode.trim()
            : existingRegion && /^[A-Za-z]{2}$/.test(existingRegion)
                ? existingRegion
                : ''
    ).toUpperCase();

    return region ? `${base}-${region}` : base;
};

/**
 * Extract the locale's decimal separator.
 *
 * @param {string} locale The BCP-47 locale.
 * @returns {string} `.` or `,`.
 */
export const decimalSeparatorForLocale = (locale: string): string => {
    try {
        const formatted = (1.1).toLocaleString(locale, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        });
        const match = formatted.match(/1(.)1/);
        if (match?.[1]) return match[1];
    } catch {
        // Fall through to the locale-prefix heuristic below.
    }

    return /^(fr|de|it|es|pt|nl|da|nb|nn|sv|fi|el|pl|cs|sk|hu|ro|bg|ru|uk|tr)\b/.test(locale)
        ? ','
        : '.';
};

/**
 * Parse a user-entered money value into a canonical decimal string.
 *
 * @param {string} raw The raw input string.
 * @param {string} language The display language used to interpret separators.
 * @param {number} [maxFractionDigits=2] Maximum accepted decimal places.
 * @param {string|null} [regionCode] Optional device region for the locale.
 * @returns {string} A canonical `1234.56` string, or an empty string when
 *   the input is not a valid positive decimal.
 */
export const parseMoneyInput = (
    raw: string,
    language: string,
    maxFractionDigits = 2,
    regionCode?: string | null,
): string => {
    if (!raw) return '';

    const decimalSeparator = decimalSeparatorForLocale(resolveMoneyLocale(language, regionCode));
    const cleaned = raw
        .replace(/[^\d.,]/g, '')
        .replace(/\s/g, '');

    if (!cleaned) return '';

    let whole: string;
    let fraction = '';

    if (cleaned.includes(decimalSeparator)) {
        const [head, ...tail] = cleaned.split(decimalSeparator);
        whole = head.replace(/[.,]/g, '');
        fraction = tail.join('').replace(/[.,]/g, '');
    } else if (cleaned.includes(',')) {
        const [head, ...tail] = cleaned.split(',');
        whole = head.replace(/\./g, '');
        fraction = tail.join('').replace(/\./g, '');
    } else if (cleaned.includes('.')) {
        const [head, ...tail] = cleaned.split('.');
        whole = head;
        fraction = tail.join('');
    } else {
        whole = cleaned;
    }

    if (!whole || !/^\d+$/.test(whole)) return '';
    if (fraction.length > maxFractionDigits) return '';
    if (fraction && !/^\d+$/.test(fraction)) return '';

    return fraction ? `${whole}.${fraction}` : whole;
};

/**
 * Format a canonical decimal string as locale- and currency-aware display text.
 *
 * @param {string|number} amount The canonical amount.
 * @param {string} language The display language.
 * @param {string} currency The ISO 4217 currency code.
 * @param {number} [maxFractionDigits=2] Displayed fraction digits.
 * @returns {string} The formatted currency string.
 */
export const formatMoney = (
    amount: string | number,
    language: string,
    currency: string,
    maxFractionDigits = 2,
): string => {
    return new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: maxFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    }).format(Number(amount));
};
