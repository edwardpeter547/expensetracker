/**
 * Savings Goals screen for the Planning workspace.
 *
 * Goals are personal savings allocations and are demo-only here because no
 * goals endpoint exists yet. Contributions never become spending transactions.
 */

import {
    addDemoGoalContribution,
    addDemoPlanningGoal,
    getDemoPlanningGoals,
    type PlanningGoal,
} from '@/constants/planningDemo';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
    PlanningButton,
    PlanningCard,
    PlanningField,
    PlanningIconTile,
    PlanningModalPanel,
    PlanningProgress,
    PlanningPreviewNote,
    PlanningScreen,
    planningStyles,
} from './PlanningUI';
import { formatPlanningMoney, planningColors } from './planningTheme';

/** Modal modes used by the create/contribute flow. */
type GoalModal = 'new' | 'contribute' | null;

/**
 * Render the Savings Goals screen.
 *
 * @param {object} props Screen props.
 * @returns {JSX.Element} The Savings Goals screen.
 */
const SavingsGoalsScreen = ({
    currency,
    language,
    onBack,
}: {
    currency: string;
    language: string;
    onBack: () => void;
}) => {
    const [goals, setGoals] = useState<PlanningGoal[]>(getDemoPlanningGoals());
    const [modal, setModal] = useState<GoalModal>(null);
    const [selected, setSelected] = useState('');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    const saved = goals.reduce((sum, goal) => sum + goal.saved, 0);
    const total = goals.reduce((sum, goal) => sum + goal.target, 0);
    const achievedPercent = total > 0 ? Math.round((saved / total) * 100) : 0;

    const submit = () => {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

        if (modal === 'new') {
            if (!name.trim()) return;
            addDemoPlanningGoal(name, numericAmount);
        } else {
            addDemoGoalContribution(selected, numericAmount);
        }

        setGoals(getDemoPlanningGoals());
        setName('');
        setAmount('');
        setModal(null);
    };

    return (
        <View style={{ flex: 1 }}>
            <PlanningScreen
                title="Savings Goals"
                subtitle="Make your future goals achievable"
                onBack={onBack}
                onAction={() => setModal('new')}
            >
                <PlanningCard>
                    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                        <View style={{ gap: 5 }}>
                            <Text style={planningStyles.muted}>Total Savings Progress</Text>
                            <Text style={planningStyles.large}>
                                {formatPlanningMoney(saved, language, currency)}
                            </Text>
                            <Text style={planningStyles.muted}>
                                of {formatPlanningMoney(total, language, currency)} combined targets
                            </Text>
                        </View>
                        <PlanningIconTile
                            icon="piggy-bank"
                            color={planningColors.emerald}
                            bg={planningColors.emeraldLight}
                        />
                    </View>
                    <PlanningProgress value={achievedPercent} />
                    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                        <Text style={planningStyles.muted}>{goals.length} active goals</Text>
                        <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>
                            {achievedPercent}% achieved
                        </Text>
                    </View>
                </PlanningCard>

                <Text style={planningStyles.heading}>My Savings Goals</Text>
                {goals.map((goal) => {
                    const goalPercent = goal.target > 0
                        ? Math.round((goal.saved / goal.target) * 100)
                        : 0;
                    return (
                        <TouchableOpacity
                            key={goal.id}
                            onPress={() => {
                                setSelected(goal.id);
                                setAmount('');
                                setModal('contribute');
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Add contribution to ${goal.name}`}
                        >
                            <PlanningCard>
                                <View style={[planningStyles.row, { gap: 12 }]}>
                                    <PlanningIconTile icon={goal.icon} color={goal.color} bg={goal.bg} size={50} />
                                    <View style={{ flex: 1, gap: 5 }}>
                                        <Text style={planningStyles.body}>{goal.name}</Text>
                                        <Text style={planningStyles.muted}>Target: {goal.date}</Text>
                                    </View>
                                </View>
                                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                                    <Text style={planningStyles.body}>
                                        {formatPlanningMoney(goal.saved, language, currency)} /{' '}
                                        {formatPlanningMoney(goal.target, language, currency)}
                                    </Text>
                                    <Text style={{ color: goal.color, fontWeight: '700' }}>{goalPercent}%</Text>
                                </View>
                                <PlanningProgress value={goalPercent} color={goal.color} />
                            </PlanningCard>
                        </TouchableOpacity>
                    );
                })}

                <PlanningCard style={{ backgroundColor: '#E7F5F7' }}>
                    <Text style={[planningStyles.body, { color: '#21665F' }]}>✦ Keep building your future</Text>
                    <Text style={[planningStyles.muted, { color: '#587F83' }]}>
                        Consistent contributions can help you reach your goals sooner.
                    </Text>
                </PlanningCard>

                <PlanningButton label="＋ Create Savings Goal" outline onPress={() => setModal('new')} />
                <PlanningPreviewNote />
            </PlanningScreen>

            {modal ? (
                <PlanningModalPanel
                    title={modal === 'new' ? 'Create Savings Goal' : 'Add Contribution'}
                    onClose={() => setModal(null)}
                >
                    {modal === 'new' ? (
                        <PlanningField
                            label="Goal name"
                            value={name}
                            onChange={setName}
                            placeholder="e.g. New Car"
                        />
                    ) : null}
                    <PlanningField
                        label={modal === 'new' ? 'Target amount' : 'Contribution amount'}
                        value={amount}
                        onChange={setAmount}
                        keyboardType="numeric"
                    />
                    <PlanningPreviewNote />
                    <PlanningButton label="Save" onPress={submit} />
                </PlanningModalPanel>
            ) : null}
        </View>
    );
};

export default SavingsGoalsScreen;
