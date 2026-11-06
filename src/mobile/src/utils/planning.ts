/**
 * Pure mapping helpers for the Planning feature.
 *
 * These functions bridge the backend budget/transaction types and the
 * Planning view models without embedding financial fixtures or React code.
 */

import { categoryIconBackground, categoryIconColor, categoryIconName } from '@/components/transactions/categoryPresentation';
import type { PlanningIconSource } from '@/components/planning/planningTheme';
import type { PlanningBudget } from '@/types/planning';
import type { Budget, TransactionRecord } from '@/types/transaction';
import { transactionTitle } from '@/utils/transactions';

/** A recent transaction row shown on the Budget Detail screen. */
export interface PlanningTransactionItem {
    id: string;
    title: string;
    dateLabel: string;
    amount: number;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/**
 * Map a backend budget into the Planning card view model.
 *
 * Missing numeric fields become zero so the card renders safely for budgets
 * that have no spending yet.
 *
 * @param {Budget} budget The backend budget.
 * @returns {PlanningBudget} The mapped Planning budget.
 */
export const mapBudgetToPlanningBudget = (budget: Budget): PlanningBudget => {
    const category = budget.category ?? null;
    return {
        id: budget.id,
        name: category?.name ?? 'Budget',
        spent: Number(budget.spent ?? 0) || 0,
        limit: Number(budget.amount ?? 0) || 0,
        icon: categoryIconName(category, 'expense'),
        color: categoryIconColor(category, 'expense'),
        bg: categoryIconBackground(category, 'expense'),
    };
};

/**
 * Bucket current-month expense spending for one category into weekly totals.
 *
 * Transactions outside the current month are ignored, and the last bucket
 * absorbs any day beyond the evenly divided weeks.
 *
 * @param {TransactionRecord[]} transactions All available transactions.
 * @param {string} categoryId The category to sum.
 * @param {Date} [now=new Date()] The reference instant.
 * @param {number} [weekCount=4] The number of week buckets.
 * @returns {number[]} Whole-number spending per week bucket.
 */
export const weeklyBudgetSpending = (
    transactions: TransactionRecord[],
    categoryId: string,
    now: Date = new Date(),
    weekCount = 4,
): number[] => {
    const buckets = Array<number>(weekCount).fill(0);
    const year = now.getFullYear();
    const month = now.getMonth();

    for (const transaction of transactions) {
        if (transaction.transType !== 'EXPENSE' || transaction.categoryId !== categoryId) {
            continue;
        }
        const date = new Date(transaction.transactionDate);
        if (date.getFullYear() !== year || date.getMonth() !== month) {
            continue;
        }
        const dayIndex = date.getDate() - 1;
        const bucket = Math.min(weekCount - 1, Math.floor(dayIndex / 7));
        buckets[bucket] += Number(transaction.amount ?? 0) || 0;
    }

    return buckets.map((total) => Math.round(total));
};

/**
 * Build the recent-transaction rows for one budget category.
 *
 * Rows are expense transactions that carry the matching category id, sorted
 * newest first.
 *
 * @param {TransactionRecord[]} transactions All available transactions.
 * @param {string} categoryId The category to filter.
 * @param {string} language The display locale.
 * @param {Date} [now=new Date()] The reference instant.
 * @param {number} [limit=3] The maximum number of rows.
 * @returns {PlanningTransactionItem[]} The mapped recent transactions.
 */
export const recentBudgetTransactions = (
    transactions: TransactionRecord[],
    categoryId: string,
    language: string,
    now: Date = new Date(),
    limit = 3,
): PlanningTransactionItem[] => {
    void now;
    return transactions
        .filter((transaction) => transaction.transType === 'EXPENSE' && transaction.categoryId === categoryId)
        .sort(
            (left, right) =>
                new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime(),
        )
        .slice(0, limit)
        .map((transaction) => {
            const category = { id: transaction.categoryId ?? null, name: transaction.category, icon: null };
            return {
                id: transaction.id,
                title: transactionTitle(transaction),
                dateLabel: new Date(transaction.transactionDate).toLocaleDateString(language, {
                    day: 'numeric',
                    month: 'short',
                }),
                amount: Number(transaction.amount ?? 0) || 0,
                icon: categoryIconName(category, 'expense'),
                color: categoryIconColor(category, 'expense'),
                bg: categoryIconBackground(category, 'expense'),
            };
        });
};
