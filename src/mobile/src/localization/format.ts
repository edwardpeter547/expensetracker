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
 * Currency symbols that must be pinned to their common glyph even when a
 * runtime's `Intl` implementation falls back to the ISO code.
 */
const CURRENCY_SYMBOL_OVERRIDES: Record<string, string> = {
    NGN: '₦',
};

/**
 * Replace an ISO currency code emitted by `Intl` with its preferred glyph.
 *
 * @param {string} formatted The currency-formatted string.
 * @param {string} currency The ISO 4217 currency code.
 * @returns {string} The formatted string with the preferred symbol.
 */
const applyCurrencySymbolOverride = (formatted: string, currency: string): string => {
    const symbol = CURRENCY_SYMBOL_OVERRIDES[currency];
    if (!symbol || !formatted.includes(currency)) return formatted;
    return formatted.split(currency).join(symbol);
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
    const formatted = new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: maxFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    }).format(Number(amount));
    return applyCurrencySymbolOverride(formatted, currency);
};

/**
 * Parts of a formatted currency amount split around the decimal separator.
 *
 * `prefix` holds everything before the decimal separator (sign, symbol, and
 * grouped integer), `fraction` holds the separator and following digits, and
 * `suffix` holds any trailing parts such as a postfixed currency symbol.
 */
export interface SplitMoneyParts {
    prefix: string;
    fraction: string;
    suffix: string;
}

/**
 * Format and split a currency amount into prefix, fraction, and suffix parts.
 *
 * The split uses only `Intl.NumberFormat.format`, which is available on both
 * Hermes iOS and Android. It derives the locale decimal separator from a
 * decimal-only formatting of the same amount, then slices the currency string
 * around that separator so the symbol position (prefix or suffix) is kept.
 *
 * @param {string|number} amount The canonical amount.
 * @param {string} language The display language.
 * @param {string} currency The ISO 4217 currency code.
 * @param {number} [maxFractionDigits=2] Displayed fraction digits.
 * @returns {SplitMoneyParts} The prefix, fraction, and suffix parts.
 */
export const splitFormattedMoney = (
    amount: string | number,
    language: string,
    currency: string,
    maxFractionDigits = 2,
): SplitMoneyParts => {
    const numeric = Number(amount);
    const currencyFormat = new Intl.NumberFormat(language, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: maxFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    });
    const full = applyCurrencySymbolOverride(currencyFormat.format(numeric), currency);

    if (!Number.isFinite(maxFractionDigits) || maxFractionDigits <= 0) {
        return { prefix: full, fraction: '', suffix: '' };
    }

    let fractionDigits: string;
    try {
        const decimalFormat = new Intl.NumberFormat(language, {
            style: 'decimal',
            minimumFractionDigits: maxFractionDigits,
            maximumFractionDigits: maxFractionDigits,
        }).format(numeric);
        fractionDigits = decimalFormat.slice(-maxFractionDigits);
    } catch {
        // Hermes fallback: leave the amount whole rather than risk a crash.
        return { prefix: full, fraction: '', suffix: '' };
    }

    const fractionStart = full.lastIndexOf(fractionDigits);
    if (fractionStart < 0) {
        return { prefix: full, fraction: '', suffix: '' };
    }

    const separatorStart = fractionStart - 1;
    return {
        prefix: full.slice(0, separatorStart),
        fraction: full.slice(separatorStart, fractionStart + maxFractionDigits),
        suffix: full.slice(fractionStart + maxFractionDigits),
    };
};
