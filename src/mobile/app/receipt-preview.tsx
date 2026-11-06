/**
 * Demo-gated gallery for the receipt UI components.
 *
 * This route is for visual development only. It renders the UI-only states
 * when the existing `isDemoMode` toggle is on and never invokes hardware or
 * backend behavior.
 */

import ReceiptActionButtons from '@/components/receipts/ReceiptActionButtons';
import ReceiptAttachmentPreview from '@/components/receipts/ReceiptAttachmentPreview';
import ReceiptRecognitionPanel from '@/components/receipts/ReceiptRecognitionPanel';
import ReceiptScannerModal from '@/components/receipts/ReceiptScannerModal';
import ReceiptScanPreviewModal from '@/components/receipts/ReceiptScanPreviewModal';
import ReceiptUploadModal from '@/components/receipts/ReceiptUploadModal';
import { isDemoMode } from '@/contracts';
import {
    PREVIEW_ATTACHMENT_STATES,
    PREVIEW_RECOGNITION_STATES,
    PREVIEW_SCAN_RESULT,
} from '@/constants/receiptPreviewFixtures';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { ReceiptFileInfo } from '@/types/receipt';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/**
 * Render a labeled preview section.
 *
 * @param {object} props Section props.
 * @returns {JSX.Element} The section.
 */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

/**
 * Render the receipt UI preview gallery.
 *
 * @returns {JSX.Element} The preview route.
 */
const ReceiptPreviewRoute = () => {
    const insets = useSafeAreaInsets();
    const [showScanner, setShowScanner] = useState(false);
    const [showScanPreview, setShowScanPreview] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState<ReceiptFileInfo | null>(null);
    const [enhancement, setEnhancement] = useState<'original' | 'auto' | 'grayscale'>('auto');

    if (!isDemoMode) {
        return (
            <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
                <Text style={styles.disabledText}>Receipt UI preview is only available in demo mode.</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.screen, { paddingTop: insets.top + 12 }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    onPress={() => router.back()}
                    style={styles.back}
                >
                    <Text style={styles.backText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>Receipt UI Preview</Text>
                <View style={styles.back} />
            </View>

            <Section title="Expense receipt actions">
                <ReceiptActionButtons
                    onScan={() => setShowScanner(true)}
                    onUpload={() => setShowUpload(true)}
                />
            </Section>

            <Section title="Attachment states">
                <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.imageSelected} />
                <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.imageProcessing} />
                <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.pdfSelected} />
                <ReceiptAttachmentPreview attachment={PREVIEW_ATTACHMENT_STATES.error} />
            </Section>

            <Section title="Recognition states">
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.idle} />
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.processing} />
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.success} />
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.partial} />
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.failed} />
                <ReceiptRecognitionPanel state={PREVIEW_RECOGNITION_STATES.unavailable} />
            </Section>

            <ReceiptScannerModal
                visible={showScanner}
                onCapture={() => {
                    setShowScanner(false);
                    setShowScanPreview(true);
                }}
                onCancel={() => setShowScanner(false)}
            />
            <ReceiptScanPreviewModal
                visible={showScanPreview}
                result={PREVIEW_SCAN_RESULT}
                enhancement={enhancement}
                onEnhancementChange={setEnhancement}
                onRetake={() => {
                    setShowScanPreview(false);
                    setShowScanner(true);
                }}
                onCrop={() => undefined}
                onConfirm={() => setShowScanPreview(false)}
                onCancel={() => setShowScanPreview(false)}
            />
            <ReceiptUploadModal
                visible={showUpload}
                demoMode
                selectedFile={uploadFile}
                onClose={() => setShowUpload(false)}
                onSelectSample={setUploadFile}
                onReplace={() => setUploadFile(null)}
                onRemove={() => setUploadFile(null)}
            />
        </ScrollView>
    );
};

/** Preview route styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 6,
    },
    back: {
        width: 58,
    },
    backText: {
        color: C.green,
        fontSize: 14,
        fontWeight: '700',
    },
    title: {
        color: C.ink,
        fontSize: T.screenTitle,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        marginHorizontal: 22,
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: C.muted,
    },
    disabledText: {
        fontSize: 15,
        color: C.muted,
        textAlign: 'center',
    },
});

export default ReceiptPreviewRoute;
