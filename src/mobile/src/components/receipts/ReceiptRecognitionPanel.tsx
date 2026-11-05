/**
 * Recognition status and review presentation.
 *
 * UI-only: values are editable for preview purposes but no OCR, API call, or
 * automatic form population is performed.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type {
    ReceiptRecognitionResult,
    ReceiptRecognitionState,
} from '@/types/receipt';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useState } from 'react';

const C = transactionColors;
const T = transactionTypography;

/** Props for the recognition panel. */
export interface ReceiptRecognitionPanelProps {
    state: ReceiptRecognitionState;
    onRetry?: () => void;
    onApply?: (result: ReceiptRecognitionResult) => void;
}

/**
 * Render one editable suggested field.
 *
 * @param {object} props Field props.
 * @returns {JSX.Element} The editable field.
 */
const EditableField = ({
    label,
    value,
    onChange,
    missing,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    missing?: boolean;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
            style={[styles.input, missing && styles.inputMissing]}
            value={value}
            onChangeText={onChange}
            placeholder="Not found"
            placeholderTextColor={C.muted}
        />
    </View>
);

/**
 * Render recognition status and an editable review card when suggestions
 * exist.
 *
 * @param {ReceiptRecognitionPanelProps} props Component props.
 * @returns {JSX.Element} The recognition panel.
 */
const ReceiptRecognitionPanel = ({
    state,
    onRetry,
    onApply,
}: ReceiptRecognitionPanelProps) => {
    const [result, setResult] = useState<ReceiptRecognitionResult>(
        () => state.result ?? {},
    );

    const update = (key: keyof ReceiptRecognitionResult, value: string) => {
        setResult((current) => ({ ...current, [key]: value }));
    };

    if (state.status === 'processing') {
        return (
            <View style={styles.statusCard}>
                <ActivityIndicator color={C.green} />
                <Text style={styles.statusText}>
                    {state.message || 'Processing receipt…'}
                </Text>
            </View>
        );
    }

    if (state.status === 'failed' || state.status === 'unavailable') {
        return (
            <View style={styles.statusCard}>
                <Ionicons
                    name={state.status === 'failed' ? 'alert-circle-outline' : 'information-circle-outline'}
                    size={22}
                    color={state.status === 'failed' ? C.error : C.muted}
                />
                <Text style={styles.statusText}>
                    {state.message || 'Receipt recognition is unavailable.'}
                </Text>
                {state.status === 'failed' && onRetry ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Retry recognition"
                        onPress={onRetry}
                    >
                        <Text style={styles.retry}>Retry</Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    if (state.status === 'idle') {
        return (
            <View style={styles.statusCard}>
                <Ionicons name="sparkles-outline" size={22} color={C.green} />
                <Text style={styles.statusText}>
                    Receipt recognition is ready when you are.
                </Text>
            </View>
        );
    }

    const missing = new Set(state.missingFields ?? []);
    const confidence = result.confidence;

    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View>
                    <Text style={styles.reviewTitle}>
                        {state.status === 'partial' ? 'Review partial results' : 'Receipt recognized'}
                    </Text>
                    <Text style={styles.reviewSubtitle}>
                        {state.message || 'Check the suggested values below.'}
                    </Text>
                </View>
                {typeof confidence === 'number' ? (
                    <View style={styles.confidence}>
                        <Text style={styles.confidenceText}>
                            {Math.round(confidence * 100)}%
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.fields}>
                <EditableField
                    label="Merchant"
                    value={result.merchant ?? ''}
                    onChange={(value) => update('merchant', value)}
                    missing={missing.has('merchant')}
                />
                <EditableField
                    label="Total"
                    value={result.total ?? ''}
                    onChange={(value) => update('total', value)}
                    missing={missing.has('total')}
                />
                <EditableField
                    label="Date"
                    value={result.date ?? ''}
                    onChange={(value) => update('date', value)}
                    missing={missing.has('date')}
                />
                <EditableField
                    label="Currency"
                    value={result.currency ?? ''}
                    onChange={(value) => update('currency', value)}
                    missing={missing.has('currency')}
                />
                <EditableField
                    label="Category"
                    value={result.categoryName ?? ''}
                    onChange={(value) => update('categoryName', value)}
                    missing={missing.has('categoryName')}
                />
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply suggested values"
                onPress={() => onApply?.(result)}
                style={styles.apply}
            >
                <Text style={styles.applyText}>Apply suggested values</Text>
            </Pressable>
        </View>
    );
};

/** Recognition panel styles. */
const styles = StyleSheet.create({
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    statusText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: C.ink,
    },
    retry: {
        fontSize: 13,
        fontWeight: '700',
        color: C.green,
    },
    reviewCard: {
        padding: 14,
        borderRadius: 16,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    reviewTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: C.ink,
    },
    reviewSubtitle: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4,
    },
    confidence: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    confidenceText: {
        fontSize: 13,
        fontWeight: '800',
        color: C.green,
    },
    fields: {
        gap: 10,
    },
    field: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
        color: C.ink,
        backgroundColor: C.background,
    },
    inputMissing: {
        borderColor: '#F0B9B9',
    },
    apply: {
        height: 48,
        marginTop: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.green,
    },
    applyText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default ReceiptRecognitionPanel;
