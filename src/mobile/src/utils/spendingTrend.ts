/**
 * Six-month income/expense trend bucketing for the dashboard.
 *
 * The dashboard already fetches every owned transaction, so this module can
 * derive the trend locally without any additional backend request. Bucketing
 * uses exact monetary arithmetic and the runtime's local calendar.
 */

import type { SpendingTrendPoint } from '@/types/dashboard';
import { addMoney } from '@/utils/money';

/** Minimum transaction fields required to build the trend. */
export interface TrendTransaction {
    amount: string | number;
    currency?: string | null;
    transType: 'INCOME' | 'EXPENSE';
    transactionDate: string | Date;
}

/** Number of calendar months included in the trend. */
const TREND_MONTHS = 6;

/**
 * Build six monthly income/expense buckets ending at the current month.
 *
 * Transactions in other currencies are ignored, matching the dashboard's
 * single-currency aggregation rule.
 *
 * @param {TrendTransaction[]} transactions All owned transactions.
 * @param {string} currency The user's ISO 4217 currency.
 * @param {Date} [now=new Date()] The reference instant.
 * @returns {SpendingTrendPoint[]} Six buckets, oldest first.
 */
export const buildSpendingTrend = (
    transactions: TrendTransaction[],
    currency: string,
    now: Date = new Date(),
): SpendingTrendPoint[] => {
    const points: SpendingTrendPoint[] = [];

    for (let offset = TREND_MONTHS - 1; offset >= 0; offset -= 1) {
        const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
        const monthLabel = start.toLocaleDateString('en-US', { month: 'short' });

        const inMonth = transactions.filter((transaction) => {
            if ((transaction.currency ?? currency) !== currency) return false;
            const date =
                typeof transaction.transactionDate === 'string'
                    ? new Date(transaction.transactionDate)
                    : transaction.transactionDate;
            return date >= start && date < end;
        });

        points.push({
            month: monthLabel,
            income: addMoney(
                inMonth
                    .filter((transaction) => transaction.transType === 'INCOME')
                    .map((transaction) => transaction.amount),
            ),
            expenses: addMoney(
                inMonth
                    .filter((transaction) => transaction.transType === 'EXPENSE')
                    .map((transaction) => transaction.amount),
            ),
        });
    }

    return points;
};
