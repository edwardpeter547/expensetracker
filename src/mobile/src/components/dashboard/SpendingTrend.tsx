/**
 * Compact six-month income-versus-expenses trend for the dashboard.
 *
 * The legend keys sit beneath the title, the fixed-width bar chart sits on the
 * left, and a small trend summary (average income, average expenses, and
 * savings rate) fills the right-hand column.
 */

import { formatMoney } from '@/localization/format';
import type { SpendingTrendPoint } from '@/types/dashboard';
import { fromScaledInteger, toScaledInteger } from '@/utils/money';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';

/** Fixed chart dimensions and bar geometry. */
const CHART_WIDTH = 170;
const CHART_HEIGHT = 110;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 94;
const BAR_WIDTH = 8;

/** Props for the spending trend component. */
export interface SpendingTrendProps {
    /** Six monthly buckets, oldest first. */
    points: SpendingTrendPoint[];
    /** Display currency for the summary amounts. */
    currency: string;
    /** Display locale for the summary amounts. */
    language: string;
    /** Name of the highest-spending category, shown beside Avg expenses. */
    topCategory?: string;
}

/**
 * Average a list of exact decimal strings, rounding to four decimal places.
 *
 * @param {string[]} values The monthly amounts.
 * @returns {string} The average as a canonical decimal string.
 */
const averageMoney = (values: string[]): string => {
    if (values.length === 0) return '0';

    const sum = values.reduce((total, value) => total + toScaledInteger(value), 0n);
    const divisor = BigInt(values.length);
    const half = divisor / 2n;
    const rounded = (sum + (sum >= 0n ? half : -half)) / divisor;
    return fromScaledInteger(rounded);
};

/**
 * Render the six-month grouped-bar trend with its summary column.
 *
 * @param {SpendingTrendProps} props Trend props.
 * @returns {JSX.Element} The trend section.
 */
const SpendingTrend = ({
    points,
    currency,
    language,
    topCategory = '—',
}: SpendingTrendProps) => {
    const maximum = Math.max(
        0,
        ...points.flatMap((point) => [Number(point.income), Number(point.expenses)]),
    );
    const hasActivity = maximum > 0;
    const slotWidth = points.length > 0 ? CHART_WIDTH / points.length : CHART_WIDTH;
    const groupWidth = BAR_WIDTH * 2;

    const totalIncome = points.reduce(
        (total, point) => total + toScaledInteger(point.income),
        0n,
    );
    const totalExpenses = points.reduce(
        (total, point) => total + toScaledInteger(point.expenses),
        0n,
    );
    const net = totalIncome - totalExpenses;
    const savingsRate =
        totalIncome > 0n
            ? Number(
                (net * 100n + (net >= 0n ? totalIncome / 2n : -totalIncome / 2n)) /
                    totalIncome,
            )
            : null;

    /**
     * Map a month index to the left edge of its touching bar pair.
     *
     * @param {number} index The month index.
     * @returns {number} The x coordinate in view-box units.
     */
    const xFor = (index: number): number =>
        slotWidth * index + (slotWidth - groupWidth) / 2;

    /**
     * Map an amount to a bar height.
     *
     * @param {string|number} value The monthly amount.
     * @returns {number} The bar height in view-box units.
     */
    const heightFor = (value: string | number): number => {
        if (maximum === 0) return 0;
        return (Math.max(0, Number(value)) / maximum) * (PLOT_BOTTOM - PLOT_TOP);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>6-Month Trend</Text>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2BAC7B' }]} />
                    <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E8666C' }]} />
                    <Text style={styles.legendText}>Expenses</Text>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.chartColumn}>
                    <Svg
                        width={CHART_WIDTH}
                        height={CHART_HEIGHT}
                        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    >
                        <Line
                            x1={0}
                            y1={PLOT_BOTTOM}
                            x2={CHART_WIDTH}
                            y2={PLOT_BOTTOM}
                            stroke="#DCE3EB"
                            strokeWidth={1}
                        />
                        {points.map((point, index) => {
                            const groupX = xFor(index);
                            const incomeHeight = heightFor(point.income);
                            const expenseHeight = heightFor(point.expenses);

                            return (
                                <G key={`${point.month}-${index}`}>
                                    <Rect
                                        x={groupX}
                                        y={PLOT_BOTTOM - incomeHeight}
                                        width={BAR_WIDTH}
                                        height={incomeHeight}
                                        fill="#2BAC7B"
                                    />
                                    <Rect
                                        x={groupX + BAR_WIDTH}
                                        y={PLOT_BOTTOM - expenseHeight}
                                        width={BAR_WIDTH}
                                        height={expenseHeight}
                                        fill="#E8666C"
                                    />
                                </G>
                            );
                        })}
                    </Svg>

                    {points.length > 0 ? (
                        <View style={styles.months}>
                            {points.map((point, index) => (
                                <Text
                                    key={`${point.month}-${index}`}
                                    style={styles.monthLabel}
                                >
                                    {point.month}
                                </Text>
                            ))}
                        </View>
                    ) : null}
                </View>

                <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCell}>
                            <Text style={styles.statLabel}>Avg income</Text>
                            <Text style={styles.statValue}>
                                {formatMoney(
                                    averageMoney(points.map((point) => point.income)),
                                    language,
                                    currency,
                                    0,
                                )}
                            </Text>
                        </View>
                        <View style={[styles.summaryCell, styles.summaryCellRight]}>
                            <Text style={[styles.statLabel, styles.statTextRight]}>
                                Savings rate
                            </Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    styles.statTextRight,
                                    {
                                        color:
                                            savingsRate === null
                                                ? '#8997AC'
                                                : savingsRate >= 0
                                                    ? '#2BAC7B'
                                                    : '#E8666C',
                                    },
                                ]}
                            >
                                {savingsRate === null ? '—' : `${savingsRate}%`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCell}>
                            <Text style={styles.statLabel}>Avg expenses</Text>
                            <Text style={styles.statValue}>
                                {formatMoney(
                                    averageMoney(points.map((point) => point.expenses)),
                                    language,
                                    currency,
                                    0,
                                )}
                            </Text>
                        </View>
                        <View style={[styles.summaryCell, styles.summaryCellRight]}>
                            <Text style={[styles.statLabel, styles.statTextRight]}>
                                Top category
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[styles.statValue, styles.statTextRight]}
                            >
                                {topCategory}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {!hasActivity ? (
                <Text style={styles.emptyText}>No activity in the last 6 months</Text>
            ) : null}
        </View>
    );
};

/** Spending trend styles. */
const styles = StyleSheet.create({
    container: {
        marginTop: 30,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#12213A',
        letterSpacing: -0.3,
        marginBottom: 20,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        marginBottom: 18,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#12213A',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    chartColumn: {
        width: CHART_WIDTH,
    },
    months: {
        flexDirection: 'row',
        width: CHART_WIDTH,
        marginTop: 6,
    },
    monthLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 11,
        color: '#8997AC',
    },
    summary: {
        flex: 1,
        paddingLeft: 16,
        gap: 14,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    summaryCell: {
        flex: 1,
        minWidth: 0,
    },
    summaryCellRight: {
        alignItems: 'flex-end',
    },
    statLabel: {
        fontSize: 13,
        color: '#8997AC',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#12213A',
        letterSpacing: -0.3,
    },
    statTextRight: {
        textAlign: 'right',
    },
    emptyText: {
        fontSize: 13,
        color: '#8997AC',
        marginTop: 14,
    },
});

export default SpendingTrend;
