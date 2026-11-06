/**
 * Supplied Dashboard V1.5 demonstration values.
 *
 * These figures ship with the approved UI handoff for visual previews only.
 * The authenticated dashboard derives real figures from the backend and never
 * renders this data for a signed-in user.
 */

import type { DashboardData } from '@/types/dashboard';
import type { MembershipSummary } from '@/types/membership';

/**
 * TEMPORARY preview switch.
 *
 * When true, the dashboard renders the supplied demonstration data instead of
 * calling the backend. This is for visual checking only and must be set back
 * to false before the work is considered production-ready.
 */
export const DEMO_MODE = true;

/** Demo dashboard view model from the approved V1.5 handoff. */
export const DEMO_DASHBOARD: DashboardData = {
    firstName: 'John',
    currency: 'USD',
    totalSpending: '1234.56',
    spendingChangePercent: 12,
    income: '3200',
    expenses: '1234',
    remaining: '1966',
    monthlySpending: '1234.56',
    spendingGoal: '1500',
    trend: [
        { month: 'May', income: '3000', expenses: '2800' },
        { month: 'Jun', income: '3200', expenses: '3100' },
        { month: 'Jul', income: '3000', expenses: '3400' },
        { month: 'Aug', income: '3400', expenses: '2900' },
        { month: 'Sep', income: '3100', expenses: '3800' },
        { month: 'Oct', income: '3600', expenses: '3300' },
    ],
    categories: [
        { name: 'Food', amount: '450', color: '#FF8B31' },
        { name: 'Transport', amount: '240', color: '#3296FB' },
        { name: 'Shopping', amount: '180', color: '#6478F6' },
        { name: 'Bills', amount: '150', color: '#A94BDE' },
        { name: 'Other', amount: '214', color: '#83B1FF' },
    ],
};

/**
 * Demo membership summary used only while `DEMO_MODE` is on.
 *
 * This is illustrative presentation data for visual checks; it is not backed
 * by a real billing or subscription record.
 */
export const DEMO_MEMBERSHIP: MembershipSummary = {
    tier: 'gold',
    displayName: 'Gold Member',
    benefits: [
        'Unlimited categories and budgets',
        'Advanced spending insights',
        'Priority support',
        'Multi-device sync',
    ],
    status: 'active',
    priceLabel: '$9.99',
    billingCycleLabel: 'month',
    renewalDateLabel: '1 Dec 2026',
    billingProviderLabel: 'Demo Billing',
};
