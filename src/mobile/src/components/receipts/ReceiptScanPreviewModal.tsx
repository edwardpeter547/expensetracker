/**
 * UI-only scan-preview shell for reviewing a future native scanner result.
 *
 * The image area is a placeholder; no image processing, cropping, or
 * enhancement is performed.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { ReceiptScanResult } from '@/types/receipt';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the scan-preview shell. */
export interface ReceiptScanPreviewModalProps {
    visible: boolean;
    result: ReceiptScanResult | null;
    enhancement: 'original' | 'auto' | 'grayscale';
    onEnhancementChange: (enhancement: 'original' | 'auto' | 'grayscale') => void;
    onRetake: () => void;
    onCrop: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/** One enhancement option. */
const ENHANCEMENTS: { key: 'original' | 'auto' | 'grayscale'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'original', label: 'Original', icon: 'image-outline' },
    { key: 'auto', label: 'Auto enhance', icon: 'sparkles-outline' },
    { key: 'grayscale', label: 'Grayscale', icon: 'contrast-outline' },
];

/**
 * Render the scan-preview modal.
 *
 * @param {ReceiptScanPreviewModalProps} props Component props.
 * @returns {JSX.Element} The preview modal.
 */
const ReceiptScanPreviewModal = ({
    visible,
    result,
    enhancement,
    onEnhancementChange,
    onRetake,
    onCrop,
    onConfirm,
    onCancel,
}: ReceiptScanPreviewModalProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation('transactions');

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Close scan preview')}
                        onPress={onCancel}
                        style={styles.headerButton}
                    >
                        <Ionicons name="close" size={22} color={C.ink} />
                    </Pressable>
                    <Text style={styles.headerTitle}>{t('Review Scan')}</Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.preview}>
                    <Ionicons name="document-outline" size={64} color="#8EA6C4" />
                    <Text style={styles.previewTitle}>{t('Scanned receipt preview')}</Text>
                    <Text style={styles.previewHint}>
                        {t('The native scanner will place the corrected receipt image here.')}
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>{t('Enhancement')}</Text>
                <View style={styles.enhancements}>
                    {ENHANCEMENTS.map((option) => {
                        const active = option.key === enhancement;
                        return (
                            <Pressable
                                key={option.key}
                                accessibilityRole="button"
                                accessibilityLabel={t(option.label)}
                                onPress={() => onEnhancementChange(option.key)}
                                style={[styles.enhancement, active && styles.enhancementActive]}
                            >
                                <Ionicons
                                    name={option.icon}
                                    size={16}
                                    color={active ? C.white : C.green}
                                />
                                <Text
                                    style={[
                                        styles.enhancementText,
                                        active && styles.enhancementTextActive,
                                    ]}
                                >
                                    {t(option.label)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.tools}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Crop or adjust')}
                        onPress={onCrop}
                        style={styles.tool}
                    >
                        <Ionicons name="crop-outline" size={20} color={C.green} />
                        <Text style={styles.toolText}>{t('Crop / Adjust')}</Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Retake scan')}
                        onPress={onRetake}
                        style={styles.tool}
                    >
                        <Ionicons name="refresh-outline" size={20} color={C.green} />
                        <Text style={styles.toolText}>{t('Retake')}</Text>
                    </Pressable>
                </View>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Use Receipt')}
                        onPress={onConfirm}
                        style={styles.confirmButton}
                    >
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        <Text style={styles.confirmText}>{t('Use Receipt')}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

/** Scan preview styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    header: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.pale,
    },
    headerTitle: {
        fontSize: T.screenTitle,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: C.ink,
    },
    preview: {
        height: 270,
        marginHorizontal: 22,
        marginTop: 22,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: '#EAF0F6',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    previewTitle: {
        color: C.ink,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
    },
    previewHint: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
        marginTop: 6,
    },
    sectionLabel: {
        marginHorizontal: 22,
        marginTop: 22,
        marginBottom: 9,
        fontSize: T.fieldLabel,
        fontWeight: T.fieldLabelWeight,
        color: C.label,
    },
    enhancements: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 22,
    },
    enhancement: {
        flex: 1,
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.white,
    },
    enhancementActive: {
        backgroundColor: C.green,
        borderColor: C.green,
    },
    enhancementText: {
        fontSize: 12,
        fontWeight: '600',
        color: C.green,
    },
    enhancementTextActive: {
        color: C.white,
    },
    tools: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 22,
        marginTop: 18,
    },
    tool: {
        flex: 1,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.white,
    },
    toolText: {
        fontSize: 14,
        fontWeight: '600',
        color: C.ink,
    },
    footer: {
        marginTop: 'auto',
        paddingHorizontal: 22,
        paddingTop: 18,
    },
    confirmButton: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        backgroundColor: C.green,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ReceiptScanPreviewModal;
