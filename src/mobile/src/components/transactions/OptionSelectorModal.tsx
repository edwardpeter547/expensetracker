/**
 * Bottom-sheet option selector used by the Add Transaction form.
 *
 * It is deliberately generic so the same sheet can present categories and
 * budgets while keeping the approved row treatment (leading icon, label,
 * trailing check/chevron).
 */

import { Ionicons } from '@expo/vector-icons';
import type { SelectOption } from '@/components/transactions/TransactionsScreens';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const C = transactionColors;
const T = transactionTypography;

/** Props for the option selector sheet. */
export interface OptionSelectorModalProps {
    visible: boolean;
    title: string;
    options: SelectOption[];
    selectedId: string | null;
    onClose: () => void;
    onSelect: (id: string) => void;
}

/**
 * Render the option selector bottom sheet.
 *
 * @param {OptionSelectorModalProps} props Sheet props.
 * @returns {JSX.Element} The modal sheet.
 */
const OptionSelectorModal = ({
    visible,
    title,
    options,
    selectedId,
    onClose,
    onSelect,
}: OptionSelectorModalProps) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Close ${title}`}
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color={C.ink} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {options.map((option) => {
                            const selected = option.id === selectedId;
                            return (
                                <Pressable
                                    key={option.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={option.label}
                                    onPress={() => {
                                        onSelect(option.id);
                                        onClose();
                                    }}
                                    style={styles.optionRow}
                                >
                                    <View style={styles.optionIcon}>
                                        <Ionicons
                                            name={option.iconName || 'pricetag-outline'}
                                            size={19}
                                            color={C.chevron}
                                        />
                                    </View>
                                    <Text numberOfLines={1} style={styles.optionLabel}>
                                        {option.label}
                                    </Text>
                                    {selected ? (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={21}
                                            color="#0B7956"
                                        />
                                    ) : (
                                        <Ionicons
                                            name="chevron-forward"
                                            size={16}
                                            color={C.subtle}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                        {options.length === 0 ? (
                            <Text style={styles.empty}>No options available</Text>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

/** Selector sheet styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        maxHeight: '75%',
        backgroundColor: C.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 28,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: T.modalTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
    },
    optionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.pale,
    },
    optionLabel: {
        flex: 1,
        fontSize: T.option,
        color: C.ink,
    },
    empty: {
        color: C.muted,
        fontSize: T.selectValue,
        textAlign: 'center',
        paddingVertical: 24,
    },
});

export default OptionSelectorModal;
