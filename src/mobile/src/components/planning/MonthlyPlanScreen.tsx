/**
 * Monthly Plan screen for the Planning workspace.
 *
 * The allocations are intended plans, not actual spending. Editing and saving
 * remain a future integration.
 */

import { PLANNING_DEMO_ALLOCATIONS, PLANNING_DEMO_INCOME } from '@/constants/planningDemo';
import { Text, View } from 'react-native';
import {
    PlanningCard,
    PlanningIconTile,
    PlanningPreviewNote,
    PlanningProgress,
    PlanningScreen,
    PlanningStat,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/**
 * Render the Monthly Plan screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Monthly Plan screen.
 */
const MonthlyPlanScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const allocated = PLANNING_DEMO_ALLOCATIONS.reduce((sum, allocation) => sum + allocation.amount, 0);
    const unallocated = PLANNING_DEMO_INCOME - allocated;
    const allocationPercent = Math.round((allocated / PLANNING_DEMO_INCOME) * 100);

    return (
        <PlanningScreen title="Monthly Plan" subtitle="Give every pound a purpose" onBack={onBack}>
            <PlanningCard>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <View>
                        <Text style={planningStyles.muted}>Planned Monthly Income</Text>
                        <Text style={planningStyles.large}>
                            {formatPlanningMoney(PLANNING_DEMO_INCOME, language, currency)}
                        </Text>
                    </View>
                    <PlanningIconTile
                        icon="wallet"
                        color={planningColors.emerald}
                        bg={planningColors.emeraldLight}
                    />
                </View>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <PlanningStat label="Allocated" value={formatPlanningMoney(allocated, language, currency)} />
                    <PlanningStat
                        label="Unallocated"
                        value={formatPlanningMoney(unallocated, language, currency)}
                        color={planningColors.emerald}
                    />
                </View>
                <PlanningProgress value={allocationPercent} />
            </PlanningCard>

            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.heading}>Your Allocations</Text>
                <Text style={planningStyles.muted}>November 2026</Text>
            </View>

            <PlanningCard>
                {PLANNING_DEMO_ALLOCATIONS.map((allocation) => (
                    <View key={allocation.name} style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIconTile
                            icon={allocation.icon}
                            color={allocation.color}
                            bg={allocation.bg}
                            size={42}
                        />
                        <Text style={[planningStyles.body, { flex: 1 }]}>{allocation.name}</Text>
                        <Text style={planningStyles.body}>
                            {formatPlanningMoney(allocation.amount, language, currency)}
                        </Text>
                    </View>
                ))}
            </PlanningCard>

            <PlanningCard style={{ backgroundColor: planningColors.emeraldLight }}>
                <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>✓ Room in your plan</Text>
                <Text style={planningStyles.muted}>
                    You still have {formatPlanningMoney(unallocated, language, currency)} available to
                    allocate this month.
                </Text>
            </PlanningCard>

            <PlanningPreviewNote />
        </PlanningScreen>
    );
};

export default MonthlyPlanScreen;
