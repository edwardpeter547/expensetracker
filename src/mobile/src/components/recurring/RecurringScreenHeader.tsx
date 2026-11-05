/**
 * Shared header for the recurring transaction screens.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const C = transactionColors;
const T = transactionTypography;

/** Props for the recurring screen header. */
export interface RecurringScreenHeaderProps {
    title: string;
    onBack: () => void;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
    rightAccessibilityLabel?: string;
}

/**
 * Render the recurring screen header.
 *
 * @param {RecurringScreenHeaderProps} props Component props.
 * @returns {JSX.Element} The header.
 */
const RecurringScreenHeader = ({
    title,
    onBack,
    rightIcon,
    onRightPress,
    rightAccessibilityLabel,
}: RecurringScreenHeaderProps) => (
    <View style={styles.header}>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.side}
        >
            <Ionicons name="chevron-back" size={23} color={C.ink} />
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
            {title}
        </Text>
        <View style={styles.side}>
            {rightIcon && onRightPress ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={rightAccessibilityLabel || 'Add'}
                    onPress={onRightPress}
                    style={styles.rightButton}
                >
                    <Ionicons name={rightIcon} size={22} color={C.green} />
                </Pressable>
            ) : null}
        </View>
    </View>
);

/** Header styles. */
const styles = StyleSheet.create({
    header: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
    },
    side: {
        width: 42,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: T.screenTitle,
        fontWeight: T.screenTitleWeight,
        letterSpacing: T.screenTitleLetterSpacing,
        color: C.ink,
    },
});

export default RecurringScreenHeader;
