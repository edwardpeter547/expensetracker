/**
 * Due-confirmation presentation for a recurring schedule.
 *
 * UI-only: Confirm Payment/Confirm receipt do not create transactions or
 * change balances.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { RecurringSchedule } from '@/types/recurring';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const C = transactionColors;
const T = transactionTypography;

/** Props for the confirmation card. */
export interface RecurringConfirmationCardProps {
    schedule: RecurringSchedule;
    actualAmount: string;
    onActualAmountChange: (value: string) => void;
    onConfirm: () => void;
    onEditActual: () => void;
    onNotYet: () => void;
}

/**
 * Render the due-confirmation card.
 *
 * @param {RecurringConfirmationCardProps} props Component props.
 * @returns {JSX.Element} The confirmation card.
 */
const RecurringConfirmationCard = ({
    schedule,
    actualAmount,
    onActualAmountChange,
    onConfirm,
    onEditActual,
    onNotYet,
}: RecurringConfirmationCardProps) => {
    const isIncome = schedule.type === 'INCOME';

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="help-circle-outline" size={22} color={C.green} />
                </View>
                <Text style={styles.title}>
                    {isIncome ? 'Have you received this payment?' : 'Have you made this payment?'}
                </Text>
            </View>

            <Text style={styles.hint}>
                Confirm the actual amount before it is recorded as a completed
                transaction.
            </Text>

            <Text style={styles.label}>Actual amount</Text>
            <View style={styles.amountRow}>
                <TextInput
                    keyboardType="decimal-pad"
                    value={actualAmount}
                    onChangeText={onActualAmountChange}
                    placeholder="0.00"
                    placeholderTextColor={C.muted}
                    style={styles.amountInput}
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit actual amount"
                    onPress={onEditActual}
                    hitSlop={6}
                >
                    <Ionicons name="create-outline" size={20} color={C.green} />
                </Pressable>
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={isIncome ? 'Confirm Payment' : 'Confirm Payment'}
                onPress={onConfirm}
                style={styles.confirm}
            >
                <Text style={styles.confirmText}>Confirm Payment</Text>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not Yet / Remind Later"
                onPress={onNotYet}
                style={styles.later}
            >
                <Text style={styles.laterText}>Not Yet / Remind Later</Text>
            </Pressable>
        </View>
    );
};

/** Confirmation card styles. */
const styles = StyleSheet.create({
    card: {
        marginHorizontal: 22,
        marginTop: 14,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.cardBorder,
        backgroundColor: C.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: C.ink,
    },
    hint: {
        fontSize: 12,
        lineHeight: 17,
        color: C.muted,
        marginTop: 10,
    },
    label: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
        marginTop: 14,
        marginBottom: 7,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        paddingHorizontal: 13,
        backgroundColor: C.background,
    },
    amountInput: {
        flex: 1,
        height: 46,
        fontSize: 16,
        color: C.ink,
        padding: 0,
    },
    confirm: {
        height: 46,
        marginTop: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.green,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    later: {
        height: 44,
        marginTop: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    laterText: {
        color: C.muted,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RecurringConfirmationCard;
