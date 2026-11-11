/**
 * Small status pill for recurring schedule lifecycle states.
 */

import {
    transactionColors,
} from '@/constants/transactionsTheme';
import type { RecurringStatus } from '@/types/recurring';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;

/** Status colors only; labels are localised at render time. */
const STATUS_STYLES: Record<RecurringStatus, { background: string; color: string }> = {
    ACTIVE: { background: '#E9F7F1', color: C.green },
    PAUSED: { background: '#F1F3F7', color: C.muted },
    AWAITING_CONFIRMATION: { background: '#FFF4E3', color: '#C07813' },
    CANCELED: { background: '#FCEAEA', color: C.error },
    COMPLETED: { background: '#EAF1FB', color: '#3973D6' },
};

/** English source strings for each recurring status. */
const STATUS_LABELS: Record<RecurringStatus, string> = {
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    AWAITING_CONFIRMATION: 'Awaiting confirmation',
    CANCELED: 'Canceled',
    COMPLETED: 'Completed',
};

/** Props for the status badge. */
export interface RecurringStatusBadgeProps {
    status: RecurringStatus;
}

/**
 * Render the schedule status pill.
 *
 * @param {RecurringStatusBadgeProps} props Component props.
 * @returns {JSX.Element} The status badge.
 */
const RecurringStatusBadge = ({ status }: RecurringStatusBadgeProps) => {
    const { t } = useTranslation('transactions');
    const style = STATUS_STYLES[status];

    return (
        <View style={[styles.badge, { backgroundColor: style.background }]}>
            <Text style={[styles.text, { color: style.color }]}>{t(STATUS_LABELS[status])}</Text>
        </View>
    );
};

/** Status badge styles. */
const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 10,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default RecurringStatusBadge;
