/**
 * Planning workspace domain types.
 *
 * These view-model types are shared by the Planning UI and the demo/online data
 * sources. They live here rather than in the demo fixtures so online code never
 * depends on the offline demo layer.
 */

import type { PlanningIconSource } from '@/components/planning/planningTheme';

/** A category budget card in the Planning workspace. */
export interface PlanningBudget {
    id: string;
    name: string;
    /** Amount spent in the current period. */
    spent: number;
    /** Budget limit for the current period. */
    limit: number;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/** A personal savings goal in the Planning workspace. */
export interface PlanningGoal {
    id: string;
    name: string;
    saved: number;
    target: number;
    icon: PlanningIconSource;
    color: string;
    bg: string;
    /** Human-readable target date. */
    date: string;
}

/** The three supported planned-expense statuses. */
export type PlannedExpenseStatus = 'Upcoming' | 'Saving' | 'Completed';

/** A future financial commitment shown on the Planned Expenses screen. */
export interface PlannedExpense {
    id: string;
    name: string;
    amount: number;
    date: string;
    status: PlannedExpenseStatus;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/** A tool entry rendered in the Planning dashboard grid. */
export interface PlanningTool {
    key: string;
    name: string;
    desc: string;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/** A category breakdown row on the Insights screen. */
export interface PlanningInsightCategory {
    name: string;
    amount: number;
    /** Share of total spending, expressed as a whole-number percentage. */
    pct: number;
    color: string;
    icon: PlanningIconSource;
}

/** A projected cash movement on the Cash Flow screen. */
export interface PlanningCashMovement {
    name: string;
    date: string;
    /** Signed amount; positive is an inflow, negative an outflow. */
    amount: number;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/** An intended monthly allocation on the Monthly Plan screen. */
export interface PlanningAllocation {
    name: string;
    amount: number;
    icon: PlanningIconSource;
    color: string;
    bg: string;
}

/** Planning dashboard reporting periods. */
export type PlanningPeriodKey = 'month' | 'last' | 'year';

/** Period-dependent figures shown on the Planning dashboard. */
export interface PlanningPeriodSummary {
    budget: number;
    spent: number;
    saved: number;
    goal: number;
    /** Whole-number percentage change versus the previous period. */
    change: number;
}

/** Income/expense series for the Cash Flow forecast chart. */
export interface PlanningCashFlowSeries {
    labels: string[];
    /** Cumulative income totals across the month. */
    income: number[];
    /** Cumulative expense totals across the month. */
    expense: number[];
}
