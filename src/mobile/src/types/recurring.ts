/**
 * UI-only view models for the Recurring Transactions experience.
 *
 * These types describe presentation and navigation state only. No scheduling
 * engine, backend persistence, or financial calculation is implied.
 */

/** A recurring schedule's direction. */
export type RecurringType = 'INCOME' | 'EXPENSE';

/** Supported display frequencies. */
export type RecurringFrequency =
    | 'WEEKLY'
    | 'BIWEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'YEARLY';

/** A schedule's lifecycle status. */
export type RecurringStatus =
    | 'ACTIVE'
    | 'PAUSED'
    | 'AWAITING_CONFIRMATION'
    | 'CANCELED'
    | 'COMPLETED';

/** End conditions offered by the form. */
export type RecurringEndCondition =
    | 'UNTIL_CANCELED'
    | 'ON_DATE'
    | 'AFTER_OCCURRENCES';

/** Recording preference offered by the form. */
export type RecurringRecordingPreference = 'REQUIRE_CONFIRMATION' | 'AUTO_RECORD';

/** Amount entry mode. */
export type RecurringAmountMode = 'FIXED' | 'VARIABLE';

/** One recurring schedule fixture/record. */
export interface RecurringSchedule {
    id: string;
    name: string;
    type: RecurringType;
    amount: string | null;
    estimatedAmount?: string | null;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    frequency: RecurringFrequency;
    startDate: string;
    repeatDay: string;
    repeatOn?: string;
    endCondition: RecurringEndCondition;
    endDate?: string | null;
    endOccurrences?: number | null;
    recordingPreference: RecurringRecordingPreference;
    budgetId?: string | null;
    budgetName?: string | null;
    description?: string | null;
    status: RecurringStatus;
    nextDate: string;
}

/** Editable recurring form draft. */
export interface RecurringDraft {
    type: RecurringType;
    name: string;
    amountMode: RecurringAmountMode;
    amount: string;
    estimatedAmount: string;
    categoryId: string;
    frequency: RecurringFrequency;
    startDate: string;
    repeatDay: string;
    endCondition: RecurringEndCondition;
    endDate: string;
    endOccurrences: string;
    recordingPreference: RecurringRecordingPreference;
    budgetId: string | null;
    description: string;
}

/** Due-confirmation presentation state. */
export interface RecurringConfirmationState {
    scheduleId: string;
    prompt: string;
    actualAmount: string;
}
