/**
 * Approved Transactions V1 screens, adapted from the supplied native source.
 *
 * The supplied source owned its own bottom tab bar; because Expo Router's tab
 * navigator already renders the approved five-tab bar, that duplicate is
 * removed here and the floating add button is repositioned to sit above the
 * navigator-owned tab bar. All other structure, styles, gradients, and
 * interactions are preserved. Data and actions are supplied by the host app.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import ReceiptActionButtons, {
    ReceiptManualEntryDivider,
} from '@/components/receipts/ReceiptActionButtons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import type { ReceiptAttachmentState } from '@/types/receipt';
import RecurringShortcut from '@/components/recurring/RecurringShortcut';
import SwipeableTransactionRow from '@/components/transactions/SwipeableTransactionRow';
import type { Swipeable } from 'react-native-gesture-handler';
import MerchantDetailsFields from '@/components/transactions/MerchantDetailsFields';
import PurchasedItemsEditor from '@/components/transactions/PurchasedItemsEditor';
import type {
    MerchantDetails,
    PurchasedItem,
} from '@/types/transaction';

/** Direction used by the approved UI. */
export type TransactionKind = 'income' | 'expense';

/** Mapped transaction row consumed by the list. */
export type TransactionItem = {
    id: string;
    title: string;
    categoryName: string;
    kind: TransactionKind;
    amount: string;
    currencySymbol: string;
    occurredAt: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    iconBackground?: string;
};

/** Option used by the category and budget selector sheets. */
export type SelectOption = {
    id: string;
    label: string;
    iconName?: keyof typeof Ionicons.glyphMap;
};

/** Values emitted by the Add Transaction form on save. */
export type TransactionDraft = {
    kind: TransactionKind;
    amount: string;
    categoryId: string;
    date: string;
    description: string;
    budgetId: string | null;
    merchant?: MerchantDetails;
    items?: PurchasedItem[];
};

/** Approved color tokens. */
const C = transactionColors;
/** Shared typography scale. */
const T = transactionTypography;

/**
 * Build a local `YYYY-MM-DD` string without UTC date drift.
 *
 * @param {Date} date The source date.
 * @returns {string} The local date string.
 */
const toLocalDateString = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * Render an emerald gradient button.
 *
 * @param {object} props Button props.
 * @returns {JSX.Element} The gradient button.
 */
const GradientButton = ({
    children,
    onPress,
    style,
    disabled,
    accessibilityLabel,
    accessibilityRole = 'button',
}: {
    children: ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: 'button';
}) => (
    <Pressable
        onPress={onPress}
        disabled={disabled}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
    >
        <LinearGradient
            colors={['#198b62', '#2caf85']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            {children}
        </LinearGradient>
    </Pressable>
);

/**
 * Render the shared centered title header.
 *
 * @param {object} props Header props.
 * @returns {JSX.Element} The header.
 */
const Header = ({
    title,
    onBack,
    onSearch,
}: {
    title: string;
    onBack: () => void;
    onSearch?: () => void;
}) => (
    <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={onBack} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSide}>
            {onSearch && (
                <Pressable accessibilityLabel="Search" onPress={onSearch}>
                    <Ionicons name="search-outline" size={21} color={C.ink} />
                </Pressable>
            )}
        </View>
    </View>
);

/**
 * Render the approved segmented pill control.
 *
 * @param {object} props Segment props.
 * @returns {JSX.Element} The segmented control.
 */
export const Segmented = <T extends string>({
    options,
    value,
    onChange,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (value: T) => void;
}) => (
    <View style={styles.segmented}>
        {options.map((option) =>
            option.value === value ? (
                <GradientButton
                    key={option.value}
                    style={styles.segment}
                    onPress={() => onChange(option.value)}
                    accessibilityLabel={option.label}
                >
                    <Text style={styles.segmentActive}>{option.label}</Text>
                </GradientButton>
            ) : (
                <Pressable
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    style={styles.segment}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                >
                    <Text style={styles.segmentInactive}>{option.label}</Text>
                </Pressable>
            ),
        )}
    </View>
);

/** One list row with its optional date heading. */
type TransactionRow = TransactionItem & { heading: string | null };

/**
 * Resolve a relative day heading for a transaction timestamp.
 *
 * @param {string} iso The ISO transaction timestamp.
 * @param {Date} now The reference instant.
 * @returns {string} The day heading.
 */
const dateGroup = (iso: string, now: Date): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.valueOf())) return 'Other';

    const day = (value: Date): string =>
        `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
    if (day(date) === day(now)) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (day(date) === day(yesterday)) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

/** Transactions screen props. */
export interface TransactionsScreenProps {
    transactions: TransactionItem[];
    loading?: boolean;
    refreshing?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onBack: () => void;
    onSearch?: (query: string) => void;
    onAdd: () => void;
    onRecurringPress?: () => void;
    onTransactionPress?: (id: string) => void;
    onEditTransaction?: (id: string) => void;
    onDeleteTransaction?: (id: string) => void;
    onRefresh?: () => void;
    blurSignal?: number;
    now?: Date;
}

/**
 * Render the approved Transactions list screen.
 *
 * @param {TransactionsScreenProps} props Screen props.
 * @returns {JSX.Element} The transactions screen.
 */
export function TransactionsScreen({
    transactions,
    loading = false,
    refreshing = false,
    error = null,
    onRetry,
    onBack,
    onSearch,
    onAdd,
    onRecurringPress,
    onTransactionPress,
    onEditTransaction,
    onDeleteTransaction,
    onRefresh,
    blurSignal,
    now = new Date(),
}: TransactionsScreenProps) {
    const insets = useSafeAreaInsets();
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [searching, setSearching] = useState(false);
    const [query, setQuery] = useState('');
    const rowRefs = useRef<Record<string, Swipeable | null>>({});
    const openRowId = useRef<string | null>(null);

    const closeOtherRows = (id: string) => {
        Object.entries(rowRefs.current).forEach(([key, swipeable]) => {
            if (key !== id) swipeable?.close();
        });
        openRowId.current = id;
    };

    useEffect(() => {
        if (!blurSignal) return;
        const openId = openRowId.current;
        if (openId) {
            rowRefs.current[openId]?.close();
            openRowId.current = null;
        }
    }, [blurSignal]);

    const rows = useMemo<TransactionRow[]>(() => {
        const sorted = [...transactions].sort(
            (left, right) =>
                new Date(right.occurredAt).valueOf() - new Date(left.occurredAt).valueOf(),
        );

        return sorted
            .filter(
                (transaction) =>
                    (filter === 'all' || transaction.kind === filter)
                    && `${transaction.title} ${transaction.categoryName}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
            )
            .reduce<TransactionRow[]>((rows, transaction) => {
                const group = dateGroup(transaction.occurredAt, now);
                const previousGroup = rows.length > 0
                    ? dateGroup(rows[rows.length - 1].occurredAt, now)
                    : null;
                const heading = group !== previousGroup ? group : null;
                return rows.concat({ ...transaction, heading });
            }, []);
    }, [transactions, filter, query, now]);

    return (
        <View style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}>
            <StatusBar style="dark" />
            <Header
                title="Transactions"
                onBack={onBack}
                onSearch={() => setSearching((value) => !value)}
            />
            {searching && (
                <View style={styles.searchRow}>
                    <Ionicons name="search-outline" size={20} color={C.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or category"
                        placeholderTextColor="#9AA9C0"
                        value={query}
                        onChangeText={(value) => {
                            setQuery(value);
                            onSearch?.(value);
                        }}
                    />
                </View>
            )}
            <RecurringShortcut onPress={onRecurringPress ?? (() => undefined)} />
            <Segmented
                options={[
                    { label: 'All', value: 'all' },
                    { label: 'Income', value: 'income' },
                    { label: 'Expenses', value: 'expense' },
                ]}
                value={filter}
                onChange={setFilter}
            />
            {loading ? (
                <ActivityIndicator style={styles.center} color={C.green} />
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.empty}>{error}</Text>
                    <Pressable accessibilityLabel="Retry" onPress={onRetry}>
                        <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    style={styles.list}
                    data={rows}
                    keyExtractor={(transaction) => transaction.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={<Text style={styles.empty}>No transactions found</Text>}
                    renderItem={({ item }) => (
                        <>
                            {item.heading && <Text style={styles.day}>{item.heading}</Text>}
                            <SwipeableTransactionRow
                                ref={(swipeable) => {
                                    rowRefs.current[item.id] = swipeable;
                                }}
                                onWillOpen={() => closeOtherRows(item.id)}
                                onEdit={() => onEditTransaction?.(item.id)}
                                onDelete={() => onDeleteTransaction?.(item.id)}
                            >
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={item.title}
                                    onPress={() => onTransactionPress?.(item.id)}
                                    style={styles.transaction}
                                >
                                    <View
                                        style={[
                                            styles.txIcon,
                                            { backgroundColor: item.iconBackground || '#eeeeef' },
                                        ]}
                                    >
                                        <Ionicons
                                            name={item.iconName || 'receipt-outline'}
                                            size={20}
                                            color={item.iconColor || '#52627f'}
                                        />
                                    </View>
                                    <View style={styles.txName}>
                                        <Text numberOfLines={1} style={styles.txTitle}>
                                            {item.title}
                                        </Text>
                                        <Text numberOfLines={1} style={styles.txSub}>
                                            {item.categoryName}
                                        </Text>
                                    </View>
                                    <View style={styles.txRight}>
                                        <Text
                                            style={[
                                                styles.txAmount,
                                                item.kind === 'income' && { color: '#0c9c69' },
                                            ]}
                                        >
                                            {`${item.kind === 'income' ? '+' : '-'}${item.currencySymbol}${item.amount}`}
                                        </Text>
                                        <Text style={styles.txTime}>
                                            {new Date(item.occurredAt).toLocaleTimeString(undefined, {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                </Pressable>
                            </SwipeableTransactionRow>
                        </>
                    )}
                />
            )}
            <GradientButton
                style={styles.fab}
                onPress={onAdd}
                accessibilityLabel="Add transaction"
            >
                <Ionicons name="add" color="white" size={31} />
            </GradientButton>
        </View>
    );
}

/**
 * Render a labeled selector row for the form.
 *
 * @param {object} props Selector field props.
 * @returns {JSX.Element} The selector row.
 */
const SelectField = ({
    label,
    value,
    onPress,
    icon,
    disabled,
}: {
    label: string;
    value: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Pressable
            style={[styles.selectField, disabled && { opacity: 0.55 }]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            {icon && <Ionicons name={icon} color="#f39a36" size={20} />}
            <Text numberOfLines={1} style={styles.selectText}>
                {value}
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#49627e" />
        </Pressable>
    </View>
);

/** Add Transaction screen props. */
export interface AddTransactionScreenProps {
    categories: SelectOption[];
    budgets: SelectOption[];
    currencySymbol?: string;
    language?: string;
    currency?: string;
    saving?: boolean;
    optionsLoading?: boolean;
    optionsError?: string | null;
    formError?: string | null;
    onBack: () => void;
    onRetryOptions?: () => void;
    onKindChange?: (kind: TransactionKind) => void;
    onChooseCategory?: (
        options: SelectOption[],
        selectedId: string,
        setId: (id: string) => void,
    ) => void;
    onChooseBudget?: (
        options: SelectOption[],
        selectedId: string | null,
        setId: (id: string | null) => void,
    ) => void;
    onChooseDate?: (current: string, setDate: (date: string) => void) => void;
    onSave: (draft: TransactionDraft) => Promise<void> | void;
    selectedDate?: string;
    mode?: 'create' | 'edit';
    initialValues?: {
        kind?: TransactionKind;
        amount?: string;
        categoryId?: string;
        date?: string;
        description?: string;
        budgetId?: string | null;
    };
    merchant?: MerchantDetails;
    items?: PurchasedItem[];
    onMerchantChange?: (merchant: MerchantDetails) => void;
    onItemsChange?: (items: PurchasedItem[]) => void;
    onScanReceipt?: () => void;
    onUploadReceipt?: () => void;
    receipt?: ReceiptAttachmentState | null;
    onViewReceipt?: () => void;
    onReplaceReceipt?: () => void;
    onRemoveReceipt?: () => void;
}

/**
 * Render the approved Add Transaction form.
 *
 * @param {AddTransactionScreenProps} props Form props.
 * @returns {JSX.Element} The add transaction screen.
 */
export function AddTransactionScreen({
    categories,
    budgets,
    currencySymbol = '$',
    language = 'en-US',
    currency = 'USD',
    saving = false,
    optionsLoading = false,
    optionsError = null,
    formError = null,
    onBack,
    onRetryOptions,
    onKindChange,
    onChooseCategory,
    onChooseBudget,
    onChooseDate,
    onSave,
    selectedDate,
    mode = 'create',
    initialValues,
    merchant = {},
    items = [],
    onMerchantChange,
    onItemsChange,
    onScanReceipt,
    onUploadReceipt,
    receipt = null,
    onViewReceipt,
    onReplaceReceipt,
    onRemoveReceipt,
}: AddTransactionScreenProps) {
    const insets = useSafeAreaInsets();
    const [kind, setKind] = useState<TransactionKind>(initialValues?.kind ?? 'expense');
    const [amount, setAmount] = useState(initialValues?.amount ?? '');
    const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '');
    const [budgetId, setBudgetId] = useState<string | null>(initialValues?.budgetId ?? null);
    const [date, setDate] = useState(
        initialValues?.date ?? selectedDate ?? toLocalDateString(new Date()),
    );
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [validation, setValidation] = useState('');

    const category = categories.find((option) => option.id === categoryId);
    const budget = budgets.find((option) => option.id === budgetId);

    /**
     * Validate and emit the draft; host persistence and errors remain external.
     */
    const submit = () => {
        if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
            setValidation('Enter a valid positive amount.');
            return;
        }
        if (!categoryId) {
            setValidation('Select a category.');
            return;
        }
        setValidation('');
        onSave({
            kind,
            amount,
            categoryId,
            date,
            description,
            budgetId,
            merchant,
            items,
        });
    };

    return (
        <KeyboardAvoidingView
            style={[styles.screen, { marginTop: -insets.top, paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />
            <Header title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'} onBack={onBack} />
            <ScrollView
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Segmented
                    options={[
                        { label: 'Expense', value: 'expense' },
                        { label: 'Income', value: 'income' },
                    ]}
                    value={kind}
                    onChange={(value) => {
                        setKind(value);
                        onKindChange?.(value);
                        setCategoryId('');
                        setBudgetId(null);
                    }}
                />
                {kind === 'expense' ? (
                    <>
                        <ReceiptActionButtons
                            onScan={onScanReceipt ?? (() => undefined)}
                            onUpload={onUploadReceipt ?? (() => undefined)}
                        />
                        <ReceiptManualEntryDivider />
                        {receipt?.file ? (
                            <ReceiptAttachmentPreview
                                attachment={receipt}
                                onView={onViewReceipt}
                                onReplace={onReplaceReceipt}
                                onRemove={onRemoveReceipt}
                            />
                        ) : null}
                    </>
                ) : null}
                <View style={styles.form}>
                    {optionsError ? (
                        <View style={styles.optionsError}>
                            <Text style={styles.optionsErrorText}>{optionsError}</Text>
                            <Pressable accessibilityLabel="Retry loading options" onPress={onRetryOptions}>
                                <Text style={styles.retry}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : null}

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Amount</Text>
                        <View style={styles.amountField}>
                            <Text style={styles.currency}>{currencySymbol}</Text>
                            <TextInput
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor="#b9c5d9"
                                value={amount}
                                onChangeText={setAmount}
                                style={styles.amountInput}
                            />
                        </View>
                    </View>

                    <SelectField
                        label="Category"
                        value={category?.label || 'Select a category'}
                        icon={category?.iconName || 'fast-food-outline'}
                        disabled={optionsLoading}
                        onPress={() => onChooseCategory?.(categories, categoryId, setCategoryId)}
                    />

                    <SelectField
                        label="Date"
                        value={date}
                        icon="calendar-outline"
                        onPress={() => onChooseDate?.(date, setDate)}
                    />

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                            multiline
                            textAlignVertical="top"
                            placeholder="What was this for?"
                            placeholderTextColor="#9aa9c0"
                            value={description}
                            onChangeText={setDescription}
                            style={styles.description}
                        />
                    </View>

                    <SelectField
                        label="Add to Budget (Optional)"
                        value={budget?.label || 'Select a budget'}
                        disabled={optionsLoading || kind === 'income'}
                        onPress={() => onChooseBudget?.(budgets, budgetId, setBudgetId)}
                    />

                    {budgetId ? (
                        <Text style={styles.budgetHint}>
                            Budget linking isn&apos;t supported by the API yet, so this selection
                            will not be attached to the saved transaction.
                        </Text>
                    ) : null}

                    {mode === 'edit' && kind === 'expense' ? (
                        <>
                            <MerchantDetailsFields
                                value={merchant}
                                onChange={onMerchantChange ?? (() => undefined)}
                            />
                            <PurchasedItemsEditor
                                items={items}
                                transactionAmount={amount || '0'}
                                language={language}
                                currency={currency}
                                onChange={onItemsChange ?? (() => undefined)}
                            />
                        </>
                    ) : null}

                    {validation ? <Text style={styles.validation}>{validation}</Text> : null}
                    {formError ? <Text style={styles.validation}>{formError}</Text> : null}
                </View>
            </ScrollView>
            <GradientButton
                disabled={saving}
                style={styles.save}
                onPress={submit}
                accessibilityLabel={mode === 'edit' ? 'Save Changes' : 'Save Transaction'}
            >
                {saving ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.saveText}>
                        {mode === 'edit' ? 'Save Changes' : 'Save Transaction'}
                    </Text>
                )}
            </GradientButton>
        </KeyboardAvoidingView>
    );
}

/** Approved screen styles from the supplied source, minus the duplicate tab bar. */
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.background },
    header: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
    },
    headerSide: { width: 28, alignItems: 'center' },
    headerTitle: {
        fontSize: T.screenTitle,
        fontWeight: T.screenTitleWeight,
        letterSpacing: T.screenTitleLetterSpacing,
        color: C.ink,
    },
    segmented: {
        marginHorizontal: 20,
        marginTop: 12,
        padding: 4,
        backgroundColor: C.pale,
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 14,
        flexDirection: 'row',
        gap: 3,
        shadowColor: C.shadow,
        shadowOpacity: 0.04,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    segment: {
        flex: 1,
        height: 38,
        borderRadius: 11,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
    },
    segmentActive: { color: C.white, fontSize: T.segment, fontWeight: T.segmentWeight },
    segmentInactive: {
        color: C.segmentInactive,
        fontSize: T.segment,
        fontWeight: T.segmentWeight,
        textAlign: 'center',
    },
    searchRow: {
        height: 50,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: C.white,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        padding: 0,
        fontSize: 16,
        color: C.ink,
    },
    list: { flex: 1, marginHorizontal: 20 },
    day: {
        fontSize: T.dayTitle,
        fontWeight: T.dayTitleWeight,
        color: C.label,
        marginTop: 18,
        marginBottom: 10,
    },
    transaction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 13,
        minHeight: 72,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.cardBorder,
        backgroundColor: C.white,
    },
    txIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(18, 33, 59, 0.06)',
    },
    txName: { flex: 1, minWidth: 0 },
    txTitle: {
        fontSize: T.transactionTitle,
        fontWeight: T.transactionTitleWeight,
        color: C.ink,
    },
    txSub: { fontSize: T.transactionSubtitle, color: C.muted, marginTop: 3 },
    txRight: { alignItems: 'flex-end' },
    txAmount: {
        fontSize: T.amount,
        fontWeight: T.amountWeight,
        color: C.ink,
    },
    txTime: { fontSize: T.time, color: C.subtle, marginTop: 3 },
    fab: {
        position: 'absolute',
        right: 21,
        bottom: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 7,
        shadowColor: '#0b7654',
        shadowOpacity: 0.32,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { color: C.muted, fontSize: T.selectValue, marginTop: 25, textAlign: 'center' },
    retry: { color: C.green, fontSize: T.selectValue, marginTop: 12 },
    formScroll: { paddingBottom: 24 },
    form: { paddingHorizontal: 22, paddingTop: 23 },
    field: { marginBottom: 20 },
    fieldLabel: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
        marginBottom: 9,
    },
    amountField: {
        height: 53,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        gap: 9,
        backgroundColor: C.white,
        shadowColor: C.shadow,
        shadowOpacity: 0.04,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    currency: { fontSize: T.currency, color: C.ink },
    amountInput: { flex: 1, fontSize: T.amountInput, color: C.ink, padding: 0 },
    selectField: {
        height: 53,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        gap: 10,
        backgroundColor: C.white,
        shadowColor: C.shadow,
        shadowOpacity: 0.04,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    selectText: { flex: 1, fontSize: 16, color: C.ink },
    description: {
        minHeight: 96,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        paddingHorizontal: 13,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        color: C.ink,
        backgroundColor: C.white,
        shadowColor: C.shadow,
        shadowOpacity: 0.04,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    save: {
        height: 47,
        marginHorizontal: 22,
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#0B7654',
        shadowOpacity: 0.25,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
    },
    saveText: {
        color: C.white,
        fontSize: T.saveButton,
        fontWeight: T.saveButtonWeight,
    },
    validation: { color: C.error, fontSize: T.validation, marginTop: 4 },
    budgetHint: { color: C.muted, fontSize: T.hint, marginTop: -12, marginBottom: 12 },
    optionsError: {
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: C.errorBackground,
    },
    optionsErrorText: { color: C.error, fontSize: T.validation, textAlign: 'center' },
});
