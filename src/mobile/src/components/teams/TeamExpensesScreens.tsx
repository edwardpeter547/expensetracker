/**
 * Team Shared Expenses list and Record Team Expense screens.
 *
 * The record screen reuses the existing receipt scanner, upload, review, and
 * purchased-item components rather than rebuilding them. It adds team context
 * and payer attribution, and saves only to the in-memory team store.
 */

import ReceiptActionButtons, {
    ReceiptManualEntryDivider,
} from '@/components/receipts/ReceiptActionButtons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import ReceiptReviewModal from '@/components/receipts/ReceiptReviewModal';
import ReceiptScannerModal from '@/components/receipts/ReceiptScannerModal';
import ReceiptScanPreviewModal from '@/components/receipts/ReceiptScanPreviewModal';
import ReceiptUploadModal from '@/components/receipts/ReceiptUploadModal';
import PurchasedItemsEditor from '@/components/transactions/PurchasedItemsEditor';
import {
    PlanningButton,
    PlanningField,
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { MoneyText } from '@/components/ui/MoneyText';
import { PREVIEW_SCAN_RESULT } from '@/constants/receiptPreviewFixtures';
import { TeamCard, TeamSelectChips } from '@/components/teams/teamsPrimitives';
import type { Team, TeamExpense, TeamMember } from '@/types/team';
import type { PurchasedItem } from '@/types/transaction';
import type {
    ReceiptAttachmentState,
    ReceiptFileInfo,
    ReceiptRecognitionState,
    ReceiptUploadErrorKind,
} from '@/types/receipt';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the Shared Expenses list screen. */
export interface TeamSharedExpensesScreenProps {
    team: Team;
    expenses: TeamExpense[];
    currency: string;
    language: string;
    onBack: () => void;
    onRecordExpense: () => void;
}

/**
 * Render the team's recorded expenses.
 *
 * @param {TeamSharedExpensesScreenProps} props Component props.
 * @returns {JSX.Element} The shared expenses screen.
 */
export const TeamSharedExpensesScreen = ({
    team,
    expenses,
    currency,
    language,
    onBack,
    onRecordExpense,
}: TeamSharedExpensesScreenProps) => {
    const { t } = useTranslation('teams');
    return (
    <PlanningScreen title={t('Shared Expenses')} subtitle={t('{{name}} · recorded purchases', { name: team.name })} onBack={onBack}>
        <TeamCard>
            <Text style={planningStyles.muted}>{t('Recorded by team members')}</Text>
            {expenses.length === 0 ? (
                <Text style={planningStyles.muted}>{t('No team expenses recorded yet.')}</Text>
            ) : (
                expenses.map((expense) => (
                    <View key={expense.id} style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIcon name="receipt" color={planningColors.blue} size={24} />
                        <View style={{ flex: 1 }}>
                            <Text style={planningStyles.body}>{expense.name}</Text>
                            <Text style={planningStyles.muted}>
                                {t('Paid by {{name}}', { name: expense.paidBy })}
                                {expense.category ? ` · ${expense.category}` : ''}
                            </Text>
                        </View>
                        <MoneyText
                            value={expense.amount}
                            currency={currency}
                            language={language}
                            style={planningStyles.body}
                        />
                    </View>
                ))
            )}
        </TeamCard>
        <PlanningButton label={t('Record Expense')} onPress={onRecordExpense} />
        <Text style={styles.note}>
            {t('Production records will attach receipts and line items through the shared transaction flow.')}
        </Text>
    </PlanningScreen>
    );
};

/** Props for the Record Team Expense screen. */
export interface TeamRecordExpenseScreenProps {
    team: Team;
    members: TeamMember[];
    currency: string;
    language: string;
    onBack: () => void;
    onSave: (input: {
        name: string;
        amount: number;
        paidBy: string;
        date: string;
        category?: string;
        receiptId?: string;
        items?: PurchasedItem[];
    }) => void;
}

/**
 * Render the Record Team Expense screen.
 *
 * @param {TeamRecordExpenseScreenProps} props Component props.
 * @returns {JSX.Element} The record expense screen.
 */
export const TeamRecordExpenseScreen = ({
    team,
    members,
    currency,
    language,
    onBack,
    onSave,
}: TeamRecordExpenseScreenProps) => {
    const { t } = useTranslation('teams');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [category, setCategory] = useState('Food');
    const [paidBy, setPaidBy] = useState('You');
    const [items, setItems] = useState<PurchasedItem[]>([]);
    const [receipt, setReceipt] = useState<ReceiptAttachmentState>({ status: 'idle', file: null });
    const [recognitionState, setRecognitionState] = useState<ReceiptRecognitionState>({ status: 'idle' });
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanPreviewOpen, setScanPreviewOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [uploadError, setUploadError] = useState<ReceiptUploadErrorKind>('none');
    const [scanEnhancement, setScanEnhancement] = useState<'original' | 'auto' | 'grayscale'>('auto');

    const payerOptions = members.map((member) => member.name);

    /**
     * Confirm a UI-only scanned receipt and close the preview.
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
     * Confirm a UI-only uploaded receipt and close the sheet.
     *
     * @param {ReceiptFileInfo} file The selected file.
     */
    const confirmUpload = (file: ReceiptFileInfo) => {
        setUploadOpen(false);
        setUploadError('none');
        setReceipt({ status: 'selected', file });
    };

    /**
     * Validate and emit the expense draft.
     */
    const submit = () => {
        const numericAmount = Number(amount);
        if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
        onSave({
            name: name.trim(),
            amount: numericAmount,
            paidBy,
            date: new Date(`${date}T12:00:00`).toISOString(),
            category: category.trim() || undefined,
            receiptId: receipt.file?.id,
            items: items.length > 0 ? items : undefined,
        });
    };

    return (
        <>
            <PlanningScreen title={t('Record Team Expense')} subtitle={t('{{name}} · payer attributed', { name: team.name })} onBack={onBack}>
                <ReceiptActionButtons
                    onScan={() => setScannerOpen(true)}
                    onUpload={() => setUploadOpen(true)}
                />
                <ReceiptManualEntryDivider />
                {receipt.file ? (
                    <ReceiptAttachmentPreview
                        attachment={receipt}
                        onView={() => setReviewOpen(true)}
                        onReplace={() => {
                            if (receipt.file?.source === 'scanner') setScannerOpen(true);
                            else setUploadOpen(true);
                        }}
                        onRemove={() => {
                            setReceipt({ status: 'idle', file: null });
                            setRecognitionState({ status: 'idle' });
                        }}
                    />
                ) : null}

                <TeamCard>
                    <PlanningField
                        label={t('Expense description')}
                        value={name}
                        onChange={setName}
                        placeholder={t('e.g. Groceries')}
                    />
                    <PlanningField
                        label={t('Amount')}
                        value={amount}
                        onChange={setAmount}
                        keyboardType="numeric"
                        placeholder="85"
                    />
                    <PlanningField label={t('Date (YYYY-MM-DD)')} value={date} onChange={setDate} placeholder="2026-11-01" />
                    <PlanningField label={t('Category')} value={category} onChange={setCategory} placeholder="Food" />
                    <Text style={planningStyles.fieldLabel}>{t('Paid by')}</Text>
                    <TeamSelectChips
                        options={payerOptions.map((value) => ({ value, label: value }))}
                        value={paidBy}
                        onChange={setPaidBy}
                    />
                    <PurchasedItemsEditor
                        items={items}
                        transactionAmount={amount || '0'}
                        language={language}
                        currency={currency}
                        onChange={setItems}
                    />
                    <Text style={styles.note}>
                        {t('Receipt scanning and line items reuse the existing shared components.')}
                    </Text>
                </TeamCard>
                <PlanningButton label={t('Save Team Expense')} onPress={submit} />
                <Text style={styles.note}>
                    {t('Demo only — the expense is stored in memory and is not sent to the backend.')}
                </Text>
            </PlanningScreen>

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
                demoMode
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
        </>
    );
};

/** Expense screen styles. */
const styles = StyleSheet.create({
    note: {
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
        textAlign: 'center',
    },
});
