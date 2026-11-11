/**
 * An elegant dual-line SVG chart for the Cash Flow screen.
 *
 * Two smooth lines (income and expense) share one axes space, each with a
 * gradient area fill and a filled data point at every sample. The chart is
 * drawn with the already-installed `react-native-svg` dependency and is
 * intentionally lightweight.
 */

import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, {
    Circle,
    Defs,
    Line,
    LinearGradient,
    Path,
    Stop,
} from 'react-native-svg';
import { planningStyles } from './PlanningUI';
import { planningColors } from './planningTheme';

/** The SVG coordinate space used for the chart. */
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;

/** Padding around the drawing area. */
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;

/** A single plotted point in SVG coordinates. */
interface ChartPoint {
    x: number;
    y: number;
}

/**
 * Build a smooth SVG path through a series of points.
 *
 * Uses a Catmull-Rom spline converted to cubic Bézier segments so the line
 * curves gently through each data point rather than jagging between them.
 *
 * @param {ChartPoint[]} points The ordered sample points.
 * @returns {string} An SVG path `d` string.
 */
const smoothPath = (points: ChartPoint[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    const segments = [`M ${points[0].x} ${points[0].y}`];
    for (let index = 0; index < points.length - 1; index += 1) {
        const previous = points[index - 1] ?? points[index];
        const current = points[index];
        const next = points[index + 1];
        const after = points[index + 2] ?? next;

        const controlOneX = current.x + (next.x - previous.x) / 6;
        const controlOneY = current.y + (next.y - previous.y) / 6;
        const controlTwoX = next.x - (after.x - current.x) / 6;
        const controlTwoY = next.y - (after.y - current.y) / 6;

        segments.push(
            `C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`,
        );
    }
    return segments.join(' ');
};

/**
 * Map raw values into evenly spaced SVG points.
 *
 * @param {number[]} values The raw sample values.
 * @param {number} max The shared maximum used for vertical scaling.
 * @param {number} chartWidth The width of the plotting area.
 * @param {number} chartHeight The height of the plotting area.
 * @returns {ChartPoint[]} The plotted points.
 */
const toPoints = (
    values: number[],
    max: number,
    chartWidth: number,
    chartHeight: number,
): ChartPoint[] => {
    const lastIndex = Math.max(1, values.length - 1);
    return values.map((value, index) => ({
        x: PAD_X + (chartWidth * index) / lastIndex,
        y: PAD_TOP + chartHeight - (chartHeight * value) / max,
    }));
};

/**
 * Build a closed area path that fills from the line down to the chart floor.
 *
 * @param {string} linePath The smooth line path.
 * @param {ChartPoint} first The first plotted point.
 * @param {ChartPoint} last The last plotted point.
 * @param {number} floorY The bottom edge of the plotting area.
 * @returns {string} The closed area path.
 */
const areaPath = (linePath: string, first: ChartPoint, last: ChartPoint, floorY: number): string =>
    `${linePath} L ${last.x} ${floorY} L ${first.x} ${floorY} Z`;

/**
 * Render the income-vs-expense dual-line chart.
 *
 * @param {object} props Chart props.
 * @param {string[]} props.labels X-axis labels, one per sample.
 * @param {number[]} props.income Income sample values.
 * @param {number[]} props.expense Expense sample values.
 * @param {string} [props.incomeColor] Income line color.
 * @param {string} [props.expenseColor] Expense line color.
 * @returns {JSX.Element} The chart with legend and axis labels.
 */
const PlanningDualLineChart = ({
    labels,
    income,
    expense,
    incomeColor = '#15966B',
    expenseColor = '#F06B3A',
}: {
    labels: string[];
    income: number[];
    expense: number[];
    incomeColor?: string;
    expenseColor?: string;
}) => {
    const { t } = useTranslation('planning');
    const chartWidth = VIEW_WIDTH - PAD_X * 2;
    const chartHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const floorY = PAD_TOP + chartHeight;
    const max = Math.max(...income, ...expense, 1);

    const incomePoints = toPoints(income, max, chartWidth, chartHeight);
    const expensePoints = toPoints(expense, max, chartWidth, chartHeight);
    const incomeLine = smoothPath(incomePoints);
    const expenseLine = smoothPath(expensePoints);

    const gridYs = [0, 1, 2, 3].map((index) => PAD_TOP + (chartHeight * index) / 3);

    return (
        <View style={{ gap: 12 }}>
            <Svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
                <Defs>
                    <LinearGradient id="planningIncomeFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={incomeColor} stopOpacity="0.24" />
                        <Stop offset="1" stopColor={incomeColor} stopOpacity="0.02" />
                    </LinearGradient>
                    <LinearGradient id="planningExpenseFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={expenseColor} stopOpacity="0.2" />
                        <Stop offset="1" stopColor={expenseColor} stopOpacity="0.02" />
                    </LinearGradient>
                </Defs>

                {gridYs.map((y) => (
                    <Line
                        key={`grid-${y}`}
                        x1={PAD_X}
                        y1={y}
                        x2={VIEW_WIDTH - PAD_X}
                        y2={y}
                        stroke={planningColors.track}
                        strokeWidth={1}
                        strokeDasharray="4 5"
                    />
                ))}

                <Path
                    d={areaPath(incomeLine, incomePoints[0], incomePoints[incomePoints.length - 1], floorY)}
                    fill="url(#planningIncomeFill)"
                />
                <Path
                    d={areaPath(expenseLine, expensePoints[0], expensePoints[expensePoints.length - 1], floorY)}
                    fill="url(#planningExpenseFill)"
                />

                <Path
                    d={incomeLine}
                    stroke={incomeColor}
                    strokeWidth={2.6}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Path
                    d={expenseLine}
                    stroke={expenseColor}
                    strokeWidth={2.6}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {incomePoints.map((point, index) => (
                    <Circle
                        key={`income-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        fill="#FFFFFF"
                        stroke={incomeColor}
                        strokeWidth={2.5}
                    />
                ))}
                {expensePoints.map((point, index) => (
                    <Circle
                        key={`expense-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        fill="#FFFFFF"
                        stroke={expenseColor}
                        strokeWidth={2.5}
                    />
                ))}
            </Svg>

            <View style={[planningStyles.row, { justifyContent: 'space-between', paddingHorizontal: 12 }]}>
                {labels.map((label) => (
                    <Text key={label} style={planningStyles.muted}>
                        {label}
                    </Text>
                ))}
            </View>

            <View style={[planningStyles.row, { gap: 18 }]}>
                <View style={[planningStyles.row, { gap: 7 }]}>
                    <View style={[styles.legendDot, { backgroundColor: incomeColor }]} />
                    <Text style={planningStyles.muted}>{t('Income')}</Text>
                </View>
                <View style={[planningStyles.row, { gap: 7 }]}>
                    <View style={[styles.legendDot, { backgroundColor: expenseColor }]} />
                    <Text style={planningStyles.muted}>{t('Expenses')}</Text>
                </View>
            </View>
        </View>
    );
};

/** Dual-line chart local styles. */
const styles = StyleSheet.create({
    legendDot: {
        height: 9,
        width: 9,
        borderRadius: 5,
    },
});

export default PlanningDualLineChart;
