/**
 * Transaction Details screen.
 *
 * UI-first: demo mode reads and mutates the in-memory demo store; live mode
 * reads the existing transaction list and does not persist edits or deletion.
 */

import { Ionicons } from '@expo/vector-icons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import RecurringScreenHeader from '@/components/recurring/RecurringScreenHeader';
import { transactionDataSource } from '@/contracts';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { useLocale } from '@/contexts/LocaleContext';
import { formatMoney } from '@/localization/format';
import type { TransactionRecord } from '@/types/transaction';
import {
    calculateItemTotal,
    reconcileItemization,
} from '@/utils/itemization';
import { formatSignedAmount, transactionTitle } from '@/utils/transactions';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/**
 * Render one optional detail row.
 *
 * @param {object} props Row props.
 * @returns {JSX.Element} The detail row.
 */
const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

/**
 * Render the transaction details route.
 *
 * @returns {JSX.Element} The details screen.
 */
const TransactionDetailsRoute = () => {
    const insets = useSafeAreaInsets();
    const { language, currency } = useLocale();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [transaction, setTransaction] = useState<TransactionRecord | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const record = await transactionDataSource.get(id);
                if (active) setTransaction(record);
            } catch {
                if (active) setTransaction(null);
            }
            if (active) setLoading(false);
        };
        void load();
        return () => {
            active = false;
        };
    }, [id]);

    const confirmDelete = async () => {
        try {
            await transactionDataSource.remove(id);
        } catch (cause) {
            setDeleteNotice(
                cause instanceof Error
                    ? cause.message
                    : 'Deleting is UI-only and unavailable without demo mode.',
            );
            setDeleteOpen(false);
            return;
        }
        setDeleteOpen(false);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/transactions');
        }
    };

    if (loading) {
        return (
            <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={C.green} />
            </View>
        );
    }

    if (!transaction) {
        return (
            <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
                <RecurringScreenHeader title="Transaction Details" onBack={() => router.back()} />
                <View style={styles.center}>
                    <Text style={styles.notFound}>Transaction not found.</Text>
                </View>
            </View>
        );
    }

    const amount = formatSignedAmount(transaction.amount, transaction.transType, language, currency);
    const items = transaction.items ?? [];
    const reconciliation = items.length > 0 ? reconcileItemization(transaction.amount, items) : null;

    return (
        <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
            <RecurringScreenHeader title="Transaction Details" onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {deleteNotice ? (
                    <View style={styles.notice}>
                        <Text style={styles.noticeText}>{deleteNotice}</Text>
                    </View>
                ) : null}

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryType}>
                        {transaction.transType === 'INCOME' ? 'Income' : 'Expense'}
                    </Text>
                    <Text style={[styles.summaryAmount, transaction.transType === 'INCOME' && styles.income]}>
                        {amount}
                    </Text>
                    <Text style={styles.summaryName}>{transactionTitle(transaction)}</Text>
                </View>

                <View style={styles.card}>
                    <DetailRow label="Category" value={transaction.category} />
                    <DetailRow
                        label="Date"
                        value={new Date(transaction.transactionDate).toLocaleString(language, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                        })}
                    />
                    {transaction.description ? (
                        <DetailRow label="Description" value={transaction.description} />
                    ) : null}
                </View>

                {transaction.transType === 'EXPENSE' && transaction.merchant ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Merchant</Text>
                        {transaction.merchant.name ? (
                            <DetailRow label="Merchant" value={transaction.merchant.name} />
                        ) : null}
                        {transaction.merchant.address ? (
                            <DetailRow label="Address" value={transaction.merchant.address} />
                        ) : null}
                        {transaction.merchant.purchaseTime ? (
                            <DetailRow label="Purchase time" value={transaction.merchant.purchaseTime} />
                        ) : null}
                        {transaction.merchant.paymentMethod ? (
                            <DetailRow label="Payment method" value={transaction.merchant.paymentMethod} />
                        ) : null}
                        {transaction.merchant.reference ? (
                            <DetailRow label="Reference" value={transaction.merchant.reference} />
                        ) : null}
                    </View>
                ) : null}

                {transaction.transType === 'EXPENSE' ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Purchased Items</Text>
                        {items.length > 0 ? (
                            <>
                                {items.map((item) => (
                                    <View key={item.id} style={styles.itemRow}>
                                        <View style={styles.itemCopy}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemMeta}>
                                                {item.quantity} × {formatMoney(item.unitPrice, language, currency)}
                                            </Text>
                                        </View>
                                        <Text style={styles.itemTotal}>
                                            {formatMoney(
                                                calculateItemTotal(item.quantity, item.unitPrice),
                                                language,
                                                currency,
                                            )}
                                        </Text>
                                    </View>
                                ))}
                                {reconciliation ? (
                                    <View style={styles.reconciliation}>
                                        <DetailRow
                                            label="Item subtotal"
                                            value={formatMoney(reconciliation.subtotal, language, currency)}
                                        />
                                        <DetailRow
                                            label="Difference"
                                            value={formatMoney(reconciliation.difference, language, currency)}
                                        />
                                    </View>
                                ) : null}
                            </>
                        ) : (
                            <View style={styles.emptyItems}>
                                <Text style={styles.emptyItemsTitle}>No purchased items recorded</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Add Items"
                                    onPress={() => router.push(`/add-transaction?id=${transaction.id}&focus=items`)}
                                    style={styles.emptyItemsAction}
                                >
                                    <Text style={styles.emptyItemsActionText}>Add Items</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Receipt</Text>
                    {transaction.receipt ? (
                        <ReceiptAttachmentPreview
                            attachment={{ status: 'selected', file: transaction.receipt }}
                        />
                    ) : (
                        <Text style={styles.emptyReceipt}>No receipt attached.</Text>
                    )}
                </View>

                <View style={styles.actions}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit Transaction"
                        onPress={() => router.push(`/add-transaction?id=${transaction.id}`)}
                        style={styles.editAction}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.editActionText}>Edit Transaction</Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete Transaction"
                        onPress={() => setDeleteOpen(true)}
                        style={styles.deleteAction}
                    >
                        <Ionicons name="trash-outline" size={18} color={C.error} />
                        <Text style={styles.deleteActionText}>Delete Transaction</Text>
                    </Pressable>
                </View>
            </ScrollView>

            <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Delete Transaction?</Text>
                        <Text style={styles.modalText}>
                            Deleting this transaction can affect spending totals, budgets, and reports.
                        </Text>
                        <View style={styles.modalActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Cancel delete"
                                onPress={() => setDeleteOpen(false)}
                                style={styles.modalCancel}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Confirm delete"
                                onPress={confirmDelete}
                                style={styles.modalDelete}
                            >
                                <Text style={styles.modalDeleteText}>Delete</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/** Details styles. */
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    content: { padding: 20, paddingBottom: 32 },
    notice: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: C.errorBackground,
        marginBottom: 10,
    },
    noticeText: { fontSize: 12, color: C.error },
    summaryCard: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 18,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.cardBorder,
        marginBottom: 12,
    },
    summaryType: { fontSize: 13, fontWeight: '700', color: C.muted },
    summaryAmount: {
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -0.6,
        color: C.ink,
        marginTop: 6,
    },
    income: { color: C.income },
    summaryName: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 8 },
    card: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.cardBorder,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
        marginBottom: 10,
    },
    detailRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
    detailLabel: { fontSize: 12, color: C.muted, marginBottom: 3 },
    detailValue: { fontSize: 14, color: C.ink },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
    },
    itemCopy: { flex: 1, minWidth: 0 },
    itemName: { fontSize: 14, fontWeight: '700', color: C.ink },
    itemMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
    itemTotal: { fontSize: 14, fontWeight: '700', color: C.ink },
    reconciliation: { marginTop: 10 },
    emptyItems: { alignItems: 'center', paddingVertical: 12 },
    emptyItemsTitle: { fontSize: 14, color: C.muted },
    emptyItemsAction: {
        marginTop: 12,
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 12,
        backgroundColor: C.green,
    },
    emptyItemsActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    emptyReceipt: { fontSize: 13, color: C.muted },
    actions: { gap: 10, marginTop: 4 },
    editAction: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        backgroundColor: C.green,
    },
    editActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    deleteAction: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.error,
        backgroundColor: C.white,
    },
    deleteActionText: { color: C.error, fontSize: 16, fontWeight: '700' },
    notFound: { fontSize: 15, color: C.muted, textAlign: 'center' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
    },
    modalTitle: { fontSize: T.modalTitle, fontWeight: T.modalTitleWeight, color: C.ink },
    modalText: { fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 8 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    modalCancel: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
    },
    modalCancelText: { color: C.ink, fontWeight: '700' },
    modalDelete: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: C.error,
    },
    modalDeleteText: { color: '#FFFFFF', fontWeight: '700' },
});

export default TransactionDetailsRoute;
