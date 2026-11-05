/**
 * UI-only scanner shell for the future native document scanner.
 *
 * This component never accesses the camera. The viewfinder is an explicit
 * placeholder that anticipates the native scanner's camera feed and boundary
 * overlay.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import type { ReceiptScannerMode } from '@/types/receipt';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = transactionColors;
const T = transactionTypography;

/** Props for the scanner shell. */
export interface ReceiptScannerModalProps {
    visible: boolean;
    mode?: ReceiptScannerMode;
    processing?: boolean;
    onModeChange?: (mode: ReceiptScannerMode) => void;
    onCapture: () => void;
    onCancel: () => void;
}

/**
 * Render a single corner bracket for the document outline.
 *
 * @param {object} props Corner props.
 * @returns {JSX.Element} The corner bracket.
 */
const Corner = ({ style }: { style: object }) => <View style={[styles.corner, style]} />;

/**
 * Render the document viewfinder placeholder and capture controls.
 *
 * @param {ReceiptScannerModalProps} props Component props.
 * @returns {JSX.Element} The scanner modal.
 */
const ReceiptScannerModal = ({
    visible,
    mode = 'auto',
    processing = false,
    onModeChange,
    onCapture,
    onCancel,
}: ReceiptScannerModalProps) => {
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel scan"
                        onPress={onCancel}
                        style={styles.headerButton}
                    >
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Scan Receipt</Text>
                    <View style={styles.headerButton} />
                </View>

                <View style={styles.modeRow}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Automatic capture"
                        onPress={() => onModeChange?.('auto')}
                        style={[styles.modeButton, mode === 'auto' && styles.modeButtonActive]}
                    >
                        <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>
                            Auto
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Manual capture"
                        onPress={() => onModeChange?.('manual')}
                        style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
                    >
                        <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
                            Manual
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.viewfinder}>
                    <Ionicons name="receipt-outline" size={58} color="#8EA6C4" />
                    <Text style={styles.viewfinderText}>Camera preview placeholder</Text>
                    <Text style={styles.viewfinderHint}>
                        The native document scanner will provide the live camera view.
                    </Text>

                    <Corner style={styles.cornerTopLeft} />
                    <Corner style={styles.cornerTopRight} />
                    <Corner style={styles.cornerBottomLeft} />
                    <Corner style={styles.cornerBottomRight} />
                </View>

                {processing ? (
                    <View style={styles.processing}>
                        <ActivityIndicator color="#FFFFFF" />
                        <Text style={styles.processingText}>Preparing scan…</Text>
                    </View>
                ) : (
                    <View style={styles.controls}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Capture receipt"
                            onPress={onCapture}
                            style={styles.captureButton}
                        >
                            <View style={styles.captureInner} />
                        </Pressable>
                    </View>
                )}

                <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                    <Text style={styles.footerText}>
                        Position the receipt inside the outline.
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

/** Scanner shell styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#0B1B2B',
    },
    header: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C3348',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: T.screenTitle,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    modeRow: {
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
        padding: 4,
        borderRadius: 12,
        backgroundColor: '#163047',
    },
    modeButton: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 9,
    },
    modeButtonActive: {
        backgroundColor: C.green,
    },
    modeText: {
        color: '#B9CADD',
        fontSize: 13,
        fontWeight: '600',
    },
    modeTextActive: {
        color: '#FFFFFF',
    },
    viewfinder: {
        flex: 1,
        margin: 22,
        borderRadius: 20,
        backgroundColor: '#10283D',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    viewfinderText: {
        color: '#D8E5F2',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
        textAlign: 'center',
    },
    viewfinderHint: {
        color: '#8EA6C4',
        fontSize: 12,
        lineHeight: 17,
        marginTop: 6,
        textAlign: 'center',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#36C58B',
    },
    cornerTopLeft: {
        top: 12,
        left: 12,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    cornerTopRight: {
        top: 12,
        right: 12,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    cornerBottomLeft: {
        bottom: 12,
        left: 12,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    cornerBottomRight: {
        bottom: 12,
        right: 12,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    processing: {
        height: 92,
        alignItems: 'center',
        justifyContent: 'center',
    },
    processingText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginTop: 8,
    },
    controls: {
        height: 92,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
    },
    footer: {
        alignItems: 'center',
        paddingTop: 12,
    },
    footerText: {
        color: '#8EA6C4',
        fontSize: 12,
    },
});

export default ReceiptScannerModal;
