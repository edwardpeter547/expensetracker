/**
 * Single-date calendar sheet for the Add Transaction form.
 *
 * Implemented with plain React Native views (following the dashboard's
 * PeriodPickerModal) so no native date-picker dependency is required.
 */

import { Ionicons } from '@expo/vector-icons';
import {
    transactionColors,
    transactionTypography,
} from '@/constants/transactionsTheme';
import { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const C = transactionColors;
const T = transactionTypography;

/** Single-letter weekday headings, Sunday first. */
const WEEKDAYS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Props for the date picker sheet. */
export interface DatePickerModalProps {
    visible: boolean;
    value: Date;
    language: string;
    onClose: () => void;
    onSelect: (date: Date) => void;
}

/**
 * Return a date at local midnight for the supplied instant.
 *
 * @param {Date} date The source date.
 * @returns {Date} The same day at local midnight.
 */
const startOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Render the single-date calendar sheet.
 *
 * @param {DatePickerModalProps} props Date picker props.
 * @returns {JSX.Element} The modal sheet.
 */
const DatePickerModal = ({
    visible,
    value,
    language,
    onClose,
    onSelect,
}: DatePickerModalProps) => {
    const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

    useEffect(() => {
        if (!visible) return;
        setViewYear(value.getFullYear());
        setViewMonth(value.getMonth());
    }, [value, visible]);

    const monthLabel = useMemo(
        () =>
            new Date(viewYear, viewMonth, 1).toLocaleDateString(language, {
                month: 'long',
                year: 'numeric',
            }),
        [language, viewMonth, viewYear],
    );

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const calendarCells: (Date | null)[] = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from(
            { length: daysInMonth },
            (_, index) => new Date(viewYear, viewMonth, index + 1),
        ),
    ];

    /**
     * Move the visible calendar month backward.
     */
    const showPreviousMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((year) => year - 1);
            return;
        }
        setViewMonth((month) => month - 1);
    };

    /**
     * Move the visible calendar month forward.
     */
    const showNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((year) => year + 1);
            return;
        }
        setViewMonth((month) => month + 1);
    };

    const selectedDay = startOfDay(value).getTime();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Select date</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close date picker"
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color={C.ink} />
                        </Pressable>
                    </View>

                    <View style={styles.calendarHeader}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Previous month"
                            onPress={showPreviousMonth}
                            hitSlop={8}
                            style={styles.monthNav}
                        >
                            <Ionicons name="chevron-back" size={22} color={C.ink} />
                        </Pressable>
                        <Text style={styles.monthTitle}>{monthLabel}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Next month"
                            onPress={showNextMonth}
                            hitSlop={8}
                            style={styles.monthNav}
                        >
                            <Ionicons name="chevron-forward" size={22} color={C.ink} />
                        </Pressable>
                    </View>

                    <View style={styles.weekdayRow}>
                        {WEEKDAYS.map((weekday, index) => (
                            <Text key={`weekday-${index}`} style={styles.weekday}>
                                {weekday}
                            </Text>
                        ))}
                    </View>

                    <View style={styles.dayGrid}>
                        {calendarCells.map((date, index) => {
                            if (!date) {
                                return <View key={`blank-${index}`} style={styles.dayCell} />;
                            }
                            const selected = startOfDay(date).getTime() === selectedDay;
                            return (
                                <View key={date.toISOString()} style={styles.dayCell}>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={date.toLocaleDateString(language, {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                        onPress={() => {
                                            onSelect(startOfDay(date));
                                            onClose();
                                        }}
                                        style={[
                                            styles.dayButton,
                                            selected && styles.daySelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                selected && styles.dayTextSelected,
                                            ]}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

/** Date picker sheet styles. */
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
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    monthNav: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.pale,
    },
    monthTitle: {
        fontSize: T.dayTitle,
        fontWeight: T.modalTitleWeight,
        color: C.ink,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekday: {
        width: '14.2857%',
        textAlign: 'center',
        fontSize: T.weekday,
        fontWeight: '700',
        color: C.muted,
    },
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.2857%',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    daySelected: {
        backgroundColor: '#0B7956',
    },
    dayText: {
        fontSize: T.dayCell,
        color: C.ink,
    },
    dayTextSelected: {
        color: C.white,
        fontWeight: T.dayCellWeight,
    },
});

export default DatePickerModal;
