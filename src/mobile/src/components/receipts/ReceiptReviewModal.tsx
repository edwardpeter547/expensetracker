/**
 * Modal shell for reviewing recognition suggestions before saving.
 *
 * UI-only; the underlying recognition panel performs no OCR or form
 * population.
 */

import { Ionicons } from '@expo/vector-icons';
import ReceiptRecognitionPanel from '@/components/receipts/ReceiptRecognitionPanel';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type {
    ReceiptRecognitionResult,
    ReceiptRecognitionState,
} from '@/types/receipt';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/** Props for the review modal. */
export interface ReceiptReviewModalProps {
    visible: boolean;
    state: ReceiptRecognitionState;
    onClose: () => void;
    onRetry?: () => void;
    onApply?: (result: ReceiptRecognitionResult) => void;
}

/**
 * Render the receipt review modal.
 *
 * @param {ReceiptReviewModalProps} props Component props.
 * @returns {JSX.Element} The review modal.
 */
const ReceiptReviewModal = ({
    visible,
    state,
    onClose,
    onRetry,
    onApply,
}: ReceiptReviewModalProps) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Receipt Review</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close receipt review"
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color={C.ink} />
                        </Pressable>
                    </View>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                    >
                        <ReceiptRecognitionPanel
                            state={state}
                            onRetry={onRetry}
                            onApply={onApply}
                        />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

/** Review modal styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        maxHeight: '88%',
        backgroundColor: C.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    title: {
        fontSize: T.modalTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    content: {
        paddingBottom: 8,
    },
});

export default ReceiptReviewModal;
