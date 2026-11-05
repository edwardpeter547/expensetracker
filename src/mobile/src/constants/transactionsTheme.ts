/**
 * Shared theme for the Transactions and Add Transaction surfaces.
 *
 * The screens were supplied with small prototype-scale type. This module gives
 * them a single source of truth for the approved colors and for a dashboard-
 * consistent typography scale, so screen headings, date groups, row copy, and
 * form labels stay cohesive with the rest of the app.
 */

/** Approved transaction-surface colors. */
export const transactionColors = {
    ink: '#12213B',
    muted: '#8795AC',
    subtle: '#94A1B4',
    background: '#F7FAFC',
    card: '#FFFFFF',
    cardBorder: '#E9EEF5',
    shadow: '#0B1F33',
    line: '#E4EAF2',
    divider: '#F5F6F9',
    green: '#198B62',
    greenBright: '#2CAF85',
    income: '#0C9C69',
    pale: '#F3F5F9',
    segmentInactive: '#52627F',
    label: '#364C6D',
    chevron: '#49627E',
    white: '#FFFFFF',
    error: '#C73535',
    errorBackground: '#FDF1F1',
} as const;

/**
 * Typography scale for the transaction surfaces.
 *
 * Values are deliberately larger and heavier than the supplied prototype so
 * the screens read with the same hierarchy as the approved dashboard.
 */
export const transactionTypography = {
    screenTitle: 24,
    screenTitleWeight: '800',
    screenTitleLetterSpacing: -0.4,
    dayTitle: 16,
    dayTitleWeight: '700',
    transactionTitle: 16,
    transactionTitleWeight: '700',
    transactionSubtitle: 14,
    amount: 16,
    amountWeight: '700',
    time: 12,
    segment: 14,
    segmentWeight: '600',
    fieldLabel: 14,
    fieldLabelWeight: '700',
    selectValue: 15,
    amountInput: 28,
    currency: 26,
    description: 15,
    saveButton: 16,
    saveButtonWeight: '700',
    validation: 13,
    hint: 12,
    modalTitle: 20,
    modalTitleWeight: '800',
    option: 16,
    weekday: 13,
    dayCell: 16,
    dayCellWeight: '800',
} as const;
