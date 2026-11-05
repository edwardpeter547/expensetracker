/**
 * Small status pill for recurring schedule lifecycle states.
 */

import {
    transactionColors,
} from '@/constants/transactionsTheme';
import type { RecurringStatus } from '@/types/recurring';
import { StyleSheet, Text, View } from 'react-native';

const C = transactionColors;

/** Status copy and colors. */
const STATUS_STYLES: Record<RecurringStatus, { label: string; background: string; color: string }> = {
    ACTIVE: { label: 'Active', background: '#E9F7F1', color: C.green },
    PAUSED: { label: 'Paused', background: '#F1F3F7', color: C.muted },
    AWAITING_CONFIRMATION: { label: 'Awaiting confirmation', background: '#FFF4E3', color: '#C07813' },
    CANCELED: { label: 'Canceled', background: '#FCEAEA', color: C.error },
    COMPLETED: { label: 'Completed', background: '#EAF1FB', color: '#3973D6' },
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
    const style = STATUS_STYLES[status];

    return (
        <View style={[styles.badge, { backgroundColor: style.background }]}>
            <Text style={[styles.text, { color: style.color }]}>{style.label}</Text>
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
