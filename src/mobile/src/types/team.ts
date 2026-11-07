/**
 * Domain types for the Teams workspace.
 *
 * Teams are the collaborative-finance destination of the app. There is no
 * team backend yet, so every value below is presentation/demo data that the
 * UI renders from the in-memory store in `src/constants/teamsDemo.ts`. Stable
 * `teamId` values are used for routing and scoping rather than display names.
 */

import type { PurchasedItem } from '@/types/transaction';

/** How a team manages money together. */
export type FinanceMode = 'POOLED' | 'INDEPENDENT';

/** The four supported team types. */
export type TeamKind = 'Family' | 'Couple' | 'Travel' | 'Other';

/** The three member roles. */
export type TeamRole = 'Owner' | 'Admin' | 'Member';

/** Lifecycle state of a team workspace. */
export type TeamStatus = 'active' | 'archived';

/** Lifecycle states for a pooled planned-expense request. */
export type TeamRequestStatus =
    | 'Pending'
    | 'Approved'
    | 'Completed'
    | 'Rejected'
    | 'Canceled';

/** Lifecycle states for a team invitation. */
export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Expired';

/** A team workspace. */
export interface Team {
    /** Stable identifier used in every route and data lookup. */
    id: string;
    name: string;
    kind: TeamKind;
    mode: FinanceMode;
    /** Number of members shown on team cards. */
    memberCount: number;
    /** Pooled allocation or independent shared spending target. */
    budgetTarget: number;
    /** Recorded actual team spending. */
    spent: number;
    /** Lifecycle state. */
    status: TeamStatus;
    /** ISO timestamp when the team was archived, or null while active. */
    archivedAt?: string | null;
    /** ISO timestamp of the last metadata change. */
    updatedAt?: string | null;
}

/** A member of a specific team. */
export interface TeamMember {
    id: string;
    teamId: string;
    name: string;
    role: TeamRole;
}

/** A pending or resolved invitation sent by phone or email. */
export interface TeamInvitation {
    id: string;
    teamId: string;
    contact: string;
    method: 'Phone' | 'Email';
    role: Exclude<TeamRole, 'Owner'>;
    status: InvitationStatus;
}

/**
 * A pooled planned-expense request.
 *
 * `estimatedAmount` is a forecast. It never represents actual spending.
 * `actualAmount` is only set once a request is Completed.
 */
export interface TeamPlannedRequest {
    id: string;
    teamId: string;
    name: string;
    description?: string;
    requesterId: string;
    requesterName: string;
    estimatedAmount: number;
    actualAmount?: number;
    status: TeamRequestStatus;
    plannedDate?: string;
    createdAt: string;
    decidedAt?: string;
    completedAt?: string;
    approverName?: string;
}

/** A team-scoped actual expense. */
export interface TeamExpense {
    id: string;
    teamId: string;
    name: string;
    amount: number;
    paidBy: string;
    date: string;
    category?: string;
    /** Receipt metadata link when an attachment was added. */
    receiptId?: string;
    /** Backlink to the request that completed into this expense, when any. */
    requestId?: string;
    /** Optional itemized purchases. */
    items?: PurchasedItem[];
}

/** A group-scoped chat message. */
export interface TeamChatMessage {
    id: string;
    teamId: string;
    by: string;
    message: string;
    /** Presentation-only flag for the signed-in user's own messages. */
    mine: boolean;
    createdAt: string;
}

/** An auditable team activity entry. */
export interface TeamActivity {
    id: string;
    teamId: string;
    title: string;
    detail: string;
    icon: string;
    createdAt: string;
}
