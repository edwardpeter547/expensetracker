/**
 * Add/Edit Recurring Transaction form.
 *
 * UI-only presentation: saving changes local preview state and never persists
 * a schedule or contacts the backend.
 */

import { Ionicons } from '@expo/vector-icons';
import DatePickerModal from '@/components/transactions/DatePickerModal';
import OptionSelectorModal from '@/components/transactions/OptionSelectorModal';
import RecurringScreenHeader from '@/components/recurring/RecurringScreenHeader';
import {
    Segmented,
    type SelectOption,
} from '@/components/transactions/TransactionsScreens';
import { categoryIconName } from '@/components/transactions/categoryPresentation';
import { DEMO_MODE } from '@/constants/dashboardDemo';
import {
    DEMO_RECURRING_DRAFT,
    DEMO_RECURRING_SCHEDULES,
} from '@/constants/recurringDemo';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { DEMO_BUDGETS } from '@/constants/transactionsDemo';
import { useLocale } from '@/contexts/LocaleContext';
import { SYSTEM_CATEGORIES, systemCategoryLabel } from '@/localization/systemCategories';
import type {
    RecurringDraft,
    RecurringEndCondition,
    RecurringFrequency,
    RecurringRecordingPreference,
} from '@/types/recurring';
import { currencySymbol } from '@/utils/transactions';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/** Local date helpers. */
const toDateString = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const fromDateString = (value: string): Date => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
};

/** Frequency selector options. */
const FREQUENCY_OPTIONS: SelectOption[] = [
    { id: 'WEEKLY', label: 'Weekly' },
    { id: 'BIWEEKLY', label: 'Every two weeks' },
    { id: 'MONTHLY', label: 'Monthly' },
    { id: 'QUARTERLY', label: 'Quarterly' },
    { id: 'YEARLY', label: 'Yearly' },
];

/** End-condition selector options. */
const END_OPTIONS: SelectOption[] = [
    { id: 'UNTIL_CANCELED', label: 'Until canceled' },
    { id: 'ON_DATE', label: 'On a specific date' },
    { id: 'AFTER_OCCURRENCES', label: 'After a number of occurrences' },
];

/**
 * Build repeat-day options for a frequency.
 *
 * @param {RecurringFrequency} frequency The selected frequency.
 * @returns {SelectOption[]} The repeat-day options.
 */
const repeatDayOptions = (frequency: RecurringFrequency): SelectOption[] => {
    if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            .map((day) => ({ id: day, label: day }));
    }
    if (frequency === 'QUARTERLY' || frequency === 'YEARLY') {
        return [
            { id: '1st of January', label: '1st of January' },
            { id: '1st of April', label: '1st of April' },
            { id: '1st of July', label: '1st of July' },
            { id: '1st of October', label: '1st of October' },
        ];
    }
    return [
        '1st of every month',
        '5th of every month',
        '10th of every month',
        '15th of every month',
        '28th of every month',
        'Last day of month',
    ].map((label) => ({ id: label, label }));
};

/**
 * Resolve the initial draft from edit params or the default demo draft.
 *
 * @param {string|undefined} editId The edit id, when present.
 * @returns {RecurringDraft} The initial form draft.
 */
const buildInitialDraft = (editId?: string): RecurringDraft => {
    if (editId) {
        const schedule = DEMO_RECURRING_SCHEDULES.find((item) => item.id === editId);
        if (schedule) {
            return {
                type: schedule.type,
                name: schedule.name,
                amountMode: schedule.amount ? 'FIXED' : 'VARIABLE',
                amount: schedule.amount ?? '',
                estimatedAmount: schedule.estimatedAmount ?? '',
                categoryId: schedule.categoryId,
                frequency: schedule.frequency,
                startDate: schedule.startDate,
                repeatDay: schedule.repeatDay,
                endCondition: schedule.endCondition,
                endDate: schedule.endDate ?? '',
                endOccurrences: schedule.endOccurrences?.toString() ?? '',
                recordingPreference: schedule.recordingPreference,
                budgetId: schedule.budgetId ?? null,
                description: schedule.description ?? '',
            };
        }
    }
    return DEMO_RECURRING_DRAFT;
};

/**
 * Render the Add/Edit Recurring Transaction route.
 *
 * @returns {JSX.Element} The recurring form screen.
 */
const AddRecurringTransactionRoute = () => {
    const insets = useSafeAreaInsets();
    const { language, currency } = useLocale();
    const params = useLocalSearchParams<{ id?: string }>();
    const editId = params.id;
    const isEdit = Boolean(editId);

    const [draft, setDraft] = useState<RecurringDraft>(() => buildInitialDraft(editId));
    const [previewMessage, setPreviewMessage] = useState<string | null>(null);
    const [selector, setSelector] = useState<'category' | 'frequency' | 'end' | 'repeatDay' | 'budget' | null>(null);
    const [dateField, setDateField] = useState<'start' | 'end' | null>(null);

    const categoryOptions = useMemo(
        () =>
            SYSTEM_CATEGORIES.filter((category) => category.type === draft.type).map((category) => ({
                id: category.id,
                label: systemCategoryLabel(category.id, language),
                iconName: categoryIconName({ id: category.id }, 'expense'),
            })),
        [draft.type, language],
    );
    const budgetOptions: SelectOption[] = useMemo(
        () =>
            DEMO_BUDGETS.map((budget) => ({
                id: budget.id,
                label: budget.category?.name ?? 'Budget',
                iconName: categoryIconName(budget.category, 'expense'),
            })),
        [],
    );
    const frequencyOptions = FREQUENCY_OPTIONS;
    const endOptions = END_OPTIONS;
    const repeatOptions = repeatDayOptions(draft.frequency);

    const setField = <K extends keyof RecurringDraft>(key: K, value: RecurringDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };

    const save = () => {
        setPreviewMessage(
            DEMO_MODE
                ? 'UI preview only — this recurring schedule was not saved.'
                : 'Recurring scheduling is not available yet.',
        );
    };

    const goBack = () => router.back();

    return (
        <KeyboardAvoidingView
            style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <RecurringScreenHeader
                title={isEdit ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
                onBack={goBack}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.segmentWrap}>
                    <Segmented
                        options={[
                            { label: 'Expense', value: 'EXPENSE' },
                            { label: 'Income', value: 'INCOME' },
                        ]}
                        value={draft.type}
                        onChange={(value) => {
                            setDraft((current) => ({
                                ...current,
                                type: value,
                                categoryId: '',
                                budgetId: null,
                            }));
                        }}
                    />
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        value={draft.name}
                        onChangeText={(value) => setField('name', value)}
                        placeholder="Monthly Rent"
                        placeholderTextColor={C.muted}
                        style={styles.input}
                    />

                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.amountMode}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Fixed amount"
                            onPress={() => setField('amountMode', 'FIXED')}
                            style={[
                                styles.amountModeButton,
                                draft.amountMode === 'FIXED' && styles.amountModeButtonActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.amountModeText,
                                    draft.amountMode === 'FIXED' && styles.amountModeTextActive,
                                ]}
                            >
                                Fixed amount
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Variable amount"
                            onPress={() => setField('amountMode', 'VARIABLE')}
                            style={[
                                styles.amountModeButton,
                                draft.amountMode === 'VARIABLE' && styles.amountModeButtonActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.amountModeText,
                                    draft.amountMode === 'VARIABLE' && styles.amountModeTextActive,
                                ]}
                            >
                                Variable amount
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.amountField}>
                        <Text style={styles.currency}>{currencySymbol(language, currency)}</Text>
                        <TextInput
                            keyboardType="decimal-pad"
                            value={draft.amount}
                            onChangeText={(value) => setField('amount', value)}
                            placeholder={draft.amountMode === 'VARIABLE' ? 'Estimated amount' : '0.00'}
                            placeholderTextColor={C.muted}
                            style={styles.amountInput}
                        />
                    </View>
                    {draft.amountMode === 'VARIABLE' ? (
                        <Text style={styles.hint}>
                            Variable amounts show “Variable amount” on the schedule until confirmed.
                        </Text>
                    ) : null}

                    <Text style={styles.label}>Category</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select category"
                        onPress={() => setSelector('category')}
                        style={styles.selectField}
                    >
                        <Text style={styles.selectText}>
                            {categoryOptions.find((item) => item.id === draft.categoryId)?.label
                                ?? 'Select category'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                    </Pressable>

                    <Text style={styles.label}>Repeat</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select frequency"
                        onPress={() => setSelector('frequency')}
                        style={styles.selectField}
                    >
                        <Text style={styles.selectText}>
                            {frequencyOptions.find((item) => item.id === draft.frequency)?.label
                                ?? 'Monthly'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                    </Pressable>

                    <Text style={styles.label}>Start Date</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select start date"
                        onPress={() => setDateField('start')}
                        style={styles.selectField}
                    >
                        <Ionicons name="calendar-outline" size={20} color={C.green} />
                        <Text style={styles.selectText}>{draft.startDate || 'Select date'}</Text>
                        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                    </Pressable>

                    <Text style={styles.label}>Repeat on</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select repeat day"
                        onPress={() => setSelector('repeatDay')}
                        style={styles.selectField}
                    >
                        <Text style={styles.selectText}>{draft.repeatDay || 'Select repeat day'}</Text>
                        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                    </Pressable>

                    <Text style={styles.label}>Ends</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select end condition"
                        onPress={() => setSelector('end')}
                        style={styles.selectField}
                    >
                        <Text style={styles.selectText}>
                            {endOptions.find((item) => item.id === draft.endCondition)?.label
                                ?? 'Until canceled'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                    </Pressable>
                    {draft.endCondition === 'ON_DATE' ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Select end date"
                            onPress={() => setDateField('end')}
                            style={styles.selectField}
                        >
                            <Text style={styles.selectText}>{draft.endDate || 'Select end date'}</Text>
                            <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                        </Pressable>
                    ) : null}
                    {draft.endCondition === 'AFTER_OCCURRENCES' ? (
                        <TextInput
                            keyboardType="number-pad"
                            value={draft.endOccurrences}
                            onChangeText={(value) => setField('endOccurrences', value)}
                            placeholder="Number of occurrences"
                            placeholderTextColor={C.muted}
                            style={styles.input}
                        />
                    ) : null}

                    <Text style={styles.label}>When the scheduled date arrives</Text>
                    {([
                        {
                            value: 'REQUIRE_CONFIRMATION' as RecurringRecordingPreference,
                            title: 'Require confirmation',
                            support:
                                'Remind me to confirm that the money was actually received or paid.',
                        },
                        {
                            value: 'AUTO_RECORD' as RecurringRecordingPreference,
                            title: 'Automatically record',
                            support:
                                'Record the transaction on its scheduled date without confirmation.',
                        },
                    ]).map((option) => (
                        <Pressable
                            key={option.value}
                            accessibilityRole="button"
                            accessibilityLabel={option.title}
                            onPress={() => setField('recordingPreference', option.value)}
                            style={[
                                styles.preference,
                                draft.recordingPreference === option.value && styles.preferenceActive,
                            ]}
                        >
                            <View
                                style={[
                                    styles.radio,
                                    draft.recordingPreference === option.value && styles.radioActive,
                                ]}
                            >
                                {draft.recordingPreference === option.value ? (
                                    <View style={styles.radioDot} />
                                ) : null}
                            </View>
                            <View style={styles.preferenceCopy}>
                                <Text style={styles.preferenceTitle}>{option.title}</Text>
                                <Text style={styles.preferenceSupport}>{option.support}</Text>
                            </View>
                        </Pressable>
                    ))}
                    <Text style={styles.explanatory}>
                        Scheduled income and expenses are not counted as completed transactions
                        until they are recorded.
                    </Text>

                    {draft.type === 'EXPENSE' ? (
                        <>
                            <Text style={styles.label}>Add to Budget (Optional)</Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Select budget"
                                onPress={() => setSelector('budget')}
                                style={styles.selectField}
                            >
                                <Text style={styles.selectText}>
                                    {budgetOptions.find((item) => item.id === draft.budgetId)?.label
                                        ?? 'Select a budget'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                            </Pressable>
                        </>
                    ) : null}

                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        multiline
                        textAlignVertical="top"
                        value={draft.description}
                        onChangeText={(value) => setField('description', value)}
                        placeholder="Add notes about this recurring transaction"
                        placeholderTextColor={C.muted}
                        style={styles.textarea}
                    />
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                {previewMessage ? <Text style={styles.previewMessage}>{previewMessage}</Text> : null}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isEdit ? 'Save Changes' : 'Save Recurring Transaction'}
                    onPress={save}
                    style={styles.save}
                >
                    <Text style={styles.saveText}>
                        {isEdit ? 'Save Changes' : 'Save Recurring Transaction'}
                    </Text>
                </Pressable>
            </View>

            <OptionSelectorModal
                visible={selector === 'category'}
                title="Select category"
                options={categoryOptions}
                selectedId={draft.categoryId}
                onClose={() => setSelector(null)}
                onSelect={(id) => {
                    setField('categoryId', id);
                    setSelector(null);
                }}
            />
            <OptionSelectorModal
                visible={selector === 'frequency'}
                title="Repeat"
                options={frequencyOptions}
                selectedId={draft.frequency}
                onClose={() => setSelector(null)}
                onSelect={(id) => {
                    setField('frequency', id as RecurringFrequency);
                    setSelector(null);
                }}
            />
            <OptionSelectorModal
                visible={selector === 'repeatDay'}
                title="Repeat on"
                options={repeatOptions}
                selectedId={draft.repeatDay}
                onClose={() => setSelector(null)}
                onSelect={(id) => {
                    setField('repeatDay', id);
                    setSelector(null);
                }}
            />
            <OptionSelectorModal
                visible={selector === 'end'}
                title="Ends"
                options={endOptions}
                selectedId={draft.endCondition}
                onClose={() => setSelector(null)}
                onSelect={(id) => {
                    setField('endCondition', id as RecurringEndCondition);
                    setSelector(null);
                }}
            />
            <OptionSelectorModal
                visible={selector === 'budget'}
                title="Add to Budget"
                options={budgetOptions}
                selectedId={draft.budgetId}
                onClose={() => setSelector(null)}
                onSelect={(id) => {
                    setField('budgetId', id);
                    setSelector(null);
                }}
            />

            <DatePickerModal
                visible={dateField === 'start'}
                value={draft.startDate ? fromDateString(draft.startDate) : new Date()}
                language={language}
                onClose={() => setDateField(null)}
                onSelect={(date) => {
                    setField('startDate', toDateString(date));
                    setDateField(null);
                }}
            />
            <DatePickerModal
                visible={dateField === 'end'}
                value={draft.endDate ? fromDateString(draft.endDate) : new Date()}
                language={language}
                onClose={() => setDateField(null)}
                onSelect={(date) => {
                    setField('endDate', toDateString(date));
                    setDateField(null);
                }}
            />
        </KeyboardAvoidingView>
    );
};

/** Recurring form styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    content: {
        paddingBottom: 24,
    },
    segmentWrap: {
        marginTop: 12,
    },
    form: {
        paddingHorizontal: 22,
        paddingTop: 22,
    },
    label: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
        marginBottom: 9,
        marginTop: 18,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 12,
        paddingHorizontal: 13,
        fontSize: 16,
        color: C.ink,
        backgroundColor: C.white,
    },
    amountMode: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    amountModeButton: {
        flex: 1,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.white,
    },
    amountModeButtonActive: {
        backgroundColor: C.green,
        borderColor: C.green,
    },
    amountModeText: {
        fontSize: 13,
        fontWeight: '600',
        color: C.ink,
    },
    amountModeTextActive: {
        color: '#FFFFFF',
    },
    amountField: {
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 12,
        backgroundColor: C.white,
    },
    currency: {
        fontSize: 22,
        fontWeight: '800',
        color: C.ink,
    },
    amountInput: {
        flex: 1,
        fontSize: 22,
        color: C.ink,
        padding: 0,
    },
    hint: {
        fontSize: 12,
        color: C.muted,
        marginTop: 8,
    },
    selectField: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 12,
        backgroundColor: C.white,
    },
    selectText: {
        flex: 1,
        fontSize: 15,
        color: C.ink,
    },
    preference: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        backgroundColor: C.white,
    },
    preferenceActive: {
        borderColor: C.green,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: C.line,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioActive: {
        borderColor: C.green,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: C.green,
    },
    preferenceCopy: {
        flex: 1,
    },
    preferenceTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: C.ink,
    },
    preferenceSupport: {
        fontSize: 12,
        lineHeight: 17,
        color: C.muted,
        marginTop: 4,
    },
    explanatory: {
        fontSize: 12,
        lineHeight: 17,
        color: C.muted,
        marginTop: 2,
        marginBottom: 10,
    },
    textarea: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        color: C.ink,
        backgroundColor: C.white,
    },
    footer: {
        paddingHorizontal: 22,
        paddingTop: 12,
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderTopColor: C.line,
    },
    previewMessage: {
        fontSize: 12,
        color: C.green,
        textAlign: 'center',
        marginBottom: 8,
    },
    save: {
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: C.green,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AddRecurringTransactionRoute;
