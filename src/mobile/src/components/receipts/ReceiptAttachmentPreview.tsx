/**
 * Compact receipt attachment preview for the Add Transaction form.
 *
 * UI-only: view, replace, and remove are presentation actions supplied by the
 * host and perform no real file operations.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
} from '@/constants/transactionsTheme';
import type { ReceiptAttachmentState } from '@/types/receipt';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const C = transactionColors;

/** Props for the attachment preview. */
export interface ReceiptAttachmentPreviewProps {
    attachment: ReceiptAttachmentState;
    onView?: () => void;
    onReplace?: () => void;
    onRemove?: () => void;
}

/**
 * Format a byte count into a compact human-readable label.
 *
 * @param {number|undefined} bytes The byte count.
 * @returns {string} The formatted size.
 */
const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Render the compact receipt attachment preview.
 *
 * @param {ReceiptAttachmentPreviewProps} props Component props.
 * @returns {JSX.Element} The attachment preview.
 */
const ReceiptAttachmentPreview = ({
    attachment,
    onView,
    onReplace,
    onRemove,
}: ReceiptAttachmentPreviewProps) => {
    const file = attachment.file;
    const size = formatSize(file?.sizeBytes);

    if (!file && attachment.status !== 'error') {
        return (
            <View style={styles.empty}>
                <Ionicons name="document-attach-outline" size={18} color={C.muted} />
                <Text style={styles.emptyText}>No receipt attached</Text>
            </View>
        );
    }

    if (!file) {
        return (
            <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={20} color={C.error} />
                <Text style={styles.errorText}>
                    {attachment.errorMessage || 'Receipt could not be attached.'}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove receipt"
                    onPress={onRemove}
                >
                    <Ionicons name="trash-outline" size={18} color={C.muted} />
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.thumb}>
                <Ionicons
                    name={file.kind === 'pdf' ? 'document-text-outline' : 'image-outline'}
                    size={24}
                    color={C.green}
                />
            </View>

            <View style={styles.body}>
                <Text numberOfLines={1} style={styles.name}>
                    {file.name}
                </Text>
                <Text style={styles.meta}>
                    {file.kind === 'pdf' ? 'PDF' : 'Image'}
                    {size ? ` · ${size}` : ''}
                </Text>
                {attachment.status === 'processing' ? (
                    <View style={styles.statusRow}>
                        <ActivityIndicator size="small" color={C.green} />
                        <Text style={styles.statusText}>Processing…</Text>
                    </View>
                ) : null}
                {attachment.status === 'ready' ? (
                    <Text style={styles.readyText}>Ready</Text>
                ) : null}
            </View>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View receipt"
                    onPress={onView}
                    hitSlop={6}
                >
                    <Ionicons name="eye-outline" size={19} color={C.green} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Replace receipt"
                    onPress={onReplace}
                    hitSlop={6}
                >
                    <Ionicons name="swap-horizontal-outline" size={19} color={C.green} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove receipt"
                    onPress={onRemove}
                    hitSlop={6}
                >
                    <Ionicons name="trash-outline" size={19} color={C.error} />
                </Pressable>
            </View>
        </View>
    );
};

/** Attachment preview styles. */
const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 22,
        marginTop: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 14,
        backgroundColor: C.white,
    },
    thumb: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E9F7F1',
    },
    body: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: C.ink,
    },
    meta: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    statusText: {
        fontSize: 12,
        color: C.green,
        fontWeight: '600',
    },
    readyText: {
        fontSize: 12,
        color: C.green,
        fontWeight: '700',
        marginTop: 6,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    empty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 22,
        marginTop: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 14,
        backgroundColor: C.background,
    },
    emptyText: {
        fontSize: 13,
        color: C.muted,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 22,
        marginTop: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: C.errorBackground,
    },
    errorText: {
        flex: 1,
        fontSize: 12,
        color: C.error,
    },
});

export default ReceiptAttachmentPreview;
