/**
 * Demonstration fixtures for the Planning feature.
 *
 * These values ship with the approved Planning UI handoff for visual previews.
 * They follow the existing demo-data convention: the single `DEMO_MODE` switch
 * in `dashboardDemo.ts` remains the source of truth, and mutable stores below
 * support in-memory demo interactions without touching the live backend.
 */

import type {
    PlannedExpense,
    PlanningAllocation,
    PlanningBudget,
    PlanningCashFlowSeries,
    PlanningCashMovement,
    PlanningGoal,
    PlanningInsightCategory,
    PlanningPeriodKey,
    PlanningPeriodSummary,
    PlanningTool,
} from '@/types/planning';

/** The six approved Planning tools, in dashboard order. */
export const PLANNING_TOOLS: readonly PlanningTool[] = [
    { key: 'budgets', name: 'Budgets', desc: 'Manage your spending limits', icon: 'wallet', color: '#148D63', bg: '#E5F7ED' },
    { key: 'goals', name: 'Savings Goals', desc: 'Save for what matters', icon: 'target', color: '#4D85E8', bg: '#EAF1FF' },
    { key: 'insights', name: 'Insights', desc: 'Understand your finances', icon: 'chart-no-axes-combined', color: '#9861DC', bg: '#F3EBFE' },
    { key: 'monthly-plan', name: 'Monthly Plan', desc: 'Plan income and expenses', icon: 'calendar-days', color: '#E5963B', bg: '#FFF2E1' },
    { key: 'cash-flow', name: 'Cash Flow', desc: "See what's coming", icon: 'trending-up', color: '#148E8C', bg: '#E4F6F4' },
    { key: 'planned-expenses', name: 'Planned Expenses', desc: 'Prepare for future costs', icon: 'shopping-bag', color: '#D45A8C', bg: '#FFF0F6' },
];

/** Initial demo budgets matching the approved handoff. */
export const PLANNING_DEMO_BUDGETS: PlanningBudget[] = [
    { id: 'food', name: 'Food & Drinks', spent: 450, limit: 600, color: '#F3A046', bg: '#FFF0DF', icon: 'utensils' },
    { id: 'transport', name: 'Transportation', spent: 240, limit: 400, color: '#5689ED', bg: '#EAF1FF', icon: 'car-front' },
    { id: 'shopping', name: 'Shopping', spent: 180, limit: 300, color: '#9D67E6', bg: '#F3EBFE', icon: 'shopping-bag' },
    { id: 'entertainment', name: 'Entertainment', spent: 85, limit: 200, color: '#E55B99', bg: '#FFEAF3', icon: 'clapperboard' },
];

/** Initial demo savings goals matching the approved handoff. */
export const PLANNING_DEMO_GOALS: PlanningGoal[] = [
    { id: 'emergency', name: 'Emergency Fund', saved: 1500, target: 5000, color: '#2BAE78', bg: '#E5F7EE', icon: 'shield-check', date: 'Dec 2027' },
    { id: 'vacation', name: 'Summer Vacation', saved: 800, target: 2000, color: '#5088EC', bg: '#EAF1FF', icon: 'plane', date: 'Aug 2027' },
    { id: 'laptop', name: 'New Laptop', saved: 400, target: 1200, color: '#9D65E5', bg: '#F3EBFE', icon: 'laptop', date: 'Mar 2027' },
];

/** Initial demo planned expenses, including one completed example. */
export const PLANNING_DEMO_PLANNED_EXPENSES: PlannedExpense[] = [
    { id: 'insurance', name: 'Car Insurance Renewal', amount: 680, date: 'Dec 15', status: 'Upcoming', icon: 'car-front', color: '#E69C45', bg: '#FFF0DC' },
    { id: 'chair', name: 'New Office Chair', amount: 350, date: 'Jan 10', status: 'Saving', icon: 'armchair', color: '#9B67E4', bg: '#F3EBFE' },
    { id: 'holiday', name: 'Family Holiday', amount: 1800, date: 'Aug 20', status: 'Saving', icon: 'plane', color: '#5088EC', bg: '#EAF1FF' },
    { id: 'tyres', name: 'New Tyres', amount: 420, date: 'Nov 2', status: 'Completed', icon: 'car-front', color: '#15966B', bg: '#E7F7EF' },
];

/** Illustrative category breakdown for the Insights screen. */
export const PLANNING_DEMO_INSIGHT_CATEGORIES: PlanningInsightCategory[] = [
    { name: 'Food & Drinks', amount: 450, pct: 36, color: '#F3A046', icon: 'utensils' },
    { name: 'Transportation', amount: 240, pct: 19, color: '#5689ED', icon: 'car-front' },
    { name: 'Shopping', amount: 180, pct: 15, color: '#9D67E6', icon: 'shopping-bag' },
    { name: 'Bills & Utilities', amount: 150, pct: 12, color: '#15966B', icon: 'house' },
];

/** Illustrative upcoming cash movements for the Cash Flow screen. */
export const PLANNING_DEMO_CASH_MOVEMENTS: PlanningCashMovement[] = [
    { name: 'Salary', date: 'Nov 25', amount: 3500, icon: 'briefcase-business', color: '#15966B', bg: '#E7F7EF' },
    { name: 'Rent', date: 'Nov 1', amount: -950, icon: 'house', color: '#5689ED', bg: '#EAF1FF' },
    { name: 'Internet & Utilities', date: 'Nov 8', amount: -145, icon: 'wifi', color: '#9D67E6', bg: '#F3EBFE' },
    { name: 'Subscriptions', date: 'Nov 15', amount: -42, icon: 'repeat', color: '#F3A046', bg: '#FFF0DF' },
];

/** Illustrative cumulative income/expense trend for the forecast chart. */
export const PLANNING_DEMO_CASH_FLOW_SERIES: PlanningCashFlowSeries = {
    labels: ['1 Nov', '8 Nov', '15 Nov', '22 Nov', '30 Nov'],
    income: [400, 1300, 4800, 5400, 6600],
    expense: [950, 1095, 1137, 1837, 2317],
};

/** Illustrative intended allocations for the Monthly Plan screen. */
export const PLANNING_DEMO_ALLOCATIONS: PlanningAllocation[] = [
    { name: 'Housing & Bills', amount: 950, icon: 'house', color: '#5689ED', bg: '#EAF1FF' },
    { name: 'Food & Groceries', amount: 450, icon: 'shopping-basket', color: '#F3A046', bg: '#FFF0DF' },
    { name: 'Transport', amount: 240, icon: 'car-front', color: '#9D67E6', bg: '#F3EBFE' },
    { name: 'Lifestyle', amount: 260, icon: 'coffee', color: '#E55B99', bg: '#FFEAF3' },
    { name: 'Savings', amount: 500, icon: 'piggy-bank', color: '#15966B', bg: '#E7F7EF' },
];

/** Illustrative planned monthly income for the Monthly Plan screen. */
export const PLANNING_DEMO_INCOME = 3500;

/** Planning dashboard figures for each approved period. */
export const PLANNING_DASHBOARD_SUMMARIES: Record<PlanningPeriodKey, PlanningPeriodSummary> = {
    month: { budget: 2500, spent: 1234.56, saved: 2700, goal: 8200, change: -8.4 },
    last: { budget: 2400, spent: 1450.25, saved: 2400, goal: 8200, change: 5.2 },
    year: { budget: 30000, spent: 14820, saved: 2700, goal: 8200, change: -3.1 },
};

/** Mutable demo budget store; starts from the handoff fixtures. */
let demoPlanningBudgets: PlanningBudget[] = [...PLANNING_DEMO_BUDGETS];

/**
 * Return the current demo budget list.
 *
 * @returns {PlanningBudget[]} The current in-memory demo budgets.
 */
export const getDemoPlanningBudgets = (): PlanningBudget[] => demoPlanningBudgets;

/**
 * Append a locally-created demo budget without touching the backend.
 *
 * @param {string} name The entered category name.
 * @param {number} limit The monthly limit.
 * @returns {PlanningBudget} The created demo budget.
 */
export const addDemoPlanningBudget = (name: string, limit: number): PlanningBudget => {
    const budget: PlanningBudget = {
        id: `demo-budget-${Date.now()}`,
        name: name.trim(),
        spent: 0,
        limit,
        color: '#15966B',
        bg: '#E7F7EF',
        icon: 'wallet',
    };
    demoPlanningBudgets = [...demoPlanningBudgets, budget];
    return budget;
};

/**
 * Return one demo budget by id.
 *
 * @param {string} id The budget id.
 * @returns {PlanningBudget|undefined} The matching budget.
 */
export const getDemoPlanningBudget = (id: string): PlanningBudget | undefined =>
    demoPlanningBudgets.find((budget) => budget.id === id);

/** Mutable demo goal store; starts from the handoff fixtures. */
let demoPlanningGoals: PlanningGoal[] = [...PLANNING_DEMO_GOALS];

/**
 * Return the current demo savings-goal list.
 *
 * @returns {PlanningGoal[]} The current in-memory demo goals.
 */
export const getDemoPlanningGoals = (): PlanningGoal[] => demoPlanningGoals;

/**
 * Append a locally-created demo savings goal without touching the backend.
 *
 * @param {string} name The entered goal name.
 * @param {number} target The target amount.
 * @returns {PlanningGoal} The created demo goal.
 */
export const addDemoPlanningGoal = (name: string, target: number): PlanningGoal => {
    const goal: PlanningGoal = {
        id: `demo-goal-${Date.now()}`,
        name: name.trim(),
        saved: 0,
        target,
        color: '#15966B',
        bg: '#E7F7EF',
        icon: 'target',
        date: 'Not set',
    };
    demoPlanningGoals = [...demoPlanningGoals, goal];
    return goal;
};

/**
 * Add a contribution to a demo savings goal without touching the backend.
 *
 * Contributions are savings allocations, never spending transactions.
 *
 * @param {string} id The goal id.
 * @param {number} amount The positive contribution amount.
 * @returns {PlanningGoal|null} The updated goal, or null when not found.
 */
export const addDemoGoalContribution = (id: string, amount: number): PlanningGoal | null => {
    let updated: PlanningGoal | null = null;
    demoPlanningGoals = demoPlanningGoals.map((goal) => {
        if (goal.id !== id) return goal;
        updated = { ...goal, saved: goal.saved + amount };
        return updated;
    });
    return updated;
};

/** Mutable demo planned-expense store; starts from the handoff fixtures. */
let demoPlannedExpenses: PlannedExpense[] = [...PLANNING_DEMO_PLANNED_EXPENSES];

/**
 * Return the current demo planned-expense list.
 *
 * @returns {PlannedExpense[]} The current in-memory demo planned expenses.
 */
export const getDemoPlannedExpenses = (): PlannedExpense[] => demoPlannedExpenses;

/**
 * Append a locally-created planned expense without touching the backend.
 *
 * @param {string} name The entered expense name.
 * @param {number} amount The estimated amount.
 * @returns {PlannedExpense} The created demo planned expense.
 */
export const addDemoPlannedExpense = (name: string, amount: number): PlannedExpense => {
    const expense: PlannedExpense = {
        id: `demo-expense-${Date.now()}`,
        name: name.trim(),
        amount,
        date: 'Not set',
        status: 'Upcoming',
        icon: 'calendar-clock',
        color: '#F3A046',
        bg: '#FFF0DF',
    };
    demoPlannedExpenses = [...demoPlannedExpenses, expense];
    return expense;
};
