/**
 * Recurring Transaction details screen.
 *
 * UI-only: pause, resume, cancel, and confirmation interactions update local
 * presentation state only.
 */

import { Ionicons } from '@expo/vector-icons';
import RecurringConfirmationCard from '@/components/recurring/RecurringConfirmationCard';
import RecurringScreenHeader from '@/components/recurring/RecurringScreenHeader';
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge';
import { DEMO_MODE } from '@/constants/dashboardDemo';
import { DEMO_RECURRING_SCHEDULES } from '@/constants/recurringDemo';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { useLocale } from '@/contexts/LocaleContext';
import type { RecurringStatus } from '@/types/recurring';
import { formatSignedAmount } from '@/utils/transactions';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
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
 * Render one detail row.
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
 * Render the recurring transaction details route.
 *
 * @returns {JSX.Element} The details screen.
 */
const RecurringTransactionDetailsRoute = () => {
    const insets = useSafeAreaInsets();
    const { language, currency } = useLocale();
    const { id } = useLocalSearchParams<{ id: string }>();
    const fixture = DEMO_RECURRING_SCHEDULES.find((schedule) => schedule.id === id);

    const [status, setStatus] = useState<RecurringStatus | null>(
        fixture?.status ?? null,
    );
    const [actualAmount, setActualAmount] = useState(fixture?.amount ?? '');
    const [cancelOpen, setCancelOpen] = useState(false);

    if (!DEMO_MODE) {
        return (
            <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
                <Text style={styles.mutedText}>Recurring details are unavailable without demo mode.</Text>
            </View>
        );
    }

    if (!fixture) {
        return (
            <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
                <RecurringScreenHeader title="Recurring Transaction" onBack={() => router.back()} />
                <View style={styles.center}>
                    <Text style={styles.mutedText}>Recurring schedule not found.</Text>
                </View>
            </View>
        );
    }

    const amount = fixture.amount
        ? formatSignedAmount(fixture.amount, fixture.type, language, currency)
        : `Variable amount${fixture.estimatedAmount ? ` · ~${fixture.estimatedAmount}` : ''}`;

    return (
        <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
            <RecurringScreenHeader title="Recurring Transaction" onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={styles.hero}>
                        <View style={[styles.heroIcon, fixture.type === 'INCOME' && styles.heroIconIncome]}>
                            <Ionicons
                                name={fixture.categoryIcon as keyof typeof Ionicons.glyphMap}
                                size={24}
                                color={fixture.type === 'INCOME' ? C.green : C.ink}
                            />
                        </View>
                        <View style={styles.heroCopy}>
                            <Text style={styles.name}>{fixture.name}</Text>
                            <Text style={styles.type}>{fixture.type === 'INCOME' ? 'Income' : 'Expense'}</Text>
                        </View>
                        <Text style={[styles.amount, fixture.type === 'INCOME' && styles.amountIncome]}>
                            {amount}
                        </Text>
                    </View>

                    {status ? <RecurringStatusBadge status={status} /> : null}
                </View>

                <View style={styles.card}>
                    <DetailRow label="Category" value={fixture.categoryName} />
                    <DetailRow label="Frequency" value={fixture.repeatDay} />
                    <DetailRow label="Start date" value={fixture.startDate} />
                    <DetailRow label="Next scheduled date" value={fixture.nextDate} />
                    <DetailRow
                        label="End condition"
                        value={
                            fixture.endCondition === 'UNTIL_CANCELED'
                                ? 'Until canceled'
                                : fixture.endCondition === 'ON_DATE'
                                    ? fixture.endDate ?? 'Specific date'
                                    : `${fixture.endOccurrences ?? ''} occurrences`
                        }
                    />
                    <DetailRow
                        label="Recording preference"
                        value={
                            fixture.recordingPreference === 'REQUIRE_CONFIRMATION'
                                ? 'Require confirmation'
                                : 'Automatically record'
                        }
                    />
                    {fixture.budgetName ? (
                        <DetailRow label="Budget" value={fixture.budgetName} />
                    ) : null}
                    {fixture.description ? (
                        <DetailRow label="Description" value={fixture.description} />
                    ) : null}
                </View>

                {status === 'AWAITING_CONFIRMATION' ? (
                    <RecurringConfirmationCard
                        schedule={fixture}
                        actualAmount={actualAmount}
                        onActualAmountChange={setActualAmount}
                        onConfirm={() => setStatus('ACTIVE')}
                        onEditActual={() => undefined}
                        onNotYet={() => undefined}
                    />
                ) : null}

                <View style={styles.actions}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit Recurring Transaction"
                        onPress={() => router.push(`/add-recurring-transaction?id=${fixture.id}`)}
                        style={styles.primaryAction}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>Edit</Text>
                    </Pressable>

                    {status === 'PAUSED' ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Resume schedule"
                            onPress={() => setStatus('ACTIVE')}
                            style={styles.secondaryAction}
                        >
                            <Ionicons name="play-outline" size={18} color={C.green} />
                            <Text style={styles.secondaryActionText}>Resume</Text>
                        </Pressable>
                    ) : status === 'ACTIVE' || status === 'AWAITING_CONFIRMATION' ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Pause schedule"
                            onPress={() => setStatus('PAUSED')}
                            style={styles.secondaryAction}
                        >
                            <Ionicons name="pause-outline" size={18} color={C.green} />
                            <Text style={styles.secondaryActionText}>Pause</Text>
                        </Pressable>
                    ) : null}

                    {status !== 'CANCELED' ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel schedule"
                            onPress={() => setCancelOpen(true)}
                            style={styles.dangerAction}
                        >
                            <Ionicons name="close-circle-outline" size={18} color={C.error} />
                            <Text style={styles.dangerActionText}>Cancel</Text>
                        </Pressable>
                    ) : null}
                </View>
            </ScrollView>

            <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Cancel recurring transaction?</Text>
                        <Text style={styles.modalText}>
                            Canceled schedules are ended and cannot be resumed.
                        </Text>
                        <View style={styles.modalActions}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Keep schedule"
                                onPress={() => setCancelOpen(false)}
                                style={styles.modalSecondary}
                            >
                                <Text style={styles.modalSecondaryText}>Keep</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Confirm cancel"
                                onPress={() => {
                                    setStatus('CANCELED');
                                    setCancelOpen(false);
                                }}
                                style={styles.modalDanger}
                            >
                                <Text style={styles.modalDangerText}>Cancel Schedule</Text>
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
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    mutedText: {
        fontSize: 14,
        color: C.muted,
        textAlign: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF2F7',
    },
    heroIconIncome: {
        backgroundColor: '#E9F7F1',
    },
    heroCopy: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontSize: 18,
        fontWeight: '800',
        color: C.ink,
    },
    type: {
        fontSize: 13,
        color: C.muted,
        marginTop: 3,
    },
    amount: {
        fontSize: 17,
        fontWeight: '800',
        color: C.ink,
    },
    amountIncome: {
        color: C.income,
    },
    detailRow: {
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: C.divider,
    },
    detailLabel: {
        fontSize: 12,
        color: C.muted,
        marginBottom: 3,
    },
    detailValue: {
        fontSize: 14,
        color: C.ink,
    },
    actions: {
        gap: 10,
        marginTop: 4,
    },
    primaryAction: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        backgroundColor: C.green,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryAction: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.green,
        backgroundColor: C.white,
    },
    secondaryActionText: {
        color: C.green,
        fontSize: 15,
        fontWeight: '700',
    },
    dangerAction: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.error,
        backgroundColor: C.white,
    },
    dangerActionText: {
        color: C.error,
        fontSize: 15,
        fontWeight: '700',
    },
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
        fontSize: T.modalTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    modalText: {
        fontSize: 14,
        lineHeight: 20,
        color: C.muted,
        marginTop: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    modalSecondary: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
    },
    modalSecondaryText: {
        color: C.ink,
        fontWeight: '700',
    },
    modalDanger: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: C.error,
    },
    modalDangerText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});

export default RecurringTransactionDetailsRoute;
