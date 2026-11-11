/**
 * Period selection sheet for the dashboard.
 *
 * Offers the four approved quick ranges plus a calendar for choosing an
 * inclusive custom date or date range. The calendar is implemented with plain
 * React Native views so no native date-picker dependency is required.
 */

import { Ionicons } from '@expo/vector-icons';
import type { DashboardPeriod, DashboardPeriodSelection } from '@/types/dashboard';
import { startOfDay } from '@/utils/dashboardPeriod';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

/** Quick ranges shown above the calendar. */
const PRESETS: readonly DashboardPeriod[] = [
    'This Month',
    'Last Month',
    'Last 3 Months',
    'This Year',
];

/** Single-letter weekday headings, Sunday first. */
const WEEKDAYS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Props for the period selection sheet. */
export interface PeriodPickerModalProps {
    /** Whether the sheet is visible. */
    visible: boolean;
    /** The currently applied selection, used to seed the calendar. */
    selection: DashboardPeriodSelection;
    /** Display locale for month and range labels. */
    language: string;
    /** Called when the sheet is dismissed without applying. */
    onClose: () => void;
    /** Called when a quick range is chosen. */
    onSelectPreset: (period: DashboardPeriod) => void;
    /** Called when a custom inclusive range is applied. */
    onSelectRange: (start: Date, end: Date) => void;
}

/**
 * Render the period selection sheet with presets and a range calendar.
 *
 * @param {PeriodPickerModalProps} props Period picker props.
 * @returns {JSX.Element} The modal sheet.
 */
const PeriodPickerModal = ({
    visible,
    selection,
    language,
    onClose,
    onSelectPreset,
    onSelectRange,
}: PeriodPickerModalProps) => {
    const { t } = useTranslation('dashboard');
    const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

    useEffect(() => {
        if (!visible) return;

        const base = selection.kind === 'range' ? selection.start : new Date();
        setViewYear(base.getFullYear());
        setViewMonth(base.getMonth());

        if (selection.kind === 'range') {
            setRangeStart(startOfDay(selection.start));
            setRangeEnd(startOfDay(selection.end));
        } else {
            setRangeStart(null);
            setRangeEnd(null);
        }
    }, [selection, visible]);

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

    /**
     * Update the local range selection when a day is pressed.
     *
     * The first tap (or a tap before the current start) sets the start; the
     * next tap at or after the start sets the end for preview.
     *
     * @param {Date} date The pressed calendar day at local midnight.
     */
    const handleDayPress = (date: Date) => {
        if (!rangeStart || rangeEnd) {
            setRangeStart(date);
            setRangeEnd(null);
            return;
        }

        if (date.getTime() < rangeStart.getTime()) {
            setRangeStart(date);
            setRangeEnd(null);
            return;
        }

        setRangeEnd(date);
    };

    /**
     * Apply the currently previewed range and close the sheet.
     */
    const applyRange = () => {
        if (!rangeStart) return;
        onSelectRange(rangeStart, rangeEnd ?? rangeStart);
        onClose();
    };

    /**
     * Classify a calendar day's highlight state.
     *
     * @param {Date} date The calendar day.
     * @returns {'start'|'end'|'range'|'none'} The highlight state.
     */
    const highlightFor = (date: Date): 'start' | 'end' | 'range' | 'none' => {
        if (rangeStart && date.getTime() === rangeStart.getTime()) return 'start';
        if (rangeEnd && date.getTime() === rangeEnd.getTime()) return 'end';
        if (
            rangeStart &&
            rangeEnd &&
            date.getTime() > rangeStart.getTime() &&
            date.getTime() < rangeEnd.getTime()
        ) {
            return 'range';
        }
        return 'none';
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{t('Select period')}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Close period picker')}
                            onPress={onClose}
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={24} color="#12213A" />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>{t('Quick ranges')}</Text>
                        {PRESETS.map((preset) => {
                            const active =
                                selection.kind === 'preset' && selection.period === preset;
                            return (
                                <Pressable
                                    key={preset}
                                    accessibilityRole="button"
                                    accessibilityLabel={t(preset)}
                                    onPress={() => {
                                        onSelectPreset(preset);
                                        onClose();
                                    }}
                                    style={styles.presetRow}
                                >
                                    <Text
                                        style={[
                                            styles.presetText,
                                            active && styles.presetTextActive,
                                        ]}
                                    >
                                        {t(preset)}
                                    </Text>
                                    {active ? (
                                        <Ionicons name="checkmark-circle" size={22} color="#0B7956" />
                                    ) : null}
                                </Pressable>
                            );
                        })}

                        <Text style={styles.sectionLabel}>{t('Or choose a date or range')}</Text>

                        <View style={styles.calendarHeader}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Previous month')}
                                onPress={showPreviousMonth}
                                hitSlop={8}
                                style={styles.monthNav}
                            >
                                <Ionicons name="chevron-back" size={22} color="#12213A" />
                            </Pressable>
                            <Text style={styles.monthTitle}>{monthLabel}</Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Next month')}
                                onPress={showNextMonth}
                                hitSlop={8}
                                style={styles.monthNav}
                            >
                                <Ionicons name="chevron-forward" size={22} color="#12213A" />
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
                                const highlight = highlightFor(date);
                                return (
                                    <View key={date.toISOString()} style={styles.dayCell}>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={date.toLocaleDateString(language, {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                            onPress={() => handleDayPress(date)}
                                            style={[
                                                styles.dayButton,
                                                highlight === 'start' && styles.daySelected,
                                                highlight === 'end' && styles.daySelected,
                                                highlight === 'range' && styles.dayInRange,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayText,
                                                    (highlight === 'start' || highlight === 'end') &&
                                                        styles.dayTextSelected,
                                                ]}
                                            >
                                                {date.getDate()}
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>

                        <Text style={styles.hint}>
                            Tap a start date, then an end date. Tap the same date twice for a
                            single day.
                        </Text>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Apply')}
                            disabled={!rangeStart}
                            onPress={applyRange}
                            style={[
                                styles.applyButton,
                                !rangeStart && styles.applyButtonDisabled,
                            ]}
                        >
                            <Text style={styles.applyButtonText}>{t('Apply')}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

/** Period picker sheet styles. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(8, 16, 38, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        maxHeight: '92%',
        backgroundColor: '#FFFFFF',
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
        fontSize: 20,
        fontWeight: '800',
        color: '#12213A',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8997AC',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginTop: 18,
        marginBottom: 8,
    },
    presetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF0F5',
    },
    presetText: {
        fontSize: 16,
        color: '#12213A',
    },
    presetTextActive: {
        color: '#0B7956',
        fontWeight: '800',
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
        backgroundColor: '#F4F7FA',
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#12213A',
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekday: {
        width: '14.2857%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: '#8997AC',
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
    dayInRange: {
        backgroundColor: '#E4F5EC',
    },
    dayText: {
        fontSize: 15,
        color: '#12213A',
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    hint: {
        fontSize: 13,
        color: '#8997AC',
        lineHeight: 18,
        marginTop: 14,
    },
    applyButton: {
        backgroundColor: '#1B9568',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 14,
    },
    applyButtonDisabled: {
        opacity: 0.45,
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
});

export default PeriodPickerModal;
