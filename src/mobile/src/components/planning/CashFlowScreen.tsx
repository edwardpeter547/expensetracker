/**
 * Cash Flow screen for the Planning workspace.
 *
 * Values are illustrative projections, not confirmed account balances. Wiring
 * to existing recurring-transaction data remains a future integration.
 */

import {
    PLANNING_DEMO_CASH_FLOW_SERIES,
    PLANNING_DEMO_CASH_MOVEMENTS,
} from '@/constants/planningDemo';
import { Text, View } from 'react-native';
import PlanningDualLineChart from './PlanningDualLineChart';
import {
    PlanningCard,
    PlanningIconTile,
    PlanningPreviewNote,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/**
 * Render the Cash Flow screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Cash Flow screen.
 */
const CashFlowScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const inflows = PLANNING_DEMO_CASH_MOVEMENTS.filter((movement) => movement.amount >= 0)
        .reduce((sum, movement) => sum + movement.amount, 0);
    const outflows = PLANNING_DEMO_CASH_MOVEMENTS.filter((movement) => movement.amount < 0)
        .reduce((sum, movement) => sum + movement.amount, 0);

    return (
        <PlanningScreen title="Cash Flow" subtitle="Know what's coming next" onBack={onBack}>
            <PlanningCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>Projected Available Balance</Text>
                    <PlanningIconTile
                        icon="trending-up"
                        color={planningColors.emerald}
                        bg={planningColors.emeraldLight}
                        size={38}
                    />
                </View>
                <Text style={planningStyles.large}>
                    {formatPlanningMoney(2840, language, currency, 2)}
                </Text>
                <Text style={{ color: planningColors.emerald, fontSize: 12, fontWeight: '700' }}>
                    Estimated end-of-month balance
                </Text>
                <Text style={planningStyles.heading}>Income vs Expenses</Text>
                <PlanningDualLineChart
                    labels={PLANNING_DEMO_CASH_FLOW_SERIES.labels}
                    income={PLANNING_DEMO_CASH_FLOW_SERIES.income}
                    expense={PLANNING_DEMO_CASH_FLOW_SERIES.expense}
                />
            </PlanningCard>

            <View style={{ flexDirection: 'row', gap: 12 }}>
                <PlanningCard style={{ flex: 1 }}>
                    <PlanningIconTile
                        icon="trending-up"
                        color={planningColors.emerald}
                        bg={planningColors.emeraldLight}
                        size={38}
                    />
                    <Text style={planningStyles.muted}>Expected Inflows</Text>
                    <Text style={planningStyles.heading}>
                        {formatPlanningMoney(inflows, language, currency)}
                    </Text>
                </PlanningCard>
                <PlanningCard style={{ flex: 1 }}>
                    <PlanningIconTile
                        icon="trending-down"
                        color={planningColors.orange}
                        bg={planningColors.orangeLight}
                        size={38}
                    />
                    <Text style={planningStyles.muted}>Expected Outflows</Text>
                    <Text style={planningStyles.heading}>
                        {formatPlanningMoney(Math.abs(outflows), language, currency)}
                    </Text>
                </PlanningCard>
            </View>

            <PlanningCard>
                <Text style={planningStyles.heading}>Upcoming Cash Movements</Text>
                {PLANNING_DEMO_CASH_MOVEMENTS.map((movement) => (
                    <View key={movement.name} style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIconTile
                            icon={movement.icon}
                            color={movement.color}
                            bg={movement.bg}
                            size={42}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={planningStyles.body}>{movement.name}</Text>
                            <Text style={planningStyles.muted}>{movement.date}</Text>
                        </View>
                        <Text
                            style={[
                                planningStyles.body,
                                { color: movement.amount >= 0 ? planningColors.emerald : planningColors.text },
                            ]}
                        >
                            {movement.amount >= 0 ? '+' : '−'}
                            {formatPlanningMoney(Math.abs(movement.amount), language, currency)}
                        </Text>
                    </View>
                ))}
            </PlanningCard>

            <PlanningPreviewNote />
        </PlanningScreen>
    );
};

export default CashFlowScreen;
