/**
 * Data-source contracts for the mobile client.
 *
 * Consumers (hooks and routes) depend on these interfaces instead of importing
 * demo fixtures or API modules directly. The factory in `./index.ts` selects
 * between the API-backed and demo-backed implementations, which keeps demo code
 * confined to the `data` layer.
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
import type { DashboardData, DashboardPeriodSelection } from '@/types/dashboard';
import type { MembershipSummary } from '@/types/membership';
import type { RecurringDraft, RecurringSchedule } from '@/types/recurring';
import type {
    FinanceMode,
    Team,
    TeamActivity,
    TeamChatMessage,
    TeamExpense,
    TeamInvitation,
    TeamKind,
    TeamMember,
    TeamPlannedRequest,
} from '@/types/team';
import type {
    Budget,
    Category,
    CreateTransactionInput,
    TransactionRecord,
} from '@/types/transaction';

/** Loads the mapped dashboard view model for a period selection. */
export interface DashboardDataSource {
    /**
     * Load dashboard data.
     *
     * @param selection The selected preset or custom date range.
     * @param currency The user's ISO 4217 currency.
     * @param locale The display locale used for range labels.
     * @returns The mapped dashboard view model.
     */
    load(
        selection: DashboardPeriodSelection,
        currency: string,
        locale?: string,
    ): Promise<DashboardData>;
}

/** Owns transaction list/create/read/update/delete. */
export interface TransactionDataSource {
    /** @returns Every transaction owned by the authenticated user. */
    list(): Promise<TransactionRecord[]>;
    /** @param input The transaction fields to persist. */
    create(input: CreateTransactionInput): Promise<TransactionRecord | null>;
    /** @param id The transaction id to load. */
    get(id: string): Promise<TransactionRecord | null>;
    /** @param id The transaction id. @param patch The fields to update. */
    update(
        id: string,
        patch: Partial<TransactionRecord>,
    ): Promise<TransactionRecord | null>;
    /** @param id The transaction id to remove. */
    remove(id: string): Promise<boolean>;
}

/** Owns user category list/create/rename/delete. */
export interface CategoryDataSource {
    /** @returns The system plus user categories. */
    list(): Promise<Category[]>;
    /** @param name The new category name. */
    create(name: string): Promise<Category>;
    /** @param id The category id. @param name The new category name. */
    rename(id: string, name: string): Promise<Category>;
    /** @param id The category id to remove. */
    remove(id: string): Promise<void>;
}

/** Owns raw budget records used by the transaction form. */
export interface BudgetDataSource {
    /** @returns The authenticated user's active budgets. */
    list(): Promise<Budget[]>;
}

/** Owns Planning budget view models. */
export interface PlanningBudgetDataSource {
    /** @returns Budgets mapped into the Planning card view model. */
    list(): Promise<PlanningBudget[]>;
    /** @param id The budget id to load. */
    get(id: string): Promise<PlanningBudget | null>;
    /** @param name The category name. @param limit The monthly limit. */
    create(name: string, limit: number): Promise<PlanningBudget>;
}

/** Owns the membership presentation. */
export interface MembershipDataSource {
    /** @returns The membership summary, or null when unavailable. */
    get(): Promise<MembershipSummary | null>;
}

/** Owns the Teams collaborative-finance workspace. */
export interface TeamDataSource {
    list(): Promise<Team[]>;
    get(id: string): Promise<Team | null>;
    members(teamId: string): Promise<TeamMember[]>;
    invitations(teamId: string): Promise<TeamInvitation[]>;
    create(input: {
        name: string;
        kind: TeamKind;
        mode: FinanceMode;
    }): Promise<Team>;
    addInvitation(input: {
        teamId: string;
        contact: string;
        method: 'Phone' | 'Email';
        role: Exclude<TeamMember['role'], 'Owner'>;
    }): Promise<TeamInvitation>;
    addPlannedRequest(input: {
        teamId: string;
        name: string;
        description?: string;
        estimatedAmount: number;
        plannedDate?: string;
    }): Promise<TeamPlannedRequest>;
    plannedRequests(teamId: string): Promise<TeamPlannedRequest[]>;
    plannedRequest(id: string): Promise<TeamPlannedRequest | null>;
    decideRequest(
        id: string,
        action: 'Approved' | 'Rejected',
    ): Promise<TeamPlannedRequest | null>;
    completeRequest(
        id: string,
        actualAmount: number,
    ): Promise<{ request: TeamPlannedRequest; expense: TeamExpense } | null>;
    expenses(teamId: string): Promise<TeamExpense[]>;
    addExpense(input: {
        teamId: string;
        name: string;
        amount: number;
        paidBy: string;
        date: string;
        category?: string;
        receiptId?: string;
        items?: TeamExpense['items'];
    }): Promise<TeamExpense>;
    messages(teamId: string): Promise<TeamChatMessage[]>;
    addMessage(teamId: string, message: string): Promise<TeamChatMessage>;
    activity(teamId: string): Promise<TeamActivity[]>;
}

/** Owns recurring-transaction presentation data. */
export interface RecurringDataSource {
    list(): Promise<RecurringSchedule[]>;
    get(id: string): Promise<RecurringSchedule | null>;
    defaultDraft(): RecurringDraft;
}

/** Owns the demo-only Planning workspace content and interactions. */
export interface PlanningDataSource {
    tools(): Promise<PlanningTool[]>;
    summaries(): Promise<Record<PlanningPeriodKey, PlanningPeriodSummary>>;
    goals(): Promise<PlanningGoal[]>;
    addGoal(name: string, target: number): Promise<PlanningGoal>;
    contribute(goalId: string, amount: number): Promise<PlanningGoal | null>;
    insightCategories(): Promise<PlanningInsightCategory[]>;
    monthlyPlan(): Promise<{ allocations: PlanningAllocation[]; income: number }>;
    cashFlow(): Promise<{
        movements: PlanningCashMovement[];
        series: PlanningCashFlowSeries;
    }>;
    plannedExpenses(): Promise<PlannedExpense[]>;
    addPlannedExpense(name: string, amount: number): Promise<PlannedExpense>;
}
