/**
 * Locale-aware money parsing and formatting helpers.
 *
 * Parsing is string-based and produces a canonical decimal string without
 * floating-point arithmetic. Formatting uses `Intl` for display only.
 */

/**
 * Extract the locale's decimal separator.
 *
 * @param {string} locale The BCP-47 locale.
 * @returns {string} `.` or `,`.
 */
export const decimalSeparatorForLocale = (locale: string): string => {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
    return parts.find((part) => part.type === 'decimal')?.value ?? '.';
};

/**
 * Parse a user-entered money value into a canonical decimal string.
 *
 * @param {string} raw The raw input string.
 * @param {string} locale The locale used to interpret separators.
 * @param {number} [maxFractionDigits=2] Maximum accepted decimal places.
 * @returns {string} A canonical `1234.56` string, or an empty string when
 *   the input is not a valid positive decimal.
 */
export const parseMoneyInput = (
    raw: string,
    locale: string,
    maxFractionDigits = 2,
): string => {
    if (!raw) return '';

    const decimalSeparator = decimalSeparatorForLocale(locale);
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
 * @param {string} locale The display locale.
 * @param {string} currency The ISO 4217 currency code.
 * @param {number} [maxFractionDigits=2] Displayed fraction digits.
 * @returns {string} The formatted currency string.
 */
export const formatMoney = (
    amount: string | number,
    locale: string,
    currency: string,
    maxFractionDigits = 2,
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: maxFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    }).format(Number(amount));
};
