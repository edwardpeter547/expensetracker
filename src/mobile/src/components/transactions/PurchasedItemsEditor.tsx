/**
 * Manually maintained purchased items editor.
 *
 * Money calculations use the safe itemization helpers so totals do not pass
 * through floating point arithmetic.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { formatMoney } from '@/localization/format';
import type { PurchasedItem } from '@/types/transaction';
import {
    calculateItemTotal,
    isValidQuantity,
    isValidUnitPrice,
    reconcileItemization,
} from '@/utils/itemization';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the purchased items editor. */
export interface PurchasedItemsEditorProps {
    items: PurchasedItem[];
    transactionAmount: string | number;
    language: string;
    currency: string;
    onChange: (items: PurchasedItem[]) => void;
}

/**
 * Render the purchased items editor.
 *
 * @param {PurchasedItemsEditorProps} props Component props.
 * @returns {JSX.Element} The items editor.
 */
const PurchasedItemsEditor = ({
    items,
    transactionAmount,
    language,
    currency,
    onChange,
}: PurchasedItemsEditorProps) => {
    const { t } = useTranslation('transactions');
    const [expanded, setExpanded] = useState(true);

    const updateItem = (id: string, patch: Partial<PurchasedItem>) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const removeItem = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const addItem = () => {
        onChange([
            ...items,
            { id: `item-${Date.now()}`, name: '', quantity: '1', unitPrice: '' },
        ]);
    };

    const reconciliation = reconcileItemization(transactionAmount, items);

    return (
        <View style={styles.section}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Toggle purchased items')}
                onPress={() => setExpanded((current) => !current)}
                style={styles.toggle}
            >
                <Text style={styles.title}>{t('Purchased Items')}</Text>
                <Text style={styles.toggleText}>{expanded ? t('Hide') : t('Show')}</Text>
            </Pressable>

            {expanded ? (
                <>
                    {items.length === 0 ? (
                        <Text style={styles.empty}>{t('No purchased items recorded.')}</Text>
                    ) : (
                        items.map((item) => (
                            <View key={item.id} style={styles.item}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemTitle}>{t('Item')}</Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={t('Remove {{name}}', {name: item.name || t('Item')})}
                                        onPress={() => removeItem(item.id)}
                                        hitSlop={6}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={C.error} />
                                    </Pressable>
                                </View>
                                <TextInput
                                    value={item.name}
                                    onChangeText={(value) => updateItem(item.id, { name: value })}
                                    placeholder={t('Item name')}
                                    placeholderTextColor={C.muted}
                                    style={styles.input}
                                />
                                <View style={styles.itemRow}>
                                    <TextInput
                                        keyboardType="number-pad"
                                        value={item.quantity}
                                        onChangeText={(value) => updateItem(item.id, { quantity: value })}
                                        placeholder={t('Qty')}
                                        placeholderTextColor={C.muted}
                                        style={[styles.input, styles.quantity]}
                                    />
                                    <TextInput
                                        keyboardType="decimal-pad"
                                        value={item.unitPrice}
                                        onChangeText={(value) => updateItem(item.id, { unitPrice: value })}
                                        placeholder={t('Unit price')}
                                        placeholderTextColor={C.muted}
                                        style={[styles.input, styles.price]}
                                    />
                                    <Text style={styles.total}>
                                        {formatMoney(
                                            isValidQuantity(item.quantity)
                                                && isValidUnitPrice(item.unitPrice)
                                                ? calculateItemTotal(item.quantity, item.unitPrice)
                                                : '0',
                                            language,
                                            currency,
                                        )}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Add Item')}
                        onPress={addItem}
                        style={styles.addItem}
                    >
                        <Ionicons name="add" size={18} color={C.green} />
                        <Text style={styles.addItemText}>{t('Add Item')}</Text>
                    </Pressable>

                    <View style={styles.reconciliation}>
                        <View style={styles.reconciliationRow}>
                            <Text style={styles.reconciliationLabel}>{t('Item subtotal')}</Text>
                            <Text style={styles.reconciliationValue}>
                                {formatMoney(reconciliation.subtotal, language, currency)}
                            </Text>
                        </View>
                        <View style={styles.reconciliationRow}>
                            <Text style={styles.reconciliationLabel}>{t('Difference')}</Text>
                            <Text style={styles.reconciliationValue}>
                                {formatMoney(reconciliation.difference, language, currency)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.hint}>
                        {t('Changing items does not automatically change the transaction amount.')}
                    </Text>
                </>
            ) : null}
        </View>
    );
};

/** Purchased items editor styles. */
const styles = StyleSheet.create({
    section: {
        marginTop: 18,
    },
    toggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    title: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '700',
        color: C.green,
    },
    empty: {
        fontSize: 13,
        color: C.muted,
        paddingVertical: 10,
    },
    item: {
        padding: 12,
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.white,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    itemTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: C.ink,
    },
    input: {
        height: 46,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 11,
        paddingHorizontal: 12,
        fontSize: 15,
        color: C.ink,
        backgroundColor: C.background,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    quantity: {
        width: 68,
    },
    price: {
        flex: 1,
    },
    total: {
        width: 92,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '700',
        color: C.ink,
    },
    addItem: {
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.green,
    },
    addItemText: {
        color: C.green,
        fontSize: 14,
        fontWeight: '700',
    },
    reconciliation: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        backgroundColor: C.pale,
    },
    reconciliationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    reconciliationLabel: {
        fontSize: 13,
        color: C.muted,
    },
    reconciliationValue: {
        fontSize: 13,
        fontWeight: '700',
        color: C.ink,
    },
    hint: {
        fontSize: 11,
        lineHeight: 16,
        color: C.muted,
        marginTop: 8,
    },
});

export default PurchasedItemsEditor;
