/**
 * Time-of-day picker sheet for the transaction form.
 *
 * Like the date picker, this is implemented with plain React Native views so
 * no native date/time-picker dependency is required. The stored value is a
 * time-only `HH:mm` string, matching the existing `MerchantDetails.purchaseTime`
 * representation; display formatting respects the device locale.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const C = transactionColors;
const T = transactionTypography;

/** Props for the time picker sheet. */
export interface TimePickerModalProps {
    visible: boolean;
    value: string | null;
    language: string;
    onClose: () => void;
    onSelect: (time: string) => void;
}

/**
 * Parse an `HH:mm` string into its numeric parts.
 *
 * @param {string|null} value The stored time value.
 * @returns {{hour: number, minute: number}} Valid hour/minute parts.
 */
const parseTime = (value: string | null): { hour: number; minute: number } => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
    if (!match) {
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes() };
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes() };
    }
    return { hour, minute };
};

/**
 * Render the time picker sheet.
 *
 * @param {TimePickerModalProps} props Time picker props.
 * @returns {JSX.Element} The modal sheet.
 */
const TimePickerModal = ({
    visible,
    value,
    language,
    onClose,
    onSelect,
}: TimePickerModalProps) => {
    const { t } = useTranslation('transactions');
    const [hour, setHour] = useState(12);
    const [minute, setMinute] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const parsed = parseTime(value);
        setHour(parsed.hour);
        setMinute(parsed.minute);
    }, [value, visible]);

    /**
     * Format the currently selected wall-clock time for the chosen language.
     *
     * @returns {string} The locale-formatted time.
     */
    const displayTime = () =>
        new Date(2000, 0, 1, hour, minute).toLocaleTimeString(language, {
            hour: 'numeric',
            minute: '2-digit',
        });

    /**
     * Emit the selected time as a zero-padded 24-hour `HH:mm` string.
     */
    const applyTime = () => {
        onSelect(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{t('Select time')}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Close')}
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color={C.ink} />
                        </Pressable>
                    </View>

                    <Text style={styles.preview}>{displayTime()}</Text>

                    <View style={styles.stepperRow}>
                        <Stepper
                            label={t('Hour')}
                            value={String(hour).padStart(2, '0')}
                            decreaseLabel={t('Decrease hour')}
                            increaseLabel={t('Increase hour')}
                            onDecrease={() => setHour((current) => (current + 23) % 24)}
                            onIncrease={() => setHour((current) => (current + 1) % 24)}
                        />
                        <Text style={styles.separator}>:</Text>
                        <Stepper
                            label={t('Minute')}
                            value={String(minute).padStart(2, '0')}
                            decreaseLabel={t('Decrease minute')}
                            increaseLabel={t('Increase minute')}
                            onDecrease={() => setMinute((current) => (current + 59) % 60)}
                            onIncrease={() => setMinute((current) => (current + 1) % 60)}
                        />
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Apply time')}
                        onPress={applyTime}
                        style={styles.apply}
                    >
                        <Text style={styles.applyText}>{t('Apply')}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

/** One hour/minute stepper column. */
const Stepper = ({
    label,
    value,
    decreaseLabel,
    increaseLabel,
    onDecrease,
    onIncrease,
}: {
    label: string;
    value: string;
    decreaseLabel: string;
    increaseLabel: string;
    onDecrease: () => void;
    onIncrease: () => void;
}) => (
    <View style={styles.stepper}>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={increaseLabel}
            onPress={onIncrease}
            hitSlop={6}
            style={styles.stepButton}
        >
            <Ionicons name="chevron-up" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={decreaseLabel}
            onPress={onDecrease}
            hitSlop={6}
            style={styles.stepButton}
        >
            <Ionicons name="chevron-down" size={22} color={C.ink} />
        </Pressable>
    </View>
);

/** Time picker styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: C.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 28,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: T.modalTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    preview: {
        fontSize: 34,
        fontWeight: '800',
        color: C.ink,
        textAlign: 'center',
        marginVertical: 18,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    separator: {
        fontSize: 30,
        fontWeight: '800',
        color: C.muted,
    },
    stepper: {
        alignItems: 'center',
        gap: 2,
    },
    stepButton: {
        width: 52,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: C.pale,
    },
    stepValue: {
        fontSize: 26,
        fontWeight: '800',
        color: C.ink,
        minWidth: 56,
        textAlign: 'center',
    },
    stepLabel: {
        fontSize: 12,
        color: C.muted,
    },
    apply: {
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: C.green,
        marginTop: 24,
    },
    applyText: {
        color: C.white,
        fontSize: T.saveButton,
        fontWeight: T.saveButtonWeight,
    },
});

export default TimePickerModal;
