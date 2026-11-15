/**
 * Optional merchant details editor used by the Add and Edit transaction forms.
 *
 * Merchant metadata is presentation-only (the backend transaction row does not
 * persist merchant fields), so the component keeps the values in the existing
 * `MerchantDetails` shape without inventing new persistence contracts.
 */

import OptionSelectorModal from '@/components/transactions/OptionSelectorModal';
import TimePickerModal from '@/components/transactions/TimePickerModal';
import type { SelectOption } from '@/components/transactions/TransactionsScreens';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { MerchantDetails } from '@/types/transaction';
import { useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Supported payment-method labels stored verbatim as strings. */
const PAYMENT_METHODS: readonly string[] = [
    'Card',
    'Cash',
    'Bank Transfer',
    'Direct Debit',
    'Standing Order',
    'Mobile Payment',
    'Other',
];

/** Props for the merchant editor. */
export interface MerchantDetailsFieldsProps {
    value: MerchantDetails;
    language: string;
    onChange: (value: MerchantDetails) => void;
}

/**
 * Build payment-method selector options, preserving any legacy value that is
 * not part of the fixed list so it can still be displayed and selected.
 *
 * @param {string|undefined} current The currently stored payment method.
 * @returns {SelectOption[]} The selector options.
 */
const paymentOptions = (current: string | undefined): SelectOption[] => {
    const labels = current && !PAYMENT_METHODS.includes(current)
        ? [...PAYMENT_METHODS, current]
        : [...PAYMENT_METHODS];
    return labels.map((label) => ({ id: label, label }));
};

/**
 * Render optional merchant fields.
 *
 * @param {MerchantDetailsFieldsProps} props Component props.
 * @returns {JSX.Element} The merchant editor.
 */
const MerchantDetailsFields = ({ value, language, onChange }: MerchantDetailsFieldsProps) => {
    const { t } = useTranslation('transactions');
    const [expanded, setExpanded] = useState(true);
    const [timePickerOpen, setTimePickerOpen] = useState(false);
    const [paymentPickerOpen, setPaymentPickerOpen] = useState(false);

    const setField = (key: keyof MerchantDetails, next: string) => {
        onChange({ ...value, [key]: next });
    };

    return (
        <View style={styles.section}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Toggle merchant details')}
                onPress={() => setExpanded((current) => !current)}
                style={styles.toggle}
            >
                <Text style={styles.title}>{t('Merchant Details')}</Text>
                <Text style={styles.toggleText}>{expanded ? t('Hide') : t('Show')}</Text>
            </Pressable>

            {expanded ? (
                <View style={styles.fields}>
                    <Field
                        label={t('Merchant name')}
                        value={value.name ?? ''}
                        onChange={(next) => setField('name', next)}
                    />
                    <Field
                        label={t('Merchant address')}
                        value={value.address ?? ''}
                        onChange={(next) => setField('address', next)}
                        multiline
                    />
                    <View style={styles.field}>
                        <Text style={styles.label}>{t('Purchase time')}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Purchase time')}
                            onPress={() => setTimePickerOpen(true)}
                            style={styles.input}
                        >
                            <Text style={value.purchaseTime ? styles.value : styles.placeholder}>
                                {value.purchaseTime || t('Optional')}
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>{t('Payment method')}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Payment method')}
                            onPress={() => setPaymentPickerOpen(true)}
                            style={styles.input}
                        >
                            <Text style={value.paymentMethod ? styles.value : styles.placeholder}>
                                {value.paymentMethod || t('Optional')}
                            </Text>
                        </Pressable>
                    </View>
                    <Field
                        label={t('Receipt / transaction reference')}
                        value={value.reference ?? ''}
                        onChange={(next) => setField('reference', next)}
                    />
                </View>
            ) : null}

            <TimePickerModal
                visible={timePickerOpen}
                value={value.purchaseTime ?? null}
                language={language}
                onClose={() => setTimePickerOpen(false)}
                onSelect={(time) => setField('purchaseTime', time)}
            />

            <OptionSelectorModal
                visible={paymentPickerOpen}
                title={t('Payment method')}
                options={paymentOptions(value.paymentMethod)}
                selectedId={value.paymentMethod ?? null}
                onClose={() => setPaymentPickerOpen(false)}
                onSelect={(id) => setField('paymentMethod', id)}
            />
        </View>
    );
};

/** One optional merchant field. */
const Field = ({
    label,
    value,
    onChange,
    multiline = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
}) => {
    const { t } = useTranslation('transactions');

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                value={value}
                onChangeText={onChange}
                placeholder={t('Optional')}
                placeholderTextColor={C.muted}
                style={[styles.input, multiline && styles.multiline]}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    );
};

/** Merchant editor styles. */
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
    fields: {
        gap: 10,
        marginTop: 8,
    },
    field: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        color: C.muted,
    },
    input: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 11,
        paddingHorizontal: 12,
        fontSize: 15,
        color: C.ink,
        backgroundColor: C.white,
        justifyContent: 'center',
    },
    multiline: {
        minHeight: 88,
        paddingTop: 12,
        paddingBottom: 12,
        textAlignVertical: 'top',
    },
    value: {
        fontSize: 15,
        color: C.ink,
    },
    placeholder: {
        fontSize: 15,
        color: C.muted,
    },
});

export default MerchantDetailsFields;
