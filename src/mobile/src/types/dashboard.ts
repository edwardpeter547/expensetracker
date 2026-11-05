/**
 * Domain types for the approved ExpenseTracker Dashboard V1.5.
 *
 * Amounts are represented as canonical decimal strings (rather than numbers)
 * so the dashboard can aggregate and display financial data without binary
 * floating-point error. These types are deliberately presentation-neutral so
 * they can be reused by the data-mapping layer and the dashboard components.
 */

/** Reporting periods offered by the dashboard date selector. */
export type DashboardPeriod =
    | 'This Month'
    | 'Last Month'
    | 'Last 3 Months'
    | 'This Year';

/** Bottom-navigation destinations in the approved left-to-right order. */
export type DashboardTab = 'Home' | 'Transactions' | 'Planning' | 'Teams' | 'Profile';

/** An inclusive custom date range selected through the calendar picker. */
export interface DateRangeSelection {
    start: Date;
    end: Date;
}

/**
 * The dashboard period selection: one of the four presets or a custom
 * inclusive date range.
 */
export type DashboardPeriodSelection =
    | { kind: 'preset'; period: DashboardPeriod }
    | { kind: 'range'; start: Date; end: Date };

/** One donut/legend category with its exact net spending amount. */
export interface CategorySpend {
    /** Display name, normalized from the stored transaction category. */
    name: string;
    /** Canonical decimal amount string such as `"450"` or `"12.5"`. */
    amount: string;
    /** Approved donut/legend color assigned by presentation order. */
    color: string;
}

/** One month bucket in the six-month dashboard trend. */
export interface SpendingTrendPoint {
    /** Short month label such as `"Oct"`. */
    month: string;
    /** Exact income total for the month as a canonical string. */
    income: string;
    /** Exact expense total for the month as a canonical string. */
    expenses: string;
}

/** Fully mapped view model consumed by the dashboard screen. */
export interface DashboardData {
    /** Authenticated user's first name for the greeting. */
    firstName: string;
    /** ISO 4217 currency used for both aggregation and display. */
    currency: string;
    /** Total expenses for the selected period as a canonical string. */
    totalSpending: string;
    /** Whole-number percentage versus the previous period, or null. */
    spendingChangePercent: number | null;
    /** Total income for the selected period as a canonical string. */
    income: string;
    /** Total expenses for the selected period as a canonical string. */
    expenses: string;
    /** Reporting-period remainder (income minus expenses). */
    remaining: string;
    /** Current-month expense total used by the spending-goal bar. */
    monthlySpending: string;
    /** Monthly spending goal; a temporary default until a goals feature exists. */
    spendingGoal: string;
    /** Last six months of income and expenses, oldest first. */
    trend: SpendingTrendPoint[];
    /** Positive-net expense categories sorted by descending amount. */
    categories: CategorySpend[];
    /** Authenticated custom-avatar URL, present only for a real photo. */
    avatarUri?: string;
    /** Avatar initials supplied by the profile DTO for accessibility. */
    avatarInitials?: string;
    /** True when the profile has no custom avatar image. */
    avatarIsDefault?: boolean;
    /** Unread notification count; absent because no API exists yet. */
    notificationCount?: number;
}

/** Approved donut color palette, consumed in presentation order. */
export const CATEGORY_PALETTE: readonly string[] = [
    '#FF8B31',
    '#3296FB',
    '#6478F6',
    '#A94BDE',
    '#83B1FF',
    '#73D8AC',
];
