/**
 * Empty state for the recurring transactions list.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;

/** Props for the recurring empty state. */
export interface RecurringEmptyStateProps {
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Render the recurring list empty state.
 *
 * @param {RecurringEmptyStateProps} props Component props.
 * @returns {JSX.Element} The empty state.
 */
const RecurringEmptyState = ({
    title,
    message,
    actionLabel,
    onAction,
}: RecurringEmptyStateProps) => {
    const { t } = useTranslation('transactions');
    const resolvedTitle = title ?? t('No recurring transactions yet');
    const resolvedMessage = message ?? t("Set up regular income, bills and subscriptions to keep track of what's coming up.");
    const resolvedActionLabel = actionLabel ?? t('Add Recurring Transaction');

    return (
        <View style={styles.container}>
            <View style={styles.iconWrap}>
                <Ionicons name="repeat-outline" size={32} color={C.green} />
            </View>
            <Text style={styles.title}>{resolvedTitle}</Text>
            <Text style={styles.message}>{resolvedMessage}</Text>
            {onAction ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={resolvedActionLabel}
                    onPress={onAction}
                    style={styles.action}
                >
                    <Text style={styles.actionText}>{resolvedActionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
};

/** Empty state styles. */
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 38,
    },
    iconWrap: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: C.ink,
        textAlign: 'center',
        marginTop: 16,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        color: C.muted,
        textAlign: 'center',
        marginTop: 8,
    },
    action: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: C.green,
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RecurringEmptyState;
