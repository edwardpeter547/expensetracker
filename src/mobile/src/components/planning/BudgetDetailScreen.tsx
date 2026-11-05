/**
 * Budget Detail screen for a single category budget.
 *
 * Presents the category summary, spending progress, a weekly spending chart,
 * and recent transactions, with a route to the full transaction list.
 */

import type { PlanningBudget } from '@/constants/planningDemo';
import type { PlanningTransactionItem } from '@/utils/planning';
import { Text, View } from 'react-native';
import {
    PlanningBarChart,
    PlanningButton,
    PlanningCard,
    PlanningIconTile,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/** Labels for the four weekly spending buckets. */
const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4'];

/**
 * Render the Budget Detail screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Budget Detail screen.
 */
const BudgetDetailScreen = ({
    budget,
    weeklyValues,
    transactions,
    currency,
    language,
    onBack,
    onSeeAll,
}: {
    budget: PlanningBudget;
    weeklyValues: number[];
    transactions: PlanningTransactionItem[];
    currency: string;
    language: string;
    onBack: () => void;
    onSeeAll: () => void;
}) => {
    const usedPercent = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;

    return (
        <PlanningScreen
            title={budget.name}
            subtitle="Category budget details"
            onBack={onBack}
        >
            <PlanningCard>
                <View style={[planningStyles.row, { gap: 12 }]}>
                    <PlanningIconTile icon={budget.icon} color={budget.color} bg={budget.bg} size={54} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Text style={planningStyles.muted}>Monthly budget</Text>
                        <Text style={planningStyles.heading}>
                            {formatPlanningMoney(budget.spent, language, currency)} /{' '}
                            {formatPlanningMoney(budget.limit, language, currency)}
                        </Text>
                    </View>
                </View>
                <PlanningProgress value={usedPercent} color={budget.color} />
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>{usedPercent}% used</Text>
                    <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>
                        {formatPlanningMoney(budget.limit - budget.spent, language, currency)} remaining
                    </Text>
                </View>
            </PlanningCard>

            <PlanningCard>
                <Text style={planningStyles.heading}>Weekly Spending</Text>
                <PlanningBarChart values={weeklyValues} labels={WEEK_LABELS} />
            </PlanningCard>

            <PlanningCard>
                <Text style={planningStyles.heading}>Recent Transactions</Text>
                {transactions.length === 0 ? (
                    <Text style={planningStyles.muted}>No recent transactions for this category.</Text>
                ) : (
                    transactions.map((transaction) => (
                        <View key={transaction.id} style={[planningStyles.row, { gap: 12 }]}>
                            <PlanningIconTile
                                icon={transaction.icon}
                                color={transaction.color}
                                bg={transaction.bg}
                                size={42}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={planningStyles.body}>{transaction.title}</Text>
                                <Text style={planningStyles.muted}>{transaction.dateLabel}</Text>
                            </View>
                            <Text style={planningStyles.body}>
                                −{formatPlanningMoney(transaction.amount, language, currency, 2)}
                            </Text>
                        </View>
                    ))
                )}
                <PlanningButton label="See All Transactions" outline onPress={onSeeAll} />
            </PlanningCard>
        </PlanningScreen>
    );
};

export default BudgetDetailScreen;
