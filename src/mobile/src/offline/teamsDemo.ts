/**
 * Demonstration fixtures and in-memory stores for the Teams workspace.
 *
 * Teams have no backend model or endpoints yet, so this module mirrors the
 * existing demo-data convention used by `planningDemo.ts` and
 * `transactionsDemo.ts`: the single `DEMO_MODE` switch in `dashboardDemo.ts`
 * remains the source of truth, and these mutable stores support in-memory
 * interactions without claiming persistence, delivery, or authorization.
 */

import type {
    FinanceMode,
    InvitationStatus,
    Team,
    TeamActivity,
    TeamChatMessage,
    TeamExpense,
    TeamInvitation,
    TeamKind,
    TeamMember,
    TeamPlannedRequest,
    TeamRole,
} from '@/types/team';

/** Stable seeded teams used for visual preview. */
export const SEED_TEAMS: Team[] = [
    {
        id: 'family',
        name: 'Family Finance',
        kind: 'Family',
        mode: 'POOLED',
        memberCount: 4,
        budgetTarget: 3500,
        spent: 2180,
    },
    {
        id: 'holiday',
        name: 'Holiday Group',
        kind: 'Travel',
        mode: 'INDEPENDENT',
        memberCount: 6,
        budgetTarget: 2200,
        spent: 880,
    },
];

/** Demo members for the seeded teams. */
const SEED_MEMBERS: TeamMember[] = [
    { id: 'me', teamId: 'family', name: 'You', role: 'Owner' },
    { id: 'sarah', teamId: 'family', name: 'Sarah', role: 'Admin' },
    { id: 'michael', teamId: 'family', name: 'Michael', role: 'Member' },
    { id: 'grace', teamId: 'family', name: 'Grace', role: 'Member' },
    { id: 'me-holiday', teamId: 'holiday', name: 'You', role: 'Owner' },
    { id: 'sarah-holiday', teamId: 'holiday', name: 'Sarah', role: 'Member' },
    { id: 'dan', teamId: 'holiday', name: 'Dan', role: 'Member' },
    { id: 'priya', teamId: 'holiday', name: 'Priya', role: 'Member' },
    { id: 'leo', teamId: 'holiday', name: 'Leo', role: 'Member' },
    { id: 'nadia', teamId: 'holiday', name: 'Nadia', role: 'Member' },
];

/** Demo invitations for the seeded family team. */
const SEED_INVITATIONS: TeamInvitation[] = [
    {
        id: 'invite-sarah',
        teamId: 'family',
        contact: 'sarah@example.com',
        method: 'Email',
        role: 'Member',
        status: 'Pending',
    },
];

/** Demo pooled planned-expense requests. */
const SEED_REQUESTS: TeamPlannedRequest[] = [
    {
        id: 'request-washer',
        teamId: 'family',
        name: 'New Washing Machine',
        description: 'Replace the broken machine in the utility room.',
        requesterId: 'sarah',
        requesterName: 'Sarah',
        estimatedAmount: 650,
        status: 'Approved',
        plannedDate: '2026-11-12',
        createdAt: '2026-11-01T09:00:00.000Z',
        decidedAt: '2026-11-01T10:30:00.000Z',
        approverName: 'You',
    },
    {
        id: 'request-groceries',
        teamId: 'family',
        name: 'Family Groceries',
        description: 'Weekly shop for the house.',
        requesterId: 'michael',
        requesterName: 'Michael',
        estimatedAmount: 180,
        status: 'Pending',
        plannedDate: '2026-11-08',
        createdAt: '2026-11-01T11:00:00.000Z',
    },
    {
        id: 'request-router',
        teamId: 'family',
        name: 'Internet Router',
        description: 'Replacement router for the shared connection.',
        requesterId: 'me',
        requesterName: 'You',
        estimatedAmount: 95,
        actualAmount: 89,
        status: 'Completed',
        plannedDate: '2026-10-28',
        createdAt: '2026-10-28T08:00:00.000Z',
        completedAt: '2026-10-28T18:00:00.000Z',
        approverName: 'Sarah',
    },
];

/** Demo team expenses for the seeded teams. */
const SEED_EXPENSES: TeamExpense[] = [
    { id: 'expense-groceries', teamId: 'family', name: 'Groceries', amount: 85, paidBy: 'Sarah', date: '2026-11-01T10:00:00.000Z', category: 'Food' },
    { id: 'expense-electricity', teamId: 'family', name: 'Electricity', amount: 120, paidBy: 'You', date: '2026-11-01T09:00:00.000Z', category: 'Bills' },
    { id: 'expense-internet', teamId: 'family', name: 'Internet', amount: 42, paidBy: 'Michael', date: '2026-11-01T09:30:00.000Z', category: 'Bills' },
    { id: 'expense-holiday-food', teamId: 'holiday', name: 'Groceries', amount: 300, paidBy: 'You', date: '2026-11-01T12:00:00.000Z', category: 'Food' },
    { id: 'expense-holiday-fuel', teamId: 'holiday', name: 'Petrol', amount: 180, paidBy: 'Sarah', date: '2026-11-01T13:00:00.000Z', category: 'Transport' },
];

/** Demo group messages for the seeded family team. */
const SEED_MESSAGES: TeamChatMessage[] = [
    { id: 'msg-1', teamId: 'family', by: 'Sarah', message: "I've added yesterday's groceries.", mine: false, createdAt: '2026-11-01T09:00:00.000Z' },
    { id: 'msg-2', teamId: 'family', by: 'You', message: 'Thanks! I can see the receipt.', mine: true, createdAt: '2026-11-01T09:05:00.000Z' },
    { id: 'msg-3', teamId: 'family', by: 'Michael', message: 'Shall we increase the holiday budget?', mine: false, createdAt: '2026-11-01T09:10:00.000Z' },
];

/** Demo activity entries for the seeded family team. */
const SEED_ACTIVITY: TeamActivity[] = [
    { id: 'activity-1', teamId: 'family', title: 'Sarah recorded groceries', detail: 'Shared Expenses · £85', icon: 'receipt-text-outline', createdAt: '2026-11-01T09:00:00.000Z' },
    { id: 'activity-2', teamId: 'family', title: 'Request approved', detail: 'Planned Expenses · New Washing Machine', icon: 'clipboard-check-outline', createdAt: '2026-11-01T10:30:00.000Z' },
    { id: 'activity-3', teamId: 'family', title: 'Michael submitted a request', detail: 'Planned Expenses · Family Groceries', icon: 'clock-outline', createdAt: '2026-11-01T11:00:00.000Z' },
];

/** Mutable team store. */
let demoTeams: Team[] = [...SEED_TEAMS];
/** Mutable member store. */
let demoMembers: TeamMember[] = [...SEED_MEMBERS];
/** Mutable invitation store. */
let demoInvitations: TeamInvitation[] = [...SEED_INVITATIONS];
/** Mutable pooled-request store. */
let demoRequests: TeamPlannedRequest[] = [...SEED_REQUESTS];
/** Mutable expense store. */
let demoExpenses: TeamExpense[] = [...SEED_EXPENSES];
/** Mutable message store. */
let demoMessages: TeamChatMessage[] = [...SEED_MESSAGES];
/** Mutable activity store. */
let demoActivity: TeamActivity[] = [...SEED_ACTIVITY];

/**
 * Return every demo team.
 *
 * @returns {Team[]} The current in-memory teams.
 */
export const getDemoTeams = (): Team[] => demoTeams;

/**
 * Return one demo team by id.
 *
 * @param {string} id The stable team id.
 * @returns {Team|undefined} The matching team.
 */
export const getDemoTeam = (id: string): Team | undefined =>
    demoTeams.find((team) => team.id === id);

/**
 * Create a demo team in memory and seed its owner membership.
 *
 * @param {{name: string, kind: TeamKind, mode: FinanceMode}} input Team fields.
 * @returns {Team} The created team.
 */
export const createDemoTeam = (input: {
    name: string;
    kind: TeamKind;
    mode: FinanceMode;
}): Team => {
    const team: Team = {
        id: `demo-team-${Date.now()}`,
        name: input.name.trim(),
        kind: input.kind,
        mode: input.mode,
        memberCount: 1,
        budgetTarget: 0,
        spent: 0,
    };
    demoTeams = [...demoTeams, team];
    demoMembers = [...demoMembers, { id: `me-${team.id}`, teamId: team.id, name: 'You', role: 'Owner' }];
    return team;
};

/**
 * Return the demo members of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamMember[]} The scoped members.
 */
export const getDemoMembers = (teamId: string): TeamMember[] =>
    demoMembers.filter((member) => member.teamId === teamId);

/**
 * Return the demo invitations of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamInvitation[]} The scoped invitations.
 */
export const getDemoInvitations = (teamId: string): TeamInvitation[] =>
    demoInvitations.filter((invitation) => invitation.teamId === teamId);

/**
 * Append a demo invitation without delivering anything.
 *
 * @param {{teamId: string, contact: string, method: 'Phone'|'Email', role: Exclude<TeamRole, 'Owner'>}} input Invitation fields.
 * @returns {TeamInvitation} The created pending invitation.
 */
export const addDemoInvitation = (input: {
    teamId: string;
    contact: string;
    method: 'Phone' | 'Email';
    role: Exclude<TeamRole, 'Owner'>;
}): TeamInvitation => {
    const invitation: TeamInvitation = {
        id: `demo-invite-${Date.now()}`,
        teamId: input.teamId,
        contact: input.contact.trim(),
        method: input.method,
        role: input.role,
        status: 'Pending',
    };
    demoInvitations = [invitation, ...demoInvitations];
    return invitation;
};

/**
 * Update a demo invitation status in place.
 *
 * @param {string} id The invitation id.
 * @param {InvitationStatus} status The next status.
 * @returns {TeamInvitation|null} The updated invitation, or null when missing.
 */
export const updateDemoInvitation = (
    id: string,
    status: InvitationStatus,
): TeamInvitation | null => {
    let updated: TeamInvitation | null = null;
    demoInvitations = demoInvitations.map((invitation) => {
        if (invitation.id !== id) return invitation;
        updated = { ...invitation, status };
        return updated;
    });
    return updated;
};

/**
 * Return the demo planned requests of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamPlannedRequest[]} The scoped requests.
 */
export const getDemoPlannedRequests = (teamId: string): TeamPlannedRequest[] =>
    demoRequests.filter((request) => request.teamId === teamId);

/**
 * Return one demo planned request by id.
 *
 * @param {string} id The request id.
 * @returns {TeamPlannedRequest|undefined} The matching request.
 */
export const getDemoPlannedRequest = (id: string): TeamPlannedRequest | undefined =>
    demoRequests.find((request) => request.id === id);

/**
 * Append a demo pooled planned-expense request.
 *
 * Submitting a request never spends team money.
 *
 * @param {{teamId: string, name: string, description?: string, estimatedAmount: number, plannedDate?: string}} input Request fields.
 * @returns {TeamPlannedRequest} The created pending request.
 */
export const addDemoPlannedRequest = (input: {
    teamId: string;
    name: string;
    description?: string;
    estimatedAmount: number;
    plannedDate?: string;
}): TeamPlannedRequest => {
    const request: TeamPlannedRequest = {
        id: `demo-request-${Date.now()}`,
        teamId: input.teamId,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        requesterId: 'me',
        requesterName: 'You',
        estimatedAmount: input.estimatedAmount,
        status: 'Pending',
        plannedDate: input.plannedDate,
        createdAt: new Date().toISOString(),
    };
    demoRequests = [request, ...demoRequests];
    return request;
};

/**
 * Advance a demo pooled request through its authorized lifecycle.
 *
 * Approval never creates an expense or changes spending. Completion is
 * guarded by the current status so a retry cannot create a duplicate expense.
 *
 * @param {string} id The request id.
 * @param {'Approved'|'Rejected'} action Approve or reject a pending request.
 * @returns {TeamPlannedRequest|null} The updated request, or null when the
 *   transition is not allowed.
 */
export const decideDemoPlannedRequest = (
    id: string,
    action: 'Approved' | 'Rejected',
): TeamPlannedRequest | null => {
    let updated: TeamPlannedRequest | null = null;
    demoRequests = demoRequests.map((request) => {
        if (request.id !== id || request.status !== 'Pending') return request;
        updated = {
            ...request,
            status: action,
            decidedAt: new Date().toISOString(),
            approverName: 'You',
        };
        return updated;
    });
    return updated;
};

/**
 * Complete an approved demo request exactly once.
 *
 * @param {string} id The approved request id.
 * @param {number} actualAmount The positive actual amount spent.
 * @returns {{request: TeamPlannedRequest, expense: TeamExpense}|null} The
 *   updated request and its linked expense, or null when the transition is
 *   not allowed.
 */
export const completeDemoPlannedRequest = (
    id: string,
    actualAmount: number,
): { request: TeamPlannedRequest; expense: TeamExpense } | null => {
    const target = demoRequests.find((request) => request.id === id);
    if (!target || target.status !== 'Approved' || !Number.isFinite(actualAmount) || actualAmount <= 0) {
        return null;
    }

    const completedAt = new Date().toISOString();
    const request: TeamPlannedRequest = {
        ...target,
        status: 'Completed',
        actualAmount,
        completedAt,
    };
    demoRequests = demoRequests.map((item) => (item.id === id ? request : item));

    const expense: TeamExpense = {
        id: `demo-expense-${Date.now()}`,
        teamId: target.teamId,
        name: target.name,
        amount: actualAmount,
        paidBy: target.requesterName,
        date: completedAt,
        category: 'Team Purchase',
        requestId: target.id,
    };
    demoExpenses = [expense, ...demoExpenses];
    demoActivity = [
        {
            id: `demo-activity-${Date.now()}`,
            teamId: target.teamId,
            title: `${target.requesterName} completed an approved expense`,
            detail: `Planned Expenses · ${target.name}`,
            icon: 'check-circle-outline',
            createdAt: completedAt,
        },
        ...demoActivity,
    ];

    return { request, expense };
};

/**
 * Return the demo expenses of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamExpense[]} The scoped expenses.
 */
export const getDemoTeamExpenses = (teamId: string): TeamExpense[] =>
    demoExpenses.filter((expense) => expense.teamId === teamId);

/**
 * Append a demo team expense without touching the backend.
 *
 * @param {{teamId: string, name: string, amount: number, paidBy: string, date: string, category?: string, receiptId?: string, items?: TeamExpense['items']}} input Expense fields.
 * @returns {TeamExpense} The created expense.
 */
export const addDemoTeamExpense = (input: {
    teamId: string;
    name: string;
    amount: number;
    paidBy: string;
    date: string;
    category?: string;
    receiptId?: string;
    items?: TeamExpense['items'];
}): TeamExpense => {
    const expense: TeamExpense = {
        id: `demo-expense-${Date.now()}`,
        teamId: input.teamId,
        name: input.name.trim(),
        amount: input.amount,
        paidBy: input.paidBy,
        date: input.date,
        category: input.category,
        receiptId: input.receiptId,
        items: input.items,
    };
    demoExpenses = [expense, ...demoExpenses];
    demoActivity = [
        {
            id: `demo-activity-${Date.now()}`,
            teamId: input.teamId,
            title: `${input.paidBy} recorded an expense`,
            detail: `Shared Expenses · ${expense.name}`,
            icon: 'receipt-text-outline',
            createdAt: input.date,
        },
        ...demoActivity,
    ];
    return expense;
};

/**
 * Return the demo messages of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamChatMessage[]} The scoped messages.
 */
export const getDemoTeamMessages = (teamId: string): TeamChatMessage[] =>
    demoMessages.filter((message) => message.teamId === teamId);

/**
 * Append a demo chat message without sending anything.
 *
 * @param {string} teamId The stable team id.
 * @param {string} message The message text.
 * @returns {TeamChatMessage} The created local message.
 */
export const addDemoTeamMessage = (teamId: string, message: string): TeamChatMessage => {
    const next: TeamChatMessage = {
        id: `demo-message-${Date.now()}`,
        teamId,
        by: 'You',
        message: message.trim(),
        mine: true,
        createdAt: new Date().toISOString(),
    };
    demoMessages = [...demoMessages, next];
    return next;
};

/**
 * Return the demo activity of one team.
 *
 * @param {string} teamId The stable team id.
 * @returns {TeamActivity[]} The scoped activity entries.
 */
export const getDemoTeamActivity = (teamId: string): TeamActivity[] =>
    demoActivity.filter((entry) => entry.teamId === teamId);

/**
 * Reset all demo team stores back to their fixtures.
 *
 * @returns {void}
 */
export const resetDemoTeams = (): void => {
    demoTeams = [...SEED_TEAMS];
    demoMembers = [...SEED_MEMBERS];
    demoInvitations = [...SEED_INVITATIONS];
    demoRequests = [...SEED_REQUESTS];
    demoExpenses = [...SEED_EXPENSES];
    demoMessages = [...SEED_MESSAGES];
    demoActivity = [...SEED_ACTIVITY];
};
