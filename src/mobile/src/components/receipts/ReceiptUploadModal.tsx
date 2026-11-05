/**
 * UI-only upload selection sheet for the future receipt picker.
 *
 * No system picker or file access is used. Sample choices are explicitly
 * labeled UI previews and only appear in demo mode.
 */

import { Ionicons } from '@expo/vector-icons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { ReceiptFileInfo, ReceiptUploadErrorKind } from '@/types/receipt';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/** Props for the upload selection sheet. */
export interface ReceiptUploadModalProps {
    visible: boolean;
    demoMode: boolean;
    selectedFile: ReceiptFileInfo | null;
    errorKind?: ReceiptUploadErrorKind;
    onClose: () => void;
    onSelectSample: (file: ReceiptFileInfo) => void;
    onReplace: () => void;
    onRemove: () => void;
}

/**
 * Resolve the upload error copy for a given error kind.
 *
 * @param {ReceiptUploadErrorKind} kind The error kind.
 * @returns {string} The error message.
 */
const errorMessage = (kind: ReceiptUploadErrorKind): string => {
    switch (kind) {
        case 'unsupported':
            return 'Unsupported file type. Use JPG, PNG, HEIC, or PDF.';
        case 'oversized':
            return 'This file is too large. Choose a receipt under 10 MB.';
        case 'cancelled':
            return 'Selection cancelled.';
        default:
            return '';
    }
};

/**
 * Render the upload selection sheet.
 *
 * @param {ReceiptUploadModalProps} props Component props.
 * @returns {JSX.Element} The upload modal.
 */
const ReceiptUploadModal = ({
    visible,
    demoMode,
    selectedFile,
    errorKind = 'none',
    onClose,
    onSelectSample,
    onReplace,
    onRemove,
}: ReceiptUploadModalProps) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Upload Receipt</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close upload"
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color={C.ink} />
                        </Pressable>
                    </View>

                    <View style={styles.supported}>
                        <Ionicons name="document-outline" size={16} color={C.muted} />
                        <Text style={styles.supportedText}>
                            JPG, PNG, HEIC, or PDF · up to 10 MB
                        </Text>
                    </View>

                    {selectedFile ? (
                        <ReceiptAttachmentPreview
                            attachment={{
                                status: 'selected',
                                file: selectedFile,
                            }}
                            onView={() => undefined}
                            onReplace={onReplace}
                            onRemove={onRemove}
                        />
                    ) : (
                        <View style={styles.dropZone}>
                            <View style={styles.dropIcon}>
                                <Ionicons name="cloud-upload-outline" size={28} color={C.green} />
                            </View>
                            <Text style={styles.dropTitle}>Choose an existing receipt</Text>
                            <Text style={styles.dropHint}>
                                The system file picker will be wired here in a future task.
                            </Text>
                        </View>
                    )}

                    {demoMode && !selectedFile ? (
                        <View style={styles.samples}>
                            <Text style={styles.samplesLabel}>UI preview samples</Text>
                            <View style={styles.sampleRow}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Preview image receipt"
                                    onPress={() =>
                                        onSelectSample({
                                            id: 'preview-image-receipt',
                                            source: 'upload',
                                            name: 'grocery-receipt.jpg',
                                            kind: 'image',
                                            mimeType: 'image/jpeg',
                                            sizeBytes: 204_800,
                                        })
                                    }
                                    style={styles.sample}
                                >
                                    <Ionicons name="image-outline" size={18} color={C.green} />
                                    <Text style={styles.sampleText}>Image receipt</Text>
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Preview PDF receipt"
                                    onPress={() =>
                                        onSelectSample({
                                            id: 'preview-pdf-receipt',
                                            source: 'upload',
                                            name: 'hotel-bill.pdf',
                                            kind: 'pdf',
                                            mimeType: 'application/pdf',
                                            sizeBytes: 512_000,
                                        })
                                    }
                                    style={styles.sample}
                                >
                                    <Ionicons name="document-text-outline" size={18} color={C.green} />
                                    <Text style={styles.sampleText}>PDF receipt</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : null}

                    {errorKind !== 'none' ? (
                        <View style={styles.error}>
                            <Ionicons name="alert-circle-outline" size={18} color={C.error} />
                            <Text style={styles.errorText}>{errorMessage(errorKind)}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

/** Upload sheet styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
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
        marginBottom: 10,
    },
    title: {
        fontSize: T.modalTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    supported: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 12,
    },
    supportedText: {
        fontSize: 12,
        color: C.muted,
    },
    dropZone: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: C.line,
        borderRadius: 16,
        backgroundColor: C.white,
    },
    dropIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    dropTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: C.ink,
        marginTop: 12,
    },
    dropHint: {
        fontSize: 12,
        lineHeight: 17,
        color: C.muted,
        textAlign: 'center',
        marginTop: 6,
    },
    samples: {
        marginTop: 18,
    },
    samplesLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
        color: C.muted,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    sampleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    sample: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.white,
    },
    sampleText: {
        fontSize: 13,
        fontWeight: '600',
        color: C.ink,
    },
    error: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: C.errorBackground,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: C.error,
    },
});

export default ReceiptUploadModal;
