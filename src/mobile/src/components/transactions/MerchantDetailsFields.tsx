/**
 * Optional merchant details editor used by the transaction edit form.
 */

import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { MerchantDetails } from '@/types/transaction';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the merchant editor. */
export interface MerchantDetailsFieldsProps {
    value: MerchantDetails;
    onChange: (value: MerchantDetails) => void;
}

/**
 * Render optional merchant fields.
 *
 * @param {MerchantDetailsFieldsProps} props Component props.
 * @returns {JSX.Element} The merchant editor.
 */
const MerchantDetailsFields = ({ value, onChange }: MerchantDetailsFieldsProps) => {
    const { t } = useTranslation('transactions');
    const [expanded, setExpanded] = useState(true);

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
                    <Field label={t('Merchant name')} value={value.name ?? ''} onChange={(next) => setField('name', next)} />
                    <Field label={t('Merchant address')} value={value.address ?? ''} onChange={(next) => setField('address', next)} />
                    <Field label={t('Purchase time')} value={value.purchaseTime ?? ''} onChange={(next) => setField('purchaseTime', next)} />
                    <Field label={t('Payment method')} value={value.paymentMethod ?? ''} onChange={(next) => setField('paymentMethod', next)} />
                    <Field label={t('Receipt / transaction reference')} value={value.reference ?? ''} onChange={(next) => setField('reference', next)} />
                </View>
            ) : null}
        </View>
    );
};

/** One optional merchant field. */
const Field = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) => {
    const { t } = useTranslation('transactions');

    return (
    <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={t('Optional')}
            placeholderTextColor={C.muted}
            style={styles.input}
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
        height: 46,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 11,
        paddingHorizontal: 12,
        fontSize: 15,
        color: C.ink,
        backgroundColor: C.white,
    },
});

export default MerchantDetailsFields;
