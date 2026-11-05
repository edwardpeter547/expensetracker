/**
 * Approved Dashboard V1.5, adapted for the existing Expo Router app.
 *
 * The screen keeps the design's defining layering: a dark navy gradient header,
 * a white content sheet whose 26px top corners begin at the Total Spending
 * card's vertical midpoint, and a floating green card that overlaps both.
 * Type and component sizes are scaled up for on-device readability, and the
 * period control opens a calendar sheet for quick ranges or custom dates.
 */

import PeriodPickerModal from '@/components/dashboard/PeriodPickerModal';
import SpendingTrend from '@/components/dashboard/SpendingTrend';
import FloatingChatButton from '@/components/dashboard/FloatingChatButton';
import { teamKindIcon, teamModeShort } from '@/components/teams/teamPresentation';
import { formatMoney } from '@/localization/format';
import type {
    CategorySpend,
    DashboardData,
    DashboardPeriod,
    DashboardPeriodSelection,
} from '@/types/dashboard';
import type { Team } from '@/types/team';
import { selectionLabel } from '@/utils/dashboardPeriod';
import { toScaledInteger } from '@/utils/money';
import { spendingProgress } from '@/utils/spendingProgress';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';

/** Fixed design tokens from the approved V1.5 handoff. */
const C = {
    navy: '#091525',
    navyLight: '#0D1B2E',
    white: '#FFFFFF',
    ink: '#12213A',
    muted: '#8997AC',
    green: '#1B9568',
    greenBright: '#2BAC7B',
    border: '#E9EEF4',
} as const;

/** Reference header height (logical pixels), scaled up for readability. */
const HEADER_HEIGHT = 256;
/** Reference spending-card top offset from the dashboard content origin. */
const CARD_TOP = 190;
/** Reference spending-card height from the approved handoff. */
const CARD_HEIGHT = 132;

/** Props for the approved dashboard presentation. */
export interface ExpenseDashboardProps {
    /** Mapped dashboard data, or null while loading or after an error. */
    data: DashboardData | null;
    /** First name shown while the first load is still in flight. */
    firstNameFallback: string;
    /** Last name shown alongside the first name. */
    lastNameFallback?: string;
    /** True during the initial load. */
    loading: boolean;
    /** User-presentable error message, or null. */
    error: string | null;
    /** The currently applied preset or custom range. */
    selection: DashboardPeriodSelection;
    /** Display locale used by the currency and date formatters. */
    language: string;
    /** In-memory bearer token for authenticated avatar image headers. */
    accessToken?: string | null;
    /** Called when the user selects a different quick range. */
    onSelectPreset: (period: DashboardPeriod) => void;
    /** Called when the user applies a custom date range. */
    onSelectRange: (start: Date, end: Date) => void;
    /** Called when the retry action is pressed after an error. */
    onRetry: () => void;
    /** Optional notification button action. */
    onNotificationPress?: () => void;
    /** Optional avatar button action. */
    onAvatarPress?: () => void;
    /** Optional AI chat button action. */
    onChatPress?: () => void;
    /** Demo team summaries shown in the Team Finance section. */
    teams?: Team[];
    /** Called when a team card is selected. */
    onOpenTeam?: (teamId: string) => void;
}

/**
 * Format a canonical decimal amount for display.
 *
 * @param {string|number} amount The canonical amount.
 * @param {string} currency The ISO 4217 currency.
 * @param {string} language The display locale.
 * @param {number} [decimals=0] Displayed fraction digits.
 * @returns {string} The formatted currency string.
 */
const formatAmount = (
    amount: string | number,
    currency: string,
    language: string,
    decimals = 0,
): string => formatMoney(amount, language, currency, decimals);

/**
 * Render the circular avatar button with authenticated-image support.
 *
 * @param {object} props Avatar props.
 * @param {DashboardData|null} props.data The dashboard data.
 * @param {string|null|undefined} props.accessToken The bearer token.
 * @param {() => void} [props.onPress] Press handler.
 * @returns {JSX.Element} The avatar element.
 */
const DashboardAvatar = ({
    data,
    accessToken,
    onPress,
}: {
    data: DashboardData | null;
    accessToken?: string | null;
    onPress?: () => void;
}) => {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(data?.avatarUri && !imageFailed);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={styles.avatar}
        >
            {showImage ? (
                <ExpoImage
                    source={{
                        uri: data?.avatarUri ?? '',
                        headers: accessToken
                            ? { Authorization: `Bearer ${accessToken}` }
                            : undefined,
                    }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={120}
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <Ionicons name="person" size={28} color="#51372F" />
            )}
        </Pressable>
    );
};

/** Positive category entry used to draw one donut segment. */
interface DonutSlice {
    name: string;
    amount: string;
    color: string;
    scaled: bigint;
    dash: number;
    offset: number;
}

/** Positive category entries before dash/offset calculation. */
interface PositiveDonutCategory {
    name: string;
    amount: string;
    color: string;
    scaled: bigint;
}

/**
 * Build donut ring segments from positive category totals.
 *
 * Kept outside the component so the running offset accumulator is a plain
 * local rather than a render-scoped mutable value.
 *
 * @param {CategorySpend[]} categories Category totals.
 * @param {number} circumference The donut ring circumference.
 * @returns {{positive: PositiveDonutCategory[], donutTotal: bigint, segments: DonutSlice[]}}
 *   Positive entries, their total, and the calculated segments.
 */
const buildDonutSegments = (
    categories: CategorySpend[],
    circumference: number,
): {
    positive: PositiveDonutCategory[];
    donutTotal: bigint;
    segments: DonutSlice[];
} => {
    const positive: PositiveDonutCategory[] = categories
        .map((item) => ({ ...item, scaled: toScaledInteger(item.amount) }))
        .filter((item) => item.scaled > 0n);
    const donutTotal = positive.reduce((sum, item) => sum + item.scaled, 0n);

    const segments: DonutSlice[] = [];
    let running = 0n;
    for (const item of positive) {
        const fraction = donutTotal > 0n
            ? Number(item.scaled) / Number(donutTotal)
            : 0;
        segments.push({
            ...item,
            dash: circumference * fraction,
            offset: circumference * (Number(running) / Number(donutTotal || 1n)),
        });
        running += item.scaled;
    }

    return { positive, donutTotal, segments };
};

/**
 * Render the donut chart and its category legend.
 *
 * @param {object} props Donut props.
 * @param {CategorySpend[]} props.categories Positive category totals.
 * @param {string} props.total Period expense total for the center value.
 * @param {string} props.currency The display currency.
 * @param {string} props.language The display locale.
 * @returns {JSX.Element} The donut and legend row.
 */
const SpendingDonut = ({
    categories,
    total,
    currency,
    language,
}: {
    categories: CategorySpend[];
    total: string;
    currency: string;
    language: string;
}) => {
    const [selected, setSelected] = useState<string | null>(null);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    const segments = useMemo(
        () => buildDonutSegments(categories, circumference),
        [categories, circumference],
    );

    const selectedItem = segments.positive.find((item) => item.name === selected);
    const centerValue = selectedItem ? selectedItem.amount : total;

    return (
        <View style={styles.chartRow}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset spending category selection"
                onPress={() => setSelected(null)}
                style={styles.donutWrap}
            >
                <Svg width={160} height={160} viewBox="0 0 137 137">
                    <G rotation={-90} origin="68.5,68.5">
                        {segments.donutTotal === 0n ? (
                            <Circle
                                cx={68.5}
                                cy={68.5}
                                r={radius}
                                stroke="#EEF1F6"
                                strokeWidth={23}
                                fill="none"
                            />
                        ) : (
                            segments.segments.map((segment) => (
                                <Circle
                                    key={segment.name}
                                    cx={68.5}
                                    cy={68.5}
                                    r={radius}
                                    stroke={segment.color}
                                    strokeWidth={23}
                                    fill="none"
                                    strokeDasharray={`${segment.dash} ${circumference}`}
                                    strokeDashoffset={-segment.offset}
                                />
                            ))
                        )}
                    </G>
                </Svg>
                <Text style={styles.donutValue}>
                    {formatAmount(centerValue, currency, language)}
                </Text>
            </Pressable>

            <View style={styles.legend}>
                {segments.positive.length === 0 ? (
                    <Text style={styles.legendEmpty}>No spending this period</Text>
                ) : (
                    segments.positive.map((item) => (
                        <Pressable
                            key={item.name}
                            onPress={() => setSelected(item.name)}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.name}, ${formatAmount(item.amount, currency, language)}`}
                            style={styles.legendRow}
                        >
                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                            <Text numberOfLines={1} style={styles.legendName}>{item.name}</Text>
                            <Text style={styles.legendAmount}>
                                {formatAmount(item.amount, currency, language)}
                            </Text>
                            <Text style={styles.legendPercent}>
                                {segments.donutTotal > 0n
                                    ? `${Math.round((Number(item.scaled) / Number(segments.donutTotal)) * 100)}%`
                                    : '0%'}
                            </Text>
                        </Pressable>
                    ))
                )}
            </View>
        </View>
    );
};

/**
 * Render a placeholder skeleton for the summary row.
 *
 * @returns {JSX.Element} Three skeleton cards in the approved layout.
 */
const SummarySkeleton = () => (
    <View style={styles.stats}>
        {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.stat, styles.skeletonCard]} />
        ))}
    </View>
);

/** Color mapping for the three goal-progress tones. */
const GOAL_TONE_COLORS = {
    green: '#2BAC7B',
    amber: '#F2B134',
    red: '#E8666C',
} as const;

/**
 * Render the monthly spending-goal progress bar.
 *
 * The bar is a translucent, rounded "glass" track with a tone-colored fill
 * and a subtle top sheen. It spans the full content width and sits above the
 * Spending by Category section.
 *
 * @param {object} props Goal bar props.
 * @param {string} props.spent Current-month spending.
 * @param {string} props.goal The monthly spending goal.
 * @param {string} props.currency The display currency.
 * @param {string} props.language The display locale.
 * @returns {JSX.Element} The goal progress bar.
 */
const SpendingGoalProgress = ({
    spent,
    goal,
    currency,
    language,
}: {
    spent: string;
    goal: string;
    currency: string;
    language: string;
}) => {
    const progress = spendingProgress(spent, goal);
    const toneColor = GOAL_TONE_COLORS[progress.tone];

    return (
        <View style={styles.goalBlock}>
            <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>Monthly Spending Goal</Text>
                <Text style={[styles.goalPercent, { color: toneColor }]}>
                    {progress.actualPercent}%
                </Text>
            </View>
            <View style={styles.goalTrack}>
                <View
                    style={[
                        styles.goalFill,
                        {
                            width: `${progress.fillPercent}%`,
                            backgroundColor: toneColor,
                        },
                    ]}
                >
                    <View style={styles.goalGloss} />
                </View>
            </View>
            <Text style={styles.goalMeta}>
                {formatAmount(spent, currency, language)} spent of{' '}
                {formatAmount(goal, currency, language)}
                {progress.isOverGoal ? ' · over goal' : ''}
            </Text>
        </View>
    );
};

/** Props for one team finance summary card. */
interface TeamFinanceCardProps {
    team: Team;
    currency: string;
    language: string;
    onPress: () => void;
}

/**
 * Render one team finance summary card on the dashboard.
 *
 * @param {TeamFinanceCardProps} props Card props.
 * @returns {JSX.Element} The team summary card.
 */
const TeamFinanceCard = ({ team, currency, language, onPress }: TeamFinanceCardProps) => {
    const pooled = team.mode === 'POOLED';
    const headline = pooled ? team.budgetTarget - team.spent : team.spent;
    const headlineLabel = pooled ? 'Available (tracked)' : 'Total spending';
    const targetLabel = pooled ? 'Allocation' : 'Target';
    const progress = team.budgetTarget > 0
        ? Math.round((team.spent / team.budgetTarget) * 100)
        : 0;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${team.name}`}
            onPress={onPress}
            style={styles.teamCard}
        >
            <View style={styles.teamCardRow}>
                <View
                    style={[
                        styles.teamIcon,
                        { backgroundColor: pooled ? '#E5F7ED' : '#EAF1FF' },
                    ]}
                >
                    <Ionicons
                        name={teamKindIcon(team.kind)}
                        size={22}
                        color={pooled ? C.green : '#5689ED'}
                    />
                </View>
                <View style={styles.teamCardTitle}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamMeta}>
                        {team.memberCount} members · {team.kind}
                    </Text>
                </View>
                <View
                    style={[
                        styles.teamMode,
                        { backgroundColor: pooled ? '#E5F7ED' : '#EAF1FF' },
                    ]}
                >
                    <Text
                        style={[
                            styles.teamModeText,
                            { color: pooled ? C.green : '#5689ED' },
                        ]}
                    >
                        {teamModeShort(team.mode)}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A5B3C1" />
            </View>

            <View style={styles.teamStats}>
                <View>
                    <Text style={styles.teamStatLabel}>{headlineLabel}</Text>
                    <Text style={styles.teamStatValue}>
                        {formatAmount(headline, currency, language)}
                    </Text>
                </View>
                <View style={styles.teamStatRight}>
                    <Text style={styles.teamStatLabel}>{targetLabel}</Text>
                    <Text style={styles.teamStatValue}>
                        {formatAmount(team.budgetTarget, currency, language)}
                    </Text>
                </View>
            </View>

            <View style={styles.teamProgressTrack}>
                <View
                    style={[
                        styles.teamProgressFill,
                        {
                            width: `${progress}%`,
                            backgroundColor: pooled ? C.green : '#5689ED',
                        },
                    ]}
                />
            </View>
        </Pressable>
    );
};

/**
 * The approved dashboard screen component.
 *
 * @param {ExpenseDashboardProps} props Dashboard props.
 * @returns {JSX.Element} The rendered dashboard.
 */
export default function ExpenseDashboard({
    data,
    loading,
    error,
    selection,
    language,
    accessToken,
    firstNameFallback,
    lastNameFallback,
    onSelectPreset,
    onSelectRange,
    onRetry,
    onNotificationPress,
    onAvatarPress,
    onChatPress,
    teams = [],
    onOpenTeam,
}: ExpenseDashboardProps) {
    const insets = useSafeAreaInsets();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [dashboardLayout, setDashboardLayout] = useState<{
        width: number;
        height: number;
    } | null>(null);

    const currency = data?.currency ?? 'USD';
    const firstName = firstNameFallback?.trim() || data?.firstName || 'User';
    const displayName = [firstName, lastNameFallback?.trim()].filter(Boolean).join(' ');
    const periodLabel = selectionLabel(selection, language);

    const spendingChange = useMemo(() => {
        const change = data?.spendingChangePercent;
        if (change === null || change === undefined) return '— no previous data';
        const arrow = change >= 0 ? '↗' : '↘';
        return `${arrow}${Math.abs(change)}% from previous period`;
    }, [data?.spendingChangePercent]);

    return (
        <View
            style={[styles.screen, { marginTop: -insets.top }]}
            onLayout={(event) => setDashboardLayout(event.nativeEvent.layout)}
        >
            <StatusBar barStyle="light-content" backgroundColor={C.navy} />

            <LinearGradient
                colors={[C.navyLight, C.navy]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + 40,
                        paddingBottom: 80,
                        height: insets.top + HEADER_HEIGHT,
                    },
                ]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.headerIdentity}>
                        <DashboardAvatar
                            data={data}
                            accessToken={accessToken}
                            onPress={onAvatarPress}
                        />
                        <View>
                            <Text style={styles.greeting}>Welcome back,</Text>
                            <Text style={styles.name}>{displayName}</Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={() => {
                            setNotificationOpen((open) => !open);
                            onNotificationPress?.();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Notifications"
                        style={styles.bell}
                    >
                        <Ionicons name="notifications-outline" size={22} color={C.white} />
                    </Pressable>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Period: ${periodLabel}`}
                    onPress={() => {
                        setNotificationOpen(false);
                        setPickerOpen(true);
                    }}
                    style={styles.month}
                >
                    <Ionicons name="calendar-outline" size={18} color="#52647C" />
                    <Text numberOfLines={1} style={styles.monthText}>{periodLabel}</Text>
                    <Ionicons name="chevron-down" size={15} color="#52647C" />
                </Pressable>

                {notificationOpen ? (
                    <View style={[styles.notificationsPopup, { top: insets.top + 70 }]}>
                        <Text style={styles.popupTitle}>Notifications</Text>
                        <Text style={styles.popupSub}>
                            Notifications aren&apos;t available yet.
                        </Text>
                    </View>
                ) : null}
            </LinearGradient>

            <View style={styles.content}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {loading ? (
                        <>
                            <SummarySkeleton />
                            <View style={styles.skeletonTitle} />
                            <View style={styles.skeletonChart}>
                                <View style={styles.skeletonDonut} />
                                <View style={styles.skeletonLegend}>
                                    <View style={styles.skeletonLine} />
                                    <View style={styles.skeletonLine} />
                                    <View style={styles.skeletonLine} />
                                </View>
                            </View>
                        </>
                    ) : error ? (
                        <View style={styles.errorCard}>
                            <Ionicons name="cloud-offline-outline" size={32} color={C.muted} />
                            <Text style={styles.errorText}>{error}</Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Retry loading dashboard"
                                onPress={onRetry}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <View style={styles.stats}>
                                <View style={styles.stat}>
                                    <Text style={[styles.statLabel, { color: '#498DE5' }]}>Income</Text>
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                        style={styles.statValue}
                                    >
                                        {formatAmount(data?.income ?? '0', currency, language)}
                                    </Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={[styles.statLabel, { color: '#E8666C' }]}>Expenses</Text>
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                        style={styles.statValue}
                                    >
                                        {formatAmount(data?.expenses ?? '0', currency, language)}
                                    </Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={[styles.statLabel, { color: '#4CBF7E' }]}>Balance</Text>
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                        style={styles.statValue}
                                    >
                                        {formatAmount(data?.remaining ?? '0', currency, language)}
                                    </Text>
                                </View>
                            </View>

                            <SpendingGoalProgress
                                spent={data?.monthlySpending ?? '0'}
                                goal={data?.spendingGoal ?? '0'}
                                currency={currency}
                                language={language}
                            />

                            <Text style={styles.sectionTitle}>Spending by Category</Text>
                            <SpendingDonut
                                categories={data?.categories ?? []}
                                total={data?.totalSpending ?? '0'}
                                currency={currency}
                                language={language}
                            />
                            <SpendingTrend
                                points={data?.trend ?? []}
                                currency={currency}
                                language={language}
                                topCategory={data?.categories[0]?.name}
                            />
                            {teams.length > 0 ? (
                                <View style={styles.teamSection}>
                                    <Text style={styles.teamSectionLabel}>TEAM FINANCE</Text>
                                    {teams.map((team) => (
                                        <TeamFinanceCard
                                            key={team.id}
                                            team={team}
                                            currency={currency}
                                            language={language}
                                            onPress={() => onOpenTeam?.(team.id)}
                                        />
                                    ))}
                                </View>
                            ) : null}
                        </>
                    )}
                </ScrollView>
            </View>

            <LinearGradient
                pointerEvents="none"
                colors={[C.green, C.greenBright]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.spendingCard, { top: insets.top + CARD_TOP }]}
            >
                <View>
                    <Text style={styles.spendingLabel}>Total Spending</Text>
                    <Text style={styles.spendingAmount}>
                        {data
                            ? formatAmount(data.totalSpending, currency, language, 2)
                            : '—'}
                    </Text>
                    <Text style={styles.spendingChange}>
                        {loading ? '—' : spendingChange}
                    </Text>
                </View>
                <View style={styles.miniBars}>
                    <View style={[styles.miniBar, { height: 22 }]} />
                    <View style={[styles.miniBar, { height: 34 }]} />
                    <View style={[styles.miniBar, { height: 42 }]} />
                    <View style={[styles.miniBar, { height: 28 }]} />
                </View>
            </LinearGradient>

            <FloatingChatButton
                onPress={onChatPress}
                containerSize={dashboardLayout ?? undefined}
            />

            <PeriodPickerModal
                visible={pickerOpen}
                selection={selection}
                language={language}
                onClose={() => setPickerOpen(false)}
                onSelectPreset={onSelectPreset}
                onSelectRange={onSelectRange}
            />
        </View>
    );
}

/** Dashboard styles, fixed to the approved design rather than app theme. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: C.navy,
    },
    header: {
        paddingHorizontal: 20,
        zIndex: 2,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        color: C.white,
        fontSize: 18,
        lineHeight: 23,
    },
    name: {
        color: C.white,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.6,
    },
    headerIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: C.white,
        backgroundColor: '#D7B49B',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    bell: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#23364C',
        borderWidth: 1,
        borderColor: '#3C4D61',
        justifyContent: 'center',
        alignItems: 'center',
    },
    month: {
        width: 190,
        height: 42,
        borderWidth: 1,
        borderColor: '#D5E0E8',
        borderRadius: 10,
        backgroundColor: '#F4F7FA',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
    },
    monthText: {
        flex: 1,
        color: '#293D59',
        fontSize: 15,
        fontWeight: '600',
    },
    notificationsPopup: {
        position: 'absolute',
        right: 14,
        width: 210,
        padding: 16,
        borderRadius: 12,
        backgroundColor: C.white,
        zIndex: 10,
        elevation: 8,
    },
    popupTitle: {
        fontSize: 14,
        color: '#15283E',
        fontWeight: '700',
    },
    popupSub: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 7,
    },
    content: {
        flex: 1,
        backgroundColor: C.white,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingTop: 82,
        paddingHorizontal: 20,
        zIndex: 1,
    },
    scrollContent: {
        paddingBottom: 28,
        flexGrow: 1,
    },
    spendingCard: {
        position: 'absolute',
        left: 20,
        right: 20,
        height: CARD_HEIGHT,
        borderRadius: 18,
        paddingHorizontal: 22,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 4,
        elevation: 5,
        shadowColor: '#0C4932',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
    },
    spendingLabel: {
        fontSize: 15,
        color: '#E5FFF4',
    },
    spendingAmount: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.6,
        color: C.white,
        lineHeight: 40,
    },
    spendingChange: {
        fontSize: 14,
        color: '#E2FFF2',
    },
    miniBars: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
        marginRight: 10,
    },
    miniBar: {
        width: 10,
        borderRadius: 3,
        backgroundColor: '#A0E9BD',
    },
    stats: {
        flexDirection: 'row',
        gap: 12,
    },
    stat: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        backgroundColor: C.white,
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 14,
        elevation: 2,
        shadowColor: '#1E375B',
        shadowOpacity: 0.07,
        shadowRadius: 8,
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: C.ink,
        letterSpacing: -0.5,
    },
    goalBlock: {
        marginTop: 26,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    goalTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: C.ink,
    },
    goalPercent: {
        fontSize: 14,
        fontWeight: '800',
    },
    goalTrack: {
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EAF0F6',
        borderWidth: 1,
        borderColor: 'rgba(18, 33, 58, 0.06)',
        overflow: 'hidden',
    },
    goalFill: {
        height: '100%',
        borderRadius: 9,
        justifyContent: 'center',
    },
    goalGloss: {
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
    goalMeta: {
        marginTop: 8,
        fontSize: 13,
        color: C.muted,
    },
    skeletonCard: {
        height: 76,
        backgroundColor: '#F0F3F7',
        borderColor: '#F0F3F7',
        elevation: 0,
        shadowOpacity: 0,
    },
    skeletonTitle: {
        height: 18,
        width: 190,
        borderRadius: 5,
        backgroundColor: '#F0F3F7',
        marginTop: 34,
        marginBottom: 20,
    },
    skeletonChart: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    skeletonDonut: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#F0F3F7',
    },
    skeletonLegend: {
        flex: 1,
        gap: 16,
    },
    skeletonLine: {
        height: 13,
        borderRadius: 6,
        backgroundColor: '#F0F3F7',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: C.ink,
        marginTop: 30,
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    teamSection: {
        marginTop: 28,
    },
    teamSectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: C.muted,
        marginBottom: 12,
        marginHorizontal: 3,
    },
    teamCard: {
        backgroundColor: C.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#1E375B',
        shadowOpacity: 0.07,
        shadowRadius: 8,
    },
    teamCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
    },
    teamIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamCardTitle: {
        flex: 1,
        minWidth: 0,
    },
    teamName: {
        fontSize: 16,
        fontWeight: '800',
        color: C.ink,
    },
    teamMeta: {
        fontSize: 13,
        color: C.muted,
        marginTop: 3,
    },
    teamMode: {
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    teamModeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    teamStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    teamStatRight: {
        alignItems: 'flex-end',
    },
    teamStatLabel: {
        fontSize: 12,
        color: C.muted,
    },
    teamStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: C.ink,
        marginTop: 3,
        letterSpacing: -0.3,
    },
    teamProgressTrack: {
        height: 8,
        borderRadius: 99,
        backgroundColor: '#EDF1F5',
        overflow: 'hidden',
        marginTop: 14,
    },
    teamProgressFill: {
        height: '100%',
        borderRadius: 99,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    donutWrap: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    donutValue: {
        position: 'absolute',
        fontSize: 22,
        fontWeight: '800',
        color: C.ink,
        letterSpacing: -0.4,
    },
    legend: {
        flex: 1,
        gap: 14,
    },
    legendEmpty: {
        fontSize: 14,
        color: C.muted,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    legendDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    legendName: {
        flex: 1,
        fontSize: 13,
        color: C.ink,
    },
    legendAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: C.ink,
    },
    legendPercent: {
        width: 36,
        textAlign: 'right',
        color: C.muted,
        fontSize: 13,
    },
    errorCard: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 16,
    },
    errorText: {
        marginTop: 14,
        marginBottom: 20,
        textAlign: 'center',
        color: C.ink,
        fontSize: 15,
        lineHeight: 21,
    },
    retryButton: {
        backgroundColor: C.green,
        borderRadius: 14,
        paddingHorizontal: 26,
        paddingVertical: 12,
    },
    retryButtonText: {
        color: C.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
