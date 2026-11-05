/**
 * Recurring Transactions management screen.
 *
 * UI-only: schedules come from the existing demo fixture system when demo mode
 * is enabled. No recurring backend exists, so live mode shows an honest
 * unavailable state.
 */

import RecurringEmptyState from '@/components/recurring/RecurringEmptyState';
import RecurringScheduleListItem from '@/components/recurring/RecurringScheduleListItem';
import RecurringScreenHeader from '@/components/recurring/RecurringScreenHeader';
import { Segmented } from '@/components/transactions/TransactionsScreens';
import { DEMO_MODE } from '@/constants/dashboardDemo';
import { DEMO_RECURRING_SCHEDULES } from '@/constants/recurringDemo';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import { useLocale } from '@/contexts/LocaleContext';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;

/**
 * Render the recurring transactions management route.
 *
 * @returns {JSX.Element} The recurring management screen.
 */
const RecurringTransactionsRoute = () => {
    const insets = useSafeAreaInsets();
    const { language, currency } = useLocale();
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

    const schedules = DEMO_MODE
        ? DEMO_RECURRING_SCHEDULES.filter((schedule) => {
            if (filter === 'all') return true;
            return schedule.type === (filter === 'income' ? 'INCOME' : 'EXPENSE');
        })
        : [];

    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/transactions');
        }
    };

    const openForm = () => router.push('/add-recurring-transaction');
    const openDetails = (id: string) => router.push(`/recurring-transaction/${id}`);

    return (
        <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
            <RecurringScreenHeader
                title="Recurring Transactions"
                onBack={goBack}
                rightIcon="add"
                rightAccessibilityLabel="Add Recurring Transaction"
                onRightPress={openForm}
            />

            <View style={styles.filterWrap}>
                <Segmented
                    options={[
                        { label: 'All', value: 'all' },
                        { label: 'Income', value: 'income' },
                        { label: 'Expenses', value: 'expense' },
                    ]}
                    value={filter}
                    onChange={setFilter}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {!DEMO_MODE ? (
                    <RecurringEmptyState
                        title="Recurring transactions unavailable"
                        message="Recurring transaction data will appear here once the backend is available."
                    />
                ) : schedules.length === 0 ? (
                    <RecurringEmptyState
                        message={
                            filter === 'income'
                                ? 'No recurring income yet.'
                                : filter === 'expense'
                                    ? 'No recurring expenses yet.'
                                    : 'Set up regular income, bills and subscriptions to keep track of what\u2019s coming up.'
                        }
                        onAction={openForm}
                    />
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Upcoming</Text>
                        {schedules.map((schedule) => (
                            <RecurringScheduleListItem
                                key={schedule.id}
                                schedule={schedule}
                                language={language}
                                currency={currency}
                                onPress={() => openDetails(schedule.id)}
                            />
                        ))}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Add Recurring Transaction"
                            onPress={openForm}
                            style={styles.addButton}
                        >
                            <Text style={styles.addButtonText}>+ Add Recurring Transaction</Text>
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

/** Recurring management styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    filterWrap: {
        marginTop: 12,
    },
    content: {
        paddingTop: 18,
        paddingBottom: 32,
    },
    sectionTitle: {
        marginHorizontal: 22,
        marginBottom: 10,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: C.muted,
    },
    addButton: {
        marginHorizontal: 20,
        marginTop: 6,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: C.green,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default RecurringTransactionsRoute;
