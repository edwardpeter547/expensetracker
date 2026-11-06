/**
 * Data-source factory.
 *
 * This is the single place that decides between demo and API-backed
 * implementations. Consumers import the resolved sources (or `isDemoMode`)
 * from here rather than checking a demo flag themselves.
 */

import { DEMO_MODE } from '@/offline/dashboardDemo';
import {
    apiBudgetDataSource,
    apiCategoryDataSource,
    apiDashboardDataSource,
    apiMembershipDataSource,
    apiPlanningBudgetDataSource,
    apiPlanningDataSource,
    apiRecurringDataSource,
    apiTeamDataSource,
    apiTransactionDataSource,
} from './apiDataSources';
import {
    demoBudgetDataSource,
    demoCategoryDataSource,
    demoDashboardDataSource,
    demoMembershipDataSource,
    demoPlanningBudgetDataSource,
    demoPlanningDataSource,
    demoRecurringDataSource,
    demoTeamDataSource,
    demoTransactionDataSource,
} from '@/offline/demoDataSources';

/** True when the app is running against in-memory demo data. */
export const isDemoMode = DEMO_MODE;

/** Resolved dashboard data source. */
export const dashboardDataSource = isDemoMode
    ? demoDashboardDataSource
    : apiDashboardDataSource;

/** Resolved transaction data source. */
export const transactionDataSource = isDemoMode
    ? demoTransactionDataSource
    : apiTransactionDataSource;

/** Resolved category data source. */
export const categoryDataSource = isDemoMode
    ? demoCategoryDataSource
    : apiCategoryDataSource;

/** Resolved raw-budget data source. */
export const budgetDataSource = isDemoMode
    ? demoBudgetDataSource
    : apiBudgetDataSource;

/** Resolved Planning-budget data source. */
export const planningBudgetDataSource = isDemoMode
    ? demoPlanningBudgetDataSource
    : apiPlanningBudgetDataSource;

/** Resolved membership data source. */
export const membershipDataSource = isDemoMode
    ? demoMembershipDataSource
    : apiMembershipDataSource;

/** Resolved team data source. */
export const teamDataSource = isDemoMode ? demoTeamDataSource : apiTeamDataSource;

/** Resolved recurring-transaction data source. */
export const recurringDataSource = isDemoMode
    ? demoRecurringDataSource
    : apiRecurringDataSource;

/** Resolved Planning workspace data source. */
export const planningDataSource = isDemoMode
    ? demoPlanningDataSource
    : apiPlanningDataSource;
