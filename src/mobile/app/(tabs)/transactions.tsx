/**
 * Transactions tab route.
 *
 * Maps authenticated (or demo) transaction records into the approved
 * `TransactionsScreen` view model and wires navigation and refresh actions.
 * The five-tab bottom bar is rendered once by the Expo Router tab layout.
 */

import {
    categoryIconBackground,
    categoryIconColor,
    categoryIconName,
} from '@/components/transactions/categoryPresentation';
import {
    TransactionsScreen,
    type TransactionItem,
} from '@/components/transactions/TransactionsScreens';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import { useTranslation } from 'react-i18next';
import { transactionDataSource } from '@/contracts';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import type { TransactionRecord } from '@/types/transaction';
import { currencySymbol, transactionTitle } from '@/utils/transactions';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

/**
 * Map a backend transaction record into the approved list row shape.
 *
 * @param {TransactionRecord} record The backend transaction.
 * @param {string} language The display language.
 * @param {string} currency The display currency.
 * @returns {TransactionItem} The mapped list row.
 */
const mapTransaction = (
    record: TransactionRecord,
    language: string,
    currency: string,
): TransactionItem => {
    const kind = record.transType === 'INCOME' ? 'income' : 'expense';
    const category = {
        id: record.categoryId ?? null,
        name: record.category,
    };

    return {
        id: record.id,
        title: transactionTitle(record),
        categoryName: record.category,
        kind,
        amount: String(record.amount).replace(/^-/, ''),
        currencySymbol: currencySymbol(language, currency),
        occurredAt: record.transactionDate,
        iconName: categoryIconName(category, kind),
        iconColor: categoryIconColor(category, kind),
        iconBackground: categoryIconBackground(category, kind),
    };
};

/**
 * Render the Transactions tab.
 *
 * @returns {JSX.Element} The transactions screen.
 */
const TransactionsRoute = () => {
    const { language, currency } = useLocale();
    const { t } = useTranslation('transactions');
    const { user } = useAuth();
    const {
        transactions,
        loading,
        refreshing,
        error,
        refresh,
        refreshSilently,
    } = useTransactions();
    const firstFocus = useRef(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
    const [blurSignal, setBlurSignal] = useState(0);

    const items = useMemo(
        () => transactions.map((transaction) => mapTransaction(transaction, language, currency)),
        [currency, language, transactions],
    );

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
            } else {
                void refreshSilently();
            }
            return () => setBlurSignal((current) => current + 1);
        }, [refreshSilently]),
    );

    return (
        <>
            <TransactionsScreen
            transactions={items}
            loading={loading}
            refreshing={refreshing}
            error={error}
            onRetry={() => void refresh()}
            onRefresh={() => void refreshSilently()}
            blurSignal={blurSignal}
            timeZone={user?.timezone ?? null}
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)');
                }
            }}
            onAdd={() => router.push('/add-transaction')}
            onRecurringPress={() => router.push('/recurring-transactions')}
            onTransactionPress={(id) => router.push(`/transaction/${id}`)}
            onEditTransaction={(id) => router.push(`/add-transaction?id=${id}`)}
            onDeleteTransaction={(id) => {
                setDeleteNotice(null);
                setDeleteId(id);
            }}
            />
            <Modal visible={deleteId !== null} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{t('Delete Transaction?')}</Text>
                        <Text style={styles.modalText}>
                            {t('Deleting this transaction can affect spending totals, budgets, and reports.')}
                        </Text>
                        {deleteNotice ? <Text style={styles.modalNotice}>{deleteNotice}</Text> : null}
                        <View style={styles.modalActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Cancel delete')}
                                onPress={() => setDeleteId(null)}
                                style={styles.modalCancel}
                            >
                                <Text style={styles.modalCancelText}>{t('Cancel')}</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Confirm delete')}
                                onPress={async () => {
                                    if (!deleteId) return;
                                    try {
                                        await transactionDataSource.remove(deleteId);
                                    } catch (cause) {
                                        setDeleteNotice(
                                            cause instanceof Error
                                                ? cause.message
                                                : t('Deleting is UI-only and unavailable without demo mode.'),
                                        );
                                        return;
                                    }
                                    setDeleteId(null);
                                    void refreshSilently();
                                }}
                                style={styles.modalDelete}
                            >
                                <Text style={styles.modalDeleteText}>{t('Delete')}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

/** Delete confirmation styles. */
const styles = StyleSheet.create({
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
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: transactionColors.ink,
    },
    modalText: {
        fontSize: 14,
        lineHeight: 20,
        color: transactionColors.muted,
        marginTop: 8,
    },
    modalNotice: {
        fontSize: 12,
        color: transactionColors.error,
        marginTop: 10,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    modalCancel: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: transactionColors.line,
    },
    modalCancelText: {
        color: transactionColors.ink,
        fontWeight: '700',
    },
    modalDelete: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: transactionColors.error,
    },
    modalDeleteText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default TransactionsRoute;
