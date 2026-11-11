/**
 * Expense-mode receipt actions: Scan Receipt and Upload Receipt.
 *
 * UI-only entry points; the host supplies press handlers and owns any
 * resulting presentation state.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;

/** Props for the receipt action buttons. */
export interface ReceiptActionButtonsProps {
    onScan: () => void;
    onUpload: () => void;
}

/**
 * Render one receipt action card.
 *
 * @param {object} props Action card props.
 * @returns {JSX.Element} The action card.
 */
const ReceiptActionCard = ({
    icon,
    label,
    support,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    support: string;
    onPress: () => void;
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
        <View style={styles.iconWrap}>
            <Ionicons name={icon} size={21} color={C.green} />
        </View>
        <View style={styles.copy}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.support}>{support}</Text>
        </View>
    </Pressable>
);

/**
 * Render the two side-by-side receipt actions.
 *
 * @param {ReceiptActionButtonsProps} props Component props.
 * @returns {JSX.Element} The action row.
 */
const ReceiptActionButtons = ({ onScan, onUpload }: ReceiptActionButtonsProps) => {
    const { t } = useTranslation('transactions');

    return (
    <View style={styles.row}>
        <ReceiptActionCard
            icon="camera-outline"
            label={t('Scan Receipt')}
            support={t('Use camera')}
            onPress={onScan}
        />
        <ReceiptActionCard
            icon="cloud-upload-outline"
            label={t('Upload Receipt')}
            support={t('Browse files')}
            onPress={onUpload}
        />
    </View>
    );
};

/** Props for the manual-entry divider. */
export interface ReceiptManualEntryDividerProps {
    label?: string;
}

/**
 * Render the approved OR ENTER MANUALLY divider.
 *
 * @param {ReceiptManualEntryDividerProps} props Component props.
 * @returns {JSX.Element} The divider.
 */
export const ReceiptManualEntryDivider = ({
    label,
}: ReceiptManualEntryDividerProps) => {
    const { t } = useTranslation('transactions');
    const text = label ?? t('OR ENTER MANUALLY');

    return (
    <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{text}</Text>
        <View style={styles.dividerLine} />
    </View>
    );
};

/** Receipt action styles. */
const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 22,
        marginTop: 16,
    },
    card: {
        flex: 1,
        minHeight: 76,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 14,
        backgroundColor: C.white,
    },
    cardPressed: {
        backgroundColor: C.pale,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: C.ink,
    },
    support: {
        fontSize: 11,
        color: C.muted,
        marginTop: 3,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 22,
        marginTop: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.line,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: C.muted,
    },
});

export default ReceiptActionButtons;
