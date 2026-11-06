/**
 * API-backed data-source implementations.
 *
 * These adapters delegate to the existing API modules in `src/api` and expose
 * the same contracts as their demo counterparts. They never import demo
 * fixtures.
 */

import { loadDashboardData } from '@/api/dashboard';
import {
    createCategory,
    createTransaction,
    deleteCategory,
    fetchBudgets,
    fetchCategories,
    fetchTransactions,
    updateCategory,
} from '@/api/transactions';
import { mapBudgetToPlanningBudget } from '@/utils/planning';
import type {
    BudgetDataSource,
    CategoryDataSource,
    DashboardDataSource,
    MembershipDataSource,
    PlanningBudgetDataSource,
    PlanningDataSource,
    RecurringDataSource,
    TeamDataSource,
    TransactionDataSource,
} from './types';

/** Dashboard adapter backed by `/transactions` and `/user/profile`. */
export const apiDashboardDataSource: DashboardDataSource = {
    load: (selection, currency, locale = 'en-US') =>
        loadDashboardData(selection, currency, new Date(), locale),
};

/** Transaction adapter backed by the authenticated transaction API. */
export const apiTransactionDataSource: TransactionDataSource = {
    list: fetchTransactions,
    create: (input) => createTransaction(input),
    get: async (id) =>
        (await fetchTransactions()).find((record) => record.id === id) ?? null,
    update: async () => {
        throw new Error('Editing transactions is not available yet.');
    },
    remove: async () => {
        throw new Error('Deleting transactions is not available yet.');
    },
};

/** Category adapter backed by the authenticated category API. */
export const apiCategoryDataSource: CategoryDataSource = {
    list: fetchCategories,
    create: (name) => createCategory({ name }),
    rename: (id, name) => updateCategory(id, { name }),
    remove: (id) => deleteCategory(id),
};

/** Raw budget adapter backed by the authenticated budget API. */
export const apiBudgetDataSource: BudgetDataSource = {
    list: fetchBudgets,
};

/** Planning budget adapter that maps raw budgets into the Planning view model. */
export const apiPlanningBudgetDataSource: PlanningBudgetDataSource = {
    list: async () => (await fetchBudgets()).map(mapBudgetToPlanningBudget),
    get: async (id) => {
        const budgets = (await fetchBudgets()).map(mapBudgetToPlanningBudget);
        return budgets.find((budget) => budget.id === id) ?? null;
    },
    create: async () => {
        throw new Error('Creating budgets is not available yet.');
    },
};

/** Membership adapter. No membership endpoint exists yet, so it resolves null. */
export const apiMembershipDataSource: MembershipDataSource = {
    get: async () => null,
};

/** Team adapter. There is no team backend yet, so reads are empty and writes fail. */
export const apiTeamDataSource: TeamDataSource = {
    list: async () => [],
    get: async () => null,
    members: async () => [],
    invitations: async () => [],
    create: async () => {
        throw new Error('Teams are not available yet.');
    },
    addInvitation: async () => {
        throw new Error('Teams are not available yet.');
    },
    addPlannedRequest: async () => {
        throw new Error('Teams are not available yet.');
    },
    plannedRequests: async () => [],
    plannedRequest: async () => null,
    decideRequest: async () => {
        throw new Error('Teams are not available yet.');
    },
    completeRequest: async () => {
        throw new Error('Teams are not available yet.');
    },
    expenses: async () => [],
    addExpense: async () => {
        throw new Error('Teams are not available yet.');
    },
    messages: async () => [],
    addMessage: async () => {
        throw new Error('Teams are not available yet.');
    },
    activity: async () => [],
};

/** Recurring adapter. There is no recurring backend yet, so reads are empty. */
export const apiRecurringDataSource: RecurringDataSource = {
    list: async () => [],
    get: async () => null,
    defaultDraft: () => ({
        type: 'EXPENSE',
        name: '',
        amountMode: 'FIXED',
        amount: '',
        estimatedAmount: '',
        categoryId: '',
        frequency: 'MONTHLY',
        startDate: '',
        repeatDay: '1st of every month',
        endCondition: 'UNTIL_CANCELED',
        endDate: '',
        endOccurrences: '',
        recordingPreference: 'REQUIRE_CONFIRMATION',
        budgetId: null,
        description: '',
    }),
};

/** Planning adapter. Non-budget planning content is demo-only for now. */
export const apiPlanningDataSource: PlanningDataSource = {
    tools: async () => [],
    summaries: async () => ({
        month: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
        last: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
        year: { budget: 0, spent: 0, saved: 0, goal: 0, change: 0 },
    }),
    goals: async () => [],
    addGoal: async () => {
        throw new Error('Savings goals are not available yet.');
    },
    contribute: async () => null,
    insightCategories: async () => [],
    monthlyPlan: async () => ({ allocations: [], income: 0 }),
    cashFlow: async () => ({
        movements: [],
        series: { labels: [], income: [], expense: [] },
    }),
    plannedExpenses: async () => [],
    addPlannedExpense: async () => {
        throw new Error('Planned expenses are not available yet.');
    },
};
