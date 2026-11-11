/**
 * Recurring schedule row used by the management list.
 */

import { Ionicons } from '@expo/vector-icons';
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { RecurringSchedule } from '@/types/recurring';
import { formatSignedAmount } from '@/utils/transactions';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the recurring schedule row. */
export interface RecurringScheduleListItemProps {
    schedule: RecurringSchedule;
    language: string;
    currency: string;
    onPress: () => void;
}

/**
 * Render one recurring schedule row.
 *
 * @param {RecurringScheduleListItemProps} props Component props.
 * @returns {JSX.Element} The schedule row.
 */
const RecurringScheduleListItem = ({
    schedule,
    language,
    currency,
    onPress,
}: RecurringScheduleListItemProps) => {
    const { t } = useTranslation('transactions');
    const amount = schedule.amount
        ? formatSignedAmount(schedule.amount, schedule.type, language, currency)
        : schedule.type === 'INCOME'
            ? t('Variable income')
            : t('Variable amount');
    const frequency = schedule.frequency === 'BIWEEKLY' ? t('Every two weeks') : t(schedule.repeatDay);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={schedule.name}
            onPress={onPress}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
            <View style={[styles.icon, schedule.type === 'INCOME' && styles.iconIncome]}>
                <Ionicons
                    name={schedule.categoryIcon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={schedule.type === 'INCOME' ? C.green : C.ink}
                />
            </View>

            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <Text numberOfLines={1} style={styles.name}>
                        {schedule.name}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.amount,
                            schedule.type === 'INCOME' && styles.amountIncome,
                        ]}
                    >
                        {amount}
                    </Text>
                </View>
                <Text numberOfLines={1} style={styles.meta}>
                    {schedule.categoryName} · {frequency}
                </Text>
                <View style={styles.footerRow}>
                    <Text style={styles.next}>{t('Next: {{date}}', {date: schedule.nextDate})}</Text>
                    <RecurringStatusBadge status={schedule.status} />
                </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
    );
};

/** Schedule row styles. */
const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 10,
        padding: 13,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.cardBorder,
        backgroundColor: C.white,
    },
    cardPressed: {
        backgroundColor: C.pale,
    },
    icon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF2F7',
    },
    iconIncome: {
        backgroundColor: '#E9F7F1',
    },
    body: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    name: {
        flex: 1,
        fontSize: T.transactionTitle,
        fontWeight: T.transactionTitleWeight,
        color: C.ink,
    },
    amount: {
        fontSize: T.amount,
        fontWeight: T.amountWeight,
        color: C.ink,
    },
    amountIncome: {
        color: C.income,
    },
    meta: {
        fontSize: 13,
        color: C.muted,
        marginTop: 4,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 8,
    },
    next: {
        flex: 1,
        fontSize: 12,
        color: C.subtle,
    },
});

export default RecurringScheduleListItem;
