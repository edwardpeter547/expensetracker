/**
 * Pure mapping from backend transaction records to the dashboard view model.
 *
 * The backend does not expose a date-filtered, category-grouped dashboard
 * summary, but it does expose every owned transaction through the existing
 * `/transactions` endpoint. This module derives income, expenses, remaining
 * balance, previous-period comparison, and category spending locally, using
 * exact arithmetic and the user's configured currency. No demo financial
 * values are produced here.
 */

import type { CategorySpend, DashboardData } from '@/types/dashboard';
import { CATEGORY_PALETTE } from '@/types/dashboard';
import {
    buildPeriodBounds,
    isWithinBounds,
    type PeriodBounds,
} from '@/utils/dashboardPeriod';
import {
    addMoney,
    compareMoneyDescending,
    fromScaledInteger,
    percentageChange,
    subtractMoney,
    toScaledInteger,
} from '@/utils/money';
import { buildSpendingTrend } from '@/utils/spendingTrend';

/** Minimum transaction fields required to build the dashboard. */
export interface DashboardTransaction {
    id: string;
    amount: string | number;
    currency?: string | null;
    transType: 'INCOME' | 'EXPENSE';
    category?: string | null;
    categoryId?: string | null;
    description?: string | null;
    transactionDate: string | Date;
}

/** Profile fields consumed by the dashboard mapping. */
export interface DashboardProfile {
    firstname?: string | null;
    avatar?: {
        url?: string | null;
        initials?: string | null;
        isDefault?: boolean | null;
    } | null;
}

/**
 * Temporary monthly spending goal used until a real goals feature exists.
 *
 * The value is presentation-only and deliberately kept in one place so it can
 * be replaced with backend-provided goal data later.
 */
const DEFAULT_MONTHLY_SPENDING_GOAL = '1000';

/** Internal aggregate used while grouping categories. */
interface CategoryAccumulator {
    name: string;
    scaled: bigint;
}

/**
 * Normalize a stored transaction category into a display-safe name.
 *
 * Empty or missing names are grouped under a stable fallback so uncategorized
 * spending is never dropped from the chart.
 *
 * @param {string|null|undefined} category The stored category name.
 * @returns {string} The normalized category name.
 */
const normalizeCategoryName = (category: string | null | undefined): string => {
    const trimmed = (category ?? '').trim();
    return trimmed || 'Uncategorized';
};

/**
 * Filter a transaction list to the user's currency and the requested period.
 *
 * Transactions stored in another currency are ignored, matching the existing
 * backend summary behavior which never sums across currencies.
 *
 * @param {DashboardTransaction[]} transactions All owned transactions.
 * @param {string} currency The user's ISO 4217 currency.
 * @param {PeriodBounds} bounds The inclusive/exclusive period bounds.
 * @returns {DashboardTransaction[]} The filtered transactions.
 */
const filterTransactions = (
    transactions: DashboardTransaction[],
    currency: string,
    bounds: PeriodBounds,
): DashboardTransaction[] => {
    return transactions.filter((transaction) => {
        if ((transaction.currency ?? currency) !== currency) return false;
        return isWithinBounds(transaction.transactionDate, bounds);
    });
};

/**
 * Sum one transaction type for the supplied records.
 *
 * @param {DashboardTransaction[]} transactions The filtered transactions.
 * @param {'INCOME'|'EXPENSE'} type The transaction type to sum.
 * @returns {string} The exact total as a canonical decimal string.
 */
const sumByType = (
    transactions: DashboardTransaction[],
    type: 'INCOME' | 'EXPENSE',
): string => {
    return addMoney(
        transactions
            .filter((transaction) => transaction.transType === type)
            .map((transaction) => transaction.amount),
    );
};

/**
 * Group period expenses by normalized category name.
 *
 * @param {DashboardTransaction[]} transactions Filtered expense transactions.
 * @returns {CategorySpend[]} Sorted, palette-colored category totals.
 */
const groupExpensesByCategory = (transactions: DashboardTransaction[]): CategorySpend[] => {
    const byName = new Map<string, CategoryAccumulator>();

    for (const transaction of transactions) {
        const name = normalizeCategoryName(transaction.category);
        const key = name.toLowerCase();
        const scaled = toScaledInteger(transaction.amount);
        const existing = byName.get(key);

        if (existing) {
            existing.scaled += scaled;
        } else {
            byName.set(key, { name, scaled });
        }
    }

    const positive = Array.from(byName.values())
        .filter((entry) => entry.scaled > 0n)
        .map((entry) => ({
            name: entry.name,
            amount: fromScaledInteger(entry.scaled),
        }))
        .sort((left, right) => compareMoneyDescending(left.amount, right.amount));

    return positive.map((entry, index) => ({
        ...entry,
        color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
    }));
};

/**
 * Build the complete dashboard view model from raw backend data and period
 * bounds resolved by the caller.
 *
 * @param {DashboardTransaction[]} transactions All owned transactions.
 * @param {DashboardProfile} profile The authenticated profile DTO.
 * @param {string} currency The user's ISO 4217 currency.
 * @param {PeriodBounds} current The selected period's inclusive/exclusive bounds.
 * @param {PeriodBounds} previous The comparison period's bounds.
 * @param {Date} [now=new Date()] The reference instant for the monthly goal.
 * @returns {DashboardData} The mapped dashboard view model.
 */
export const buildDashboardData = (
    transactions: DashboardTransaction[],
    profile: DashboardProfile,
    currency: string,
    current: PeriodBounds,
    previous: PeriodBounds,
    now: Date = new Date(),
): DashboardData => {
    const currentTransactions = filterTransactions(transactions, currency, current);
    const previousTransactions = filterTransactions(transactions, currency, previous);
    const monthlyBounds = buildPeriodBounds('This Month', now);
    const monthlyTransactions = filterTransactions(transactions, currency, monthlyBounds);

    const income = sumByType(currentTransactions, 'INCOME');
    const expenses = sumByType(currentTransactions, 'EXPENSE');
    const previousExpenses = sumByType(previousTransactions, 'EXPENSE');
    const monthlySpending = sumByType(monthlyTransactions, 'EXPENSE');
    const remaining = subtractMoney(income, expenses);
    const categories = groupExpensesByCategory(
        currentTransactions.filter((transaction) => transaction.transType === 'EXPENSE'),
    );

    const avatar = profile?.avatar;
    const hasCustomAvatar = Boolean(avatar?.url && !avatar?.isDefault);

    return {
        firstName: (profile?.firstname ?? '').trim() || 'User',
        currency,
        totalSpending: expenses,
        spendingChangePercent: percentageChange(expenses, previousExpenses),
        income,
        expenses,
        remaining,
        monthlySpending,
        spendingGoal: DEFAULT_MONTHLY_SPENDING_GOAL,
        trend: buildSpendingTrend(transactions, currency, now),
        categories,
        avatarUri: hasCustomAvatar ? avatar?.url ?? undefined : undefined,
        avatarInitials: avatar?.initials ?? undefined,
        avatarIsDefault: avatar?.isDefault ?? true,
    };
};
