/**
 * Recurring Transactions shortcut shown above the Transactions filters.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the recurring shortcut. */
export interface RecurringShortcutProps {
    onPress: () => void;
}

/**
 * Render the recurring transactions shortcut card.
 *
 * @param {RecurringShortcutProps} props Component props.
 * @returns {JSX.Element} The shortcut card.
 */
const RecurringShortcut = ({ onPress }: RecurringShortcutProps) => {
    const { t } = useTranslation('transactions');

    return (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Recurring Transactions')}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
        <View style={styles.iconWrap}>
            <Ionicons name="repeat-outline" size={22} color={C.green} />
        </View>
        <View style={styles.copy}>
            <Text style={styles.title}>{t('Recurring Transactions')}</Text>
            <Text style={styles.subtitle}>{t('Manage salary, rent and subscriptions')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={C.muted} />
    </Pressable>
    );
};

/** Shortcut styles. */
const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 20,
        marginTop: 14,
        paddingHorizontal: 13,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.cardBorder,
        backgroundColor: C.white,
    },
    cardPressed: {
        backgroundColor: C.pale,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: T.transactionTitle,
        fontWeight: T.transactionTitleWeight,
        color: C.ink,
    },
    subtitle: {
        fontSize: 12,
        color: C.muted,
        marginTop: 3,
    },
});

export default RecurringShortcut;
