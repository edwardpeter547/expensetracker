/**
 * Shared primitives for the approved Planning screens.
 *
 * These components replicate the handoff's light, card-based visual system
 * (white surfaces, generous padding, emerald accents, and lightweight
 * bar/line indicators) so every Planning screen stays visually consistent
 * without a heavyweight chart dependency.
 */

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    PLANNING_ICONS,
    planningColors,
    planningRadius,
    type PlanningIconName,
    type PlanningIconSource,
} from './planningTheme';

/** Shared typography and layout styles used across Planning screens. */
export const planningStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: planningColors.text,
        letterSpacing: -0.4,
    },
    heading: {
        fontSize: 16,
        fontWeight: '700',
        color: planningColors.text,
    },
    body: {
        fontSize: 16,
        color: planningColors.text,
        fontWeight: '700',
    },
    muted: {
        fontSize: 12,
        color: planningColors.muted,
    },
    large: {
        fontSize: 28,
        fontWeight: '800',
        color: planningColors.text,
        letterSpacing: -0.4,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: planningColors.text,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: planningColors.text,
    },
});

/**
 * Resolve a semantic Planning icon or raw Ionicons glyph into a valid glyph.
 *
 * @param {PlanningIconSource} name The semantic name or raw glyph.
 * @returns {keyof typeof Ionicons.glyphMap} The resolved Ionicons glyph.
 */
const resolvePlanningGlyph = (name: PlanningIconSource): keyof typeof Ionicons.glyphMap => {
    if (name in PLANNING_ICONS) {
        return PLANNING_ICONS[name as PlanningIconName];
    }
    return name as keyof typeof Ionicons.glyphMap;
};

/** An Ionicons glyph rendered from a semantic Planning icon name or raw glyph. */
export const PlanningIcon = ({
    name,
    size = 21,
    color = planningColors.text,
}: {
    name: PlanningIconSource;
    size?: number;
    color?: string;
}) => <Ionicons name={resolvePlanningGlyph(name)} size={size} color={color} />;

/** A white rounded card with a subtle border and internal padding. */
export const PlanningCard = ({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: object;
}) => <View style={[styles.card, style]}>{children}</View>;

/** A tinted rounded tile containing an icon. */
export const PlanningIconTile = ({
    icon,
    color,
    bg,
    size = 46,
}: {
    icon: PlanningIconSource;
    color: string;
    bg: string;
    size?: number;
}) => (
    <View
        style={[
            styles.iconTile,
            { height: size, width: size, backgroundColor: bg },
        ]}
    >
        <PlanningIcon name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
);

/** A clean horizontal progress bar clamped to the 0–100 range. */
export const PlanningProgress = ({
    value,
    color = planningColors.emerald,
}: {
    value: number;
    color?: string;
}) => (
    <View style={styles.progressTrack}>
        <View
            style={[
                styles.progressFill,
                {
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    backgroundColor: color,
                },
            ]}
        />
    </View>
);

/** A flat emerald button, with an outlined variant. */
export const PlanningButton = ({
    label,
    onPress,
    outline = false,
}: {
    label: string;
    onPress: () => void;
    outline?: boolean;
}) => (
    <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.button, outline && styles.buttonOutline]}
    >
        <Text style={[styles.buttonText, outline && styles.buttonTextOutline]}>{label}</Text>
    </TouchableOpacity>
);

/** A screen shell with a white header, back/action slots, and a scroll body. */
export const PlanningScreen = ({
    title,
    subtitle,
    onBack,
    onAction,
    children,
}: {
    title: string;
    subtitle: string;
    onBack?: () => void;
    onAction?: () => void;
    children: React.ReactNode;
}) => {
    const { t } = useTranslation('planning');

    return (
    <View style={styles.page}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
            <View style={styles.headerRow}>
                <View style={styles.headerSide}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            accessibilityRole="button"
                            accessibilityLabel={t('Back')}
                            style={styles.backButton}
                        >
                            <PlanningIcon name="chevron-back" size={23} color={planningColors.text} />
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.headerText}>
                    <Text numberOfLines={1} style={planningStyles.title}>
                        {title}
                    </Text>
                    <Text style={[planningStyles.muted, styles.subtitle]}>{subtitle}</Text>
                </View>
                <View style={styles.headerSide}>
                    {onAction ? (
                        <TouchableOpacity
                            onPress={onAction}
                            accessibilityRole="button"
                            accessibilityLabel={t('Add')}
                            style={styles.actionButton}
                        >
                            <PlanningIcon name="plus" color={planningColors.emerald} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        </View>
        <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    </View>
    );
};

/** A small labelled value used inside Planning summary cards. */
export const PlanningStat = ({
    label,
    value,
    color = planningColors.text,
}: {
    label: string;
    value: string;
    color?: string;
}) => (
    <View style={styles.stat}>
        <Text style={planningStyles.muted}>{label}</Text>
        <Text style={[planningStyles.heading, { color }]}>{value}</Text>
    </View>
);

/** A labelled text input used by Planning create/contribute modals. */
export const PlanningField = ({
    label,
    value,
    onChange,
    keyboardType = 'default',
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    keyboardType?: 'default' | 'numeric';
    placeholder?: string;
}) => (
    <View style={styles.field}>
        <Text style={planningStyles.fieldLabel}>{label}</Text>
        <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            keyboardType={keyboardType}
            placeholder={placeholder}
            placeholderTextColor="#A2ADBB"
        />
    </View>
);

/** A centered modal panel over a dimmed backdrop. */
export const PlanningModalPanel = ({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) => {
    const { t } = useTranslation('planning');

    return (
    <View style={styles.modalOverlay}>
        <PlanningCard>
            <View style={styles.modalHeader}>
                <Text style={planningStyles.modalTitle}>{title}</Text>
                <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('Close')}
                >
                    <PlanningIcon name="arrow-left" />
                </TouchableOpacity>
            </View>
            {children}
        </PlanningCard>
    </View>
    );
};

/** A lightweight bar chart (week buckets). */
export const PlanningBarChart = ({
    values,
    labels,
    color = planningColors.blue,
}: {
    values: number[];
    labels: string[];
    color?: string;
}) => {
    const max = Math.max(...values, 1);
    return (
        <View style={styles.barChart}>
            {values.map((value, index) => (
                <View key={`${labels[index]}-${index}`} style={styles.barColumn}>
                    <View
                        style={[
                            styles.bar,
                            {
                                height: (115 * value) / max,
                                backgroundColor: index === values.length - 1 ? color : `${color}88`,
                            },
                        ]}
                    />
                    <Text style={planningStyles.muted}>{labels[index]}</Text>
                </View>
            ))}
        </View>
    );
};

/** A lightweight line-like chart drawn from vertical bars. */
export const PlanningLineChart = ({
    values,
    color = planningColors.emerald,
    labels,
}: {
    values: number[];
    color?: string;
    labels: string[];
}) => {
    const max = Math.max(...values, 1);
    return (
        <View style={styles.lineChart}>
            <View style={styles.lineChartBars}>
                {values.map((value, index) => (
                    <View key={`${labels[index]}-${index}`} style={styles.lineBarColumn}>
                        <View
                            style={[
                                styles.lineBar,
                                {
                                    height: Math.max(8, (value / max) * 100),
                                    backgroundColor: color,
                                    opacity: 0.5 + index * 0.09,
                                },
                            ]}
                        />
                    </View>
                ))}
            </View>
            <View style={styles.lineChartLabels}>
                {labels.map((label, index) => (
                    <Text key={`${label}-${index}`} style={planningStyles.muted}>
                        {label}
                    </Text>
                ))}
            </View>
        </View>
    );
};

/** A muted caption marking demo-only data. */
export const PlanningPreviewNote = ({
    text,
}: {
    text?: string;
}) => {
    const { t } = useTranslation('planning');
    return <Text style={styles.previewNote}>{text ?? t('Preview data — not connected to your account.')}</Text>;
};

/** Planning screen and component styles. */
const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: planningColors.background,
    },
    content: {
        padding: 18,
        paddingBottom: 42,
        gap: 16,
    },
    card: {
        backgroundColor: planningColors.surface,
        borderRadius: planningRadius + 2,
        borderWidth: 1,
        borderColor: planningColors.border,
        padding: 18,
        gap: 14,
    },
    iconTile: {
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTrack: {
        height: 9,
        backgroundColor: planningColors.track,
        borderRadius: 20,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 20,
    },
    button: {
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: planningColors.emerald,
    },
    buttonOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: planningColors.emerald,
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 16,
        color: '#FFFFFF',
    },
    buttonTextOutline: {
        color: planningColors.emerald,
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E4EAF2',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerSide: {
        width: 42,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        alignItems: 'center',
    },
    subtitle: {
        marginTop: 3,
        textAlign: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: planningColors.emeraldLight,
    },
    stat: {
        gap: 5,
    },
    field: {
        gap: 7,
    },
    input: {
        borderColor: planningColors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: planningColors.text,
        backgroundColor: '#FFFFFF',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#102238AA',
        justifyContent: 'center',
        padding: 20,
        zIndex: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    barChart: {
        height: 155,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        paddingTop: 10,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    bar: {
        width: '58%',
        borderRadius: 5,
    },
    lineChart: {
        gap: 9,
    },
    lineChartBars: {
        height: 115,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: planningColors.border,
    },
    lineBarColumn: {
        width: '11%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    lineBar: {
        width: 8,
        borderRadius: 5,
    },
    lineChartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewNote: {
        textAlign: 'center',
        color: planningColors.muted,
        fontSize: 12,
        marginTop: 4,
    },
});
