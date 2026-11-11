/**
 * Pure presentation and validation helpers for the Transactions screens.
 *
 * Filtering, search, day grouping, signed amount formatting, and form
 * validation are all pure functions so they can be unit-tested without a
 * device or React renderer. The module intentionally avoids React Native
 * component imports.
 */

import i18n from '@/i18n';
import { formatMoney, parseMoneyInput } from '@/localization/format';
import { calendarDayDifference, datePartsInTimeZone } from '@/localization/relative-date';
import { SYSTEM_CATEGORIES } from '@/localization/systemCategories';
import type {
    Category,
    TransactionFilter,
    TransactionRecord,
    TransactionType,
} from '@/types/transaction';

/** One date group rendered by the transaction list. */
export interface TransactionSection {
    /** Display label such as `Today`, `Yesterday`, or a formatted date. */
    title: string;
    /** Transactions belonging to the day, newest first. */
    data: TransactionRecord[];
}

/** Field-level validation errors for the Add Transaction form. */
export interface TransactionFormErrors {
    amount?: string;
    category?: string;
    description?: string;
}

/** Values validated before a transaction is submitted. */
export interface TransactionFormValues {
    amount: string;
    categoryId?: string | null;
    description?: string;
}

/**
 * Return a date at local midnight for the supplied instant.
 *
 * @param {Date} date The source date.
 * @returns {Date} The same calendar day at local midnight.
 */
export const startOfTransactionDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Return the display title for a transaction row.
 *
 * The approved list uses the description as the primary title and falls back
 * to the category when no description was entered.
 *
 * @param {TransactionRecord} transaction The transaction record.
 * @returns {string} The row title.
 */
export const transactionTitle = (transaction: TransactionRecord): string => {
    const description = (transaction.description ?? '').trim();
    return description || transaction.category || 'Transaction';
};

/**
 * Filter transactions by the selected segment and a free-text query.
 *
 * Search matches the primary title and the stored category name. Matching is
 * case-insensitive and whitespace-tolerant.
 *
 * @param {TransactionRecord[]} transactions All available transactions.
 * @param {TransactionFilter} filter The selected list segment.
 * @param {string} query The search text.
 * @returns {TransactionRecord[]} The filtered transactions.
 */
export const filterTransactions = (
    transactions: TransactionRecord[],
    filter: TransactionFilter,
    query: string,
): TransactionRecord[] => {
    const needle = query.trim().toLowerCase();

    return transactions.filter((transaction) => {
        if (filter !== 'ALL' && transaction.transType !== filter) return false;
        if (!needle) return true;

        const searchable = `${transactionTitle(transaction)} ${transaction.category}`
            .toLowerCase();
        return searchable.includes(needle);
    });
};

/**
 * Build a human-readable section label for a transaction day.
 *
 * @param {Date} date The transaction's local day.
 * @param {Date} now The reference instant.
 * @param {string} [locale='en-US'] The display locale.
 * @param {string|null} [timeZone] The user's IANA timezone preference.
 * @returns {string} `Today`, `Yesterday`, or a formatted date.
 */
export const transactionDayLabel = (
    date: Date,
    now: Date,
    locale = 'en-US',
    timeZone?: string | null,
): string => {
    const dayDifference = calendarDayDifference(date, now, timeZone);

    const labelLanguage = (locale || 'en').split('-')[0].toLowerCase();
    const translate = i18n.getFixedT(labelLanguage, 'common');
    if (dayDifference === 0) return translate('Today');
    if (dayDifference === 1) return translate('Yesterday');

    const targetParts = datePartsInTimeZone(date, timeZone);
    const currentParts = datePartsInTimeZone(now, timeZone);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        timeZone: timeZone ?? undefined,
    };
    if (targetParts.year !== currentParts.year) {
        options.year = 'numeric';
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Group transactions into day sections sorted newest first.
 *
 * @param {TransactionRecord[]} transactions The filtered transactions.
 * @param {Date} [now=new Date()] The reference instant for relative labels.
 * @param {string} [locale='en-US'] The display locale.
 * @param {string|null} [timeZone] The user's IANA timezone preference.
 * @returns {TransactionSection[]} Day groups in descending date order.
 */
export const groupTransactionsByDay = (
    transactions: TransactionRecord[],
    now: Date = new Date(),
    locale = 'en-US',
    timeZone?: string | null,
): TransactionSection[] => {
    const sorted = [...transactions].sort(
        (left, right) =>
            new Date(right.transactionDate).getTime()
            - new Date(left.transactionDate).getTime(),
    );

    const sections: TransactionSection[] = [];
    let current: TransactionSection | null = null;

    for (const transaction of sorted) {
        const date = new Date(transaction.transactionDate);
        const label = transactionDayLabel(date, now, locale, timeZone);

        if (!current || current.title !== label) {
            current = { title: label, data: [] };
            sections.push(current);
        }
        current.data.push(transaction);
    }

    return sections;
};

/**
 * Format a transaction amount with its sign derived from the transaction type.
 *
 * The backend stores positive amounts; the sign is presentation-only and is
 * never used to derive the transaction type.
 *
 * @param {string|number} amount The positive canonical amount.
 * @param {TransactionType} type The transaction direction.
 * @param {string} locale The display locale.
 * @param {string} currency The ISO 4217 currency code.
 * @returns {string} A signed currency string.
 */
export const formatSignedAmount = (
    amount: string | number,
    type: TransactionType,
    locale: string,
    currency: string,
): string => {
    const unsigned = String(amount).replace(/^-/, '');
    const formatted = formatMoney(unsigned, locale, currency);
    return type === 'INCOME' ? `+${formatted}` : `-${formatted}`;
};

/** Common currency symbols used when `Intl.NumberFormat.formatToParts` is absent. */
const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    NGN: '₦',
    CAD: '$',
    JPY: '¥',
    AUD: 'A$',
    NZD: 'NZ$',
    CHF: 'CHF',
    INR: '₹',
    CNY: '¥',
    ZAR: 'R',
    GHS: 'GH₵',
    KES: 'KSh',
};

/**
 * Resolve the currency symbol for the user's locale and currency.
 *
 * @param {string} locale The display locale.
 * @param {string} currency The ISO 4217 currency code.
 * @returns {string} The currency symbol, falling back to the code.
 */
export const currencySymbol = (locale: string, currency: string): string => {
    void locale;
    return CURRENCY_SYMBOLS[currency] ?? currency;
};

/**
 * Return the categories appropriate for the selected transaction direction.
 *
 * System categories have a known direction; user-created categories have no
 * stored direction and are therefore offered for both income and expenses.
 *
 * @param {Category[]} categories All available categories.
 * @param {TransactionType} type The selected transaction direction.
 * @returns {Category[]} The filtered categories.
 */
export const filterCategoriesForType = (
    categories: Category[],
    type: TransactionType,
): Category[] => {
    const systemIds = new Set(SYSTEM_CATEGORIES.map((category) => category.id));
    const matchingIds = new Set(
        SYSTEM_CATEGORIES
            .filter((category) => category.type === type)
            .map((category) => category.id),
    );

    return categories.filter(
        (category) => !systemIds.has(category.id) || matchingIds.has(category.id),
    );
};

/**
 * Validate the Add Transaction form without persisting anything.
 *
 * @param {TransactionFormValues} values The form values.
 * @param {string} locale The locale used to parse the money input.
 * @returns {TransactionFormErrors} A map of invalid fields.
 */
export const validateTransactionForm = (
    values: TransactionFormValues,
    locale: string,
): TransactionFormErrors => {
    const errors: TransactionFormErrors = {};
    const normalized = parseMoneyInput(values.amount, locale, 4);

    if (!normalized || Number(normalized) <= 0) {
        errors.amount = 'Enter an amount greater than zero';
    }

    if (!values.categoryId) {
        errors.category = 'Select a category';
    }

    const descriptionLength = (values.description ?? '').trim().length;
    if (descriptionLength > 500) {
        errors.description = 'Description must be 500 characters or fewer';
    }

    return errors;
};
