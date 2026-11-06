/**
 * Add Transaction route.
 *
 * Owns the category, budget, and date selector sheets and persistence. The
 * form itself is the approved `AddTransactionScreen` component; this route
 * supplies real authenticated data or the versioned demo fixtures depending
 * on the single existing demo toggle.
 */

import { normalizeApiError } from '@/api/errors';
import {
    categoryIconName,
} from '@/components/transactions/categoryPresentation';
import DatePickerModal from '@/components/transactions/DatePickerModal';
import OptionSelectorModal from '@/components/transactions/OptionSelectorModal';
import {
    AddTransactionScreen,
    type SelectOption,
    type TransactionDraft,
    type TransactionKind,
} from '@/components/transactions/TransactionsScreens';
import ReceiptReviewModal from '@/components/receipts/ReceiptReviewModal';
import ReceiptScannerModal from '@/components/receipts/ReceiptScannerModal';
import ReceiptScanPreviewModal from '@/components/receipts/ReceiptScanPreviewModal';
import ReceiptUploadModal from '@/components/receipts/ReceiptUploadModal';
import { isDemoMode, transactionDataSource } from '@/contracts';
import { PREVIEW_SCAN_RESULT } from '@/constants/receiptPreviewFixtures';
import { useLocale } from '@/contexts/LocaleContext';
import { useTransactionFormOptions } from '@/hooks/useTransactionFormOptions';
import { systemCategoryLabel } from '@/localization/systemCategories';
import type {
    Budget,
    Category,
    MerchantDetails,
    PurchasedItem,
    TransactionRecord,
    TransactionType,
} from '@/types/transaction';
import type {
    ReceiptAttachmentState,
    ReceiptFileInfo,
    ReceiptRecognitionState,
    ReceiptUploadErrorKind,
} from '@/types/receipt';
import {
    currencySymbol,
    filterCategoriesForType,
    validateTransactionForm,
} from '@/utils/transactions';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Convert a local `YYYY-MM-DD` string into an ISO instant.
 *
 * @param {string} value The local date string.
 * @returns {string} The corresponding ISO 8601 timestamp.
 */
const localDateToISO = (value: string): string => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
};

/**
 * Convert an ISO instant into a local `YYYY-MM-DD` string.
 *
 * @param {Date} value The instant.
 * @returns {string} The local date string.
 */
const isoToLocalDate = (value: Date): string => {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
};

/**
 * Resolve a localized category label.
 *
 * @param {Category} category The category record.
 * @param {string} language The display language.
 * @returns {string} The localized label.
 */
const categoryLabel = (category: Category, language: string): string => {
    const label = systemCategoryLabel(category.id, language);
    return label === category.id ? category.name : label;
};

/**
 * Map categories to selector options for the approved form.
 *
 * @param {Category[]} categories The available categories.
 * @param {string} language The display language.
 * @param {TransactionKind} kind The selected transaction direction.
 * @returns {SelectOption[]} The selector options.
 */
const toCategoryOptions = (
    categories: Category[],
    language: string,
    kind: TransactionKind,
): SelectOption[] =>
    categories.map((category) => ({
        id: category.id,
        label: categoryLabel(category, language),
        iconName: categoryIconName(category, kind),
    }));

/**
 * Map budgets to selector options for the approved form.
 *
 * @param {Budget[]} budgets The available budgets.
 * @param {string} language The display language.
 * @returns {SelectOption[]} The selector options.
 */
const toBudgetOptions = (budgets: Budget[], language: string): SelectOption[] =>
    budgets.map((budget) => {
        const category = budget.category ?? null;
        return {
            id: budget.id,
            label: category ? categoryLabel(category, language) : 'Budget',
            iconName: categoryIconName(category, 'expense'),
        };
    });

/**
 * Render the Add Transaction screen and own its data flow.
 *
 * @returns {JSX.Element} The add transaction screen.
 */
const AddTransactionRoute = () => {
    const { language, currency } = useLocale();
    const params = useLocalSearchParams<{ id?: string; focus?: string }>();
    const editId = params.id;
    const { categories, budgets, loading, error, reload } = useTransactionFormOptions();
    const [editTransaction, setEditTransaction] = useState<TransactionRecord | null>(null);
    const [kind, setKind] = useState<TransactionKind>('expense');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [dateModalOpen, setDateModalOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanPreviewOpen, setScanPreviewOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [uploadError, setUploadError] = useState<ReceiptUploadErrorKind>('none');
    const [scanEnhancement, setScanEnhancement] = useState<'original' | 'auto' | 'grayscale'>('auto');
    const [receipt, setReceipt] = useState<ReceiptAttachmentState>({
        status: 'idle',
        file: null,
    });
    const [recognitionState, setRecognitionState] = useState<ReceiptRecognitionState>({
        status: 'idle',
    });
    const [merchant, setMerchant] = useState<MerchantDetails>({});
    const [items, setItems] = useState<PurchasedItem[]>([]);

    useEffect(() => {
        if (!editId) return;
        let active = true;
        transactionDataSource
            .get(editId)
            .then((record) => {
                if (active) setEditTransaction(record);
            })
            .catch(() => {
                if (active) setEditTransaction(null);
            });
        return () => {
            active = false;
        };
    }, [editId]);

    useEffect(() => {
        if (!editTransaction) return;
        setKind(editTransaction.transType === 'INCOME' ? 'income' : 'expense');
        setMerchant(editTransaction.merchant ?? {});
        setItems(editTransaction.items ?? []);
    }, [editTransaction]);

    const categoryOptions = useMemo(
        () =>
            toCategoryOptions(
                filterCategoriesForType(categories, kind === 'income' ? 'INCOME' : 'EXPENSE'),
                language,
                kind,
            ),
        [categories, kind, language],
    );
    const budgetOptions = useMemo(
        () => toBudgetOptions(budgets, language),
        [budgets, language],
    );

    const categorySetter = useRef<(id: string) => void>(() => {});
    const budgetSetter = useRef<(id: string | null) => void>(() => {});
    const dateSetter = useRef<(date: string) => void>(() => {});
    const [pendingCategoryId, setPendingCategoryId] = useState('');
    const [pendingBudgetId, setPendingBudgetId] = useState<string | null>(null);
    const [pendingDate, setPendingDate] = useState('');

    const openCategory = (
        _options: SelectOption[],
        selectedId: string,
        setId: (id: string) => void,
    ) => {
        categorySetter.current = setId;
        setPendingCategoryId(selectedId);
        setCategoryModalOpen(true);
    };

    const openBudget = (
        _options: SelectOption[],
        selectedId: string | null,
        setId: (id: string | null) => void,
    ) => {
        budgetSetter.current = setId;
        setPendingBudgetId(selectedId);
        setBudgetModalOpen(true);
    };

    const openDate = (current: string, setDate: (date: string) => void) => {
        dateSetter.current = setDate;
        setPendingDate(current);
        setDateModalOpen(true);
    };

    /**
     * Attach the UI-only scanned result and close the scan preview.
     */
    const confirmScan = () => {
        setScanPreviewOpen(false);
        setReceipt({
            status: 'selected',
            file: {
                id: PREVIEW_SCAN_RESULT.id,
                source: 'scanner',
                name: PREVIEW_SCAN_RESULT.name,
                kind: 'image',
                mimeType: PREVIEW_SCAN_RESULT.mimeType,
                sizeBytes: PREVIEW_SCAN_RESULT.sizeBytes,
                thumbnailUri: PREVIEW_SCAN_RESULT.thumbnailUri,
            },
        });
    };

    /**
     * Attach a UI-only uploaded sample and close the upload sheet.
     *
     * @param {import('@/types/receipt').ReceiptFileInfo} file The selected file.
     */
    const confirmUpload = (file: ReceiptFileInfo) => {
        setUploadOpen(false);
        setUploadError('none');
        setReceipt({ status: 'selected', file });
    };

    /**
     * Replace the current receipt using its original source.
     */
    const replaceReceipt = () => {
        if (receipt.file?.source === 'scanner') {
            setScannerOpen(true);
            return;
        }
        setUploadOpen(true);
    };

    /**
     * Remove the current receipt without changing form values.
     */
    const removeReceipt = () => {
        setReceipt({ status: 'idle', file: null });
        setRecognitionState({ status: 'idle' });
    };

    /**
     * Persist the approved draft and return to the transaction list.
     *
     * @param {TransactionDraft} draft The form draft.
     * @returns {Promise<void>}
     */
    const handleSave = async (draft: TransactionDraft): Promise<void> => {
        setFormError(null);
        const validation = validateTransactionForm(
            { amount: draft.amount, categoryId: draft.categoryId, description: draft.description },
            language,
        );
        if (Object.keys(validation).length > 0) {
            setFormError(validation.amount ?? validation.category ?? validation.description ?? null);
            return;
        }

        const type: TransactionType = draft.kind === 'income' ? 'INCOME' : 'EXPENSE';
        const category = categories.find((item) => item.id === draft.categoryId);
        if (!category) {
            setFormError('Select a category.');
            return;
        }

        setSaving(true);
        try {
            const dateISO = localDateToISO(draft.date);
            if (editId) {
                await transactionDataSource.update(editId, {
                    amount: draft.amount,
                    transType: type,
                    category: category.name,
                    categoryId: category.id,
                    description: draft.description.trim() || null,
                    transactionDate: dateISO,
                    merchant: draft.merchant ?? merchant,
                    items: draft.items ?? items,
                });
            } else {
                await transactionDataSource.create({
                    amount: draft.amount,
                    type,
                    category: category.name,
                    categoryId: category.id,
                    description: draft.description.trim() || undefined,
                    date: dateISO,
                });
            }
            router.back();
        } catch (cause) {
            setFormError(normalizeApiError(cause).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <AddTransactionScreen
                key={editTransaction?.id ?? 'create'}
                categories={categoryOptions}
                budgets={budgetOptions}
                currencySymbol={currencySymbol(language, currency)}
                language={language}
                currency={currency}
                saving={saving}
                optionsLoading={loading}
                optionsError={error}
                formError={formError}
                mode={editId ? 'edit' : 'create'}
                initialValues={
                    editTransaction
                        ? {
                              kind: editTransaction.transType === 'INCOME' ? 'income' : 'expense',
                              amount: String(editTransaction.amount),
                              categoryId: editTransaction.categoryId ?? '',
                              date: new Date(editTransaction.transactionDate).toISOString().slice(0, 10),
                              description: editTransaction.description ?? '',
                              budgetId: null,
                          }
                        : undefined
                }
                merchant={merchant}
                items={items}
                onMerchantChange={setMerchant}
                onItemsChange={setItems}
                onBack={() => router.back()}
                onRetryOptions={() => void reload()}
                onKindChange={setKind}
                onChooseCategory={openCategory}
                onChooseBudget={openBudget}
                onChooseDate={openDate}
                onSave={handleSave}
                onScanReceipt={() => setScannerOpen(true)}
                onUploadReceipt={() => setUploadOpen(true)}
                receipt={receipt.file ? receipt : null}
                onViewReceipt={() => setReviewOpen(true)}
                onReplaceReceipt={replaceReceipt}
                onRemoveReceipt={removeReceipt}
            />

            <ReceiptScannerModal
                visible={scannerOpen}
                onCapture={() => {
                    setScannerOpen(false);
                    setScanPreviewOpen(true);
                }}
                onCancel={() => setScannerOpen(false)}
            />
            <ReceiptScanPreviewModal
                visible={scanPreviewOpen}
                result={PREVIEW_SCAN_RESULT}
                enhancement={scanEnhancement}
                onEnhancementChange={setScanEnhancement}
                onRetake={() => {
                    setScanPreviewOpen(false);
                    setScannerOpen(true);
                }}
                onCrop={() => undefined}
                onConfirm={confirmScan}
                onCancel={() => setScanPreviewOpen(false)}
            />
            <ReceiptUploadModal
                visible={uploadOpen}
                demoMode={isDemoMode}
                selectedFile={receipt.file?.source === 'upload' ? receipt.file : null}
                errorKind={uploadError}
                onClose={() => setUploadOpen(false)}
                onSelectSample={confirmUpload}
                onReplace={() => {
                    setReceipt({ status: 'idle', file: null });
                    setUploadError('none');
                }}
                onRemove={() => {
                    setReceipt({ status: 'idle', file: null });
                    setUploadError('none');
                }}
            />
            <ReceiptReviewModal
                visible={reviewOpen}
                state={recognitionState}
                onClose={() => setReviewOpen(false)}
                onApply={() => setReviewOpen(false)}
            />

            <OptionSelectorModal
                visible={categoryModalOpen}
                title="Select category"
                options={categoryOptions}
                selectedId={pendingCategoryId}
                onClose={() => setCategoryModalOpen(false)}
                onSelect={(id) => categorySetter.current(id)}
            />

            <OptionSelectorModal
                visible={budgetModalOpen}
                title="Select a budget"
                options={budgetOptions}
                selectedId={pendingBudgetId}
                onClose={() => setBudgetModalOpen(false)}
                onSelect={(id) => budgetSetter.current(id)}
            />

            <DatePickerModal
                visible={dateModalOpen}
                value={new Date(`${pendingDate}T00:00:00`)}
                language={language}
                onClose={() => setDateModalOpen(false)}
                onSelect={(date) => dateSetter.current(isoToLocalDate(date))}
            />
        </>
    );
};

export default AddTransactionRoute;
