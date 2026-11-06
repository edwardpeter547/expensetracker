/**
 * Demo-backed data-source implementations.
 *
 * These adapters read and mutate the in-memory stores in `src/constants/*Demo.ts`.
 * This directory is the offline/demo layer; it is kept isolated so it can be
 * excluded from production builds without touching the online implementations.
 */

import { DEMO_DASHBOARD, DEMO_MEMBERSHIP } from '@/offline/dashboardDemo';
import {
    addDemoGoalContribution,
    addDemoPlannedExpense,
    addDemoPlanningBudget,
    addDemoPlanningGoal,
    getDemoPlannedExpenses,
    getDemoPlanningBudget,
    getDemoPlanningBudgets,
    getDemoPlanningGoals,
    PLANNING_DASHBOARD_SUMMARIES,
    PLANNING_DEMO_ALLOCATIONS,
    PLANNING_DEMO_CASH_FLOW_SERIES,
    PLANNING_DEMO_CASH_MOVEMENTS,
    PLANNING_DEMO_INCOME,
    PLANNING_DEMO_INSIGHT_CATEGORIES,
    PLANNING_TOOLS,
} from '@/offline/planningDemo';
import {
    DEMO_RECURRING_DRAFT,
    DEMO_RECURRING_SCHEDULES,
} from '@/offline/recurringDemo';
import {
    addDemoInvitation,
    addDemoPlannedRequest,
    addDemoTeamExpense,
    addDemoTeamMessage,
    completeDemoPlannedRequest,
    createDemoTeam,
    decideDemoPlannedRequest,
    getDemoInvitations,
    getDemoMembers,
    getDemoPlannedRequest,
    getDemoPlannedRequests,
    getDemoTeam,
    getDemoTeamActivity,
    getDemoTeamExpenses,
    getDemoTeamMessages,
    getDemoTeams,
} from '@/offline/teamsDemo';
import {
    addDemoCategory,
    addDemoTransaction,
    deleteDemoCategory,
    deleteDemoTransaction,
    DEMO_BUDGETS,
    getDemoCategories,
    getDemoTransaction,
    getDemoTransactions,
    updateDemoCategory,
    updateDemoTransaction,
} from '@/offline/transactionsDemo';
import type { Category } from '@/types/transaction';
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
} from '@/contracts/types';

/** Dashboard adapter returning the supplied V1.5 demonstration view model. */
export const demoDashboardDataSource: DashboardDataSource = {
    load: async () => DEMO_DASHBOARD,
};

/** Transaction adapter backed by the in-memory demo transaction store. */
export const demoTransactionDataSource: TransactionDataSource = {
    list: async () => getDemoTransactions(),
    create: async (input) => {
        const category: Category = {
            id: input.categoryId ?? '',
            name: input.category,
            icon: null,
            isSystem: input.categoryId ? input.categoryId.startsWith('sys.') : false,
            userId: null,
        };
        return addDemoTransaction({
            amount: input.amount,
            type: input.type,
            category,
            date: input.date ?? new Date().toISOString(),
            currency: 'USD',
            description: input.description,
        });
    },
    get: async (id) => getDemoTransaction(id) ?? null,
    update: async (id, patch) => updateDemoTransaction(id, patch),
    remove: async (id) => deleteDemoTransaction(id),
};

/** Category adapter backed by the in-memory demo category store. */
export const demoCategoryDataSource: CategoryDataSource = {
    list: async () => getDemoCategories(),
    create: async (name) => addDemoCategory({ name }),
    rename: async (id, name) => {
        const updated = updateDemoCategory(id, { name });
        if (!updated) throw new Error('Category not found.');
        return updated;
    },
    remove: async (id) => {
        deleteDemoCategory(id);
    },
};

/** Raw budget adapter returning the demo budget fixtures. */
export const demoBudgetDataSource: BudgetDataSource = {
    list: async () => DEMO_BUDGETS,
};

/** Planning budget adapter returning the demo Planning budget fixtures. */
export const demoPlanningBudgetDataSource: PlanningBudgetDataSource = {
    list: async () => getDemoPlanningBudgets(),
    get: async (id) => getDemoPlanningBudget(id) ?? null,
    create: async (name, limit) => addDemoPlanningBudget(name, limit),
};

/** Membership adapter returning the illustrative demo membership. */
export const demoMembershipDataSource: MembershipDataSource = {
    get: async () => DEMO_MEMBERSHIP,
};

/** Team adapter backed by the in-memory demo team stores. */
export const demoTeamDataSource: TeamDataSource = {
    list: async () => getDemoTeams(),
    get: async (id) => getDemoTeam(id) ?? null,
    members: async (teamId) => getDemoMembers(teamId),
    invitations: async (teamId) => getDemoInvitations(teamId),
    create: async (input) => createDemoTeam(input),
    addInvitation: async (input) => addDemoInvitation(input),
    addPlannedRequest: async (input) => addDemoPlannedRequest(input),
    plannedRequests: async (teamId) => getDemoPlannedRequests(teamId),
    plannedRequest: async (id) => getDemoPlannedRequest(id) ?? null,
    decideRequest: async (id, action) => decideDemoPlannedRequest(id, action),
    completeRequest: async (id, actualAmount) =>
        completeDemoPlannedRequest(id, actualAmount),
    expenses: async (teamId) => getDemoTeamExpenses(teamId),
    addExpense: async (input) => addDemoTeamExpense(input),
    messages: async (teamId) => getDemoTeamMessages(teamId),
    addMessage: async (teamId, message) => addDemoTeamMessage(teamId, message),
    activity: async (teamId) => getDemoTeamActivity(teamId),
};

/** Recurring adapter backed by the demo recurring fixtures. */
export const demoRecurringDataSource: RecurringDataSource = {
    list: async () => DEMO_RECURRING_SCHEDULES,
    get: async (id) => DEMO_RECURRING_SCHEDULES.find((schedule) => schedule.id === id) ?? null,
    defaultDraft: () => DEMO_RECURRING_DRAFT,
};

/** Planning adapter backed by the demo Planning fixtures and stores. */
export const demoPlanningDataSource: PlanningDataSource = {
    tools: async () => [...PLANNING_TOOLS],
    summaries: async () => PLANNING_DASHBOARD_SUMMARIES,
    goals: async () => getDemoPlanningGoals(),
    addGoal: async (name, target) => addDemoPlanningGoal(name, target),
    contribute: async (goalId, amount) => addDemoGoalContribution(goalId, amount),
    insightCategories: async () => PLANNING_DEMO_INSIGHT_CATEGORIES,
    monthlyPlan: async () => ({
        allocations: PLANNING_DEMO_ALLOCATIONS,
        income: PLANNING_DEMO_INCOME,
    }),
    cashFlow: async () => ({
        movements: PLANNING_DEMO_CASH_MOVEMENTS,
        series: PLANNING_DEMO_CASH_FLOW_SERIES,
    }),
    plannedExpenses: async () => getDemoPlannedExpenses(),
    addPlannedExpense: async (name, amount) => addDemoPlannedExpense(name, amount),
};
