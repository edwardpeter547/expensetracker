/**
 * Savings Goals screen for the Planning workspace.
 *
 * Goals are personal savings allocations and are demo-only here because no
 * goals endpoint exists yet. Contributions never become spending transactions.
 */

import { planningDataSource } from '@/contracts';
import type { PlanningGoal } from '@/types/planning';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('planning');
    const [goals, setGoals] = useState<PlanningGoal[]>([]);
    const [modal, setModal] = useState<GoalModal>(null);
    const [selected, setSelected] = useState('');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        let active = true;
        planningDataSource.goals().then((items) => {
            if (active) setGoals(items);
        });
        return () => {
            active = false;
        };
    }, []);

    const saved = goals.reduce((sum, goal) => sum + goal.saved, 0);
    const total = goals.reduce((sum, goal) => sum + goal.target, 0);
    const achievedPercent = total > 0 ? Math.round((saved / total) * 100) : 0;

    const submit = async () => {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

        if (modal === 'new') {
            if (!name.trim()) return;
            await planningDataSource.addGoal(name, numericAmount);
        } else {
            await planningDataSource.contribute(selected, numericAmount);
        }

        setGoals(await planningDataSource.goals());
        setName('');
        setAmount('');
        setModal(null);
    };

    return (
        <View style={{ flex: 1 }}>
            <PlanningScreen
                title={t('Savings Goals')}
                subtitle={t('Make your future goals achievable')}
                onBack={onBack}
                onAction={() => setModal('new')}
            >
                <PlanningCard>
                    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                        <View style={{ gap: 5 }}>
                            <Text style={planningStyles.muted}>{t('Total Savings Progress')}</Text>
                            <Text style={planningStyles.large}>
                                {formatPlanningMoney(saved, language, currency)}
                            </Text>
                            <Text style={planningStyles.muted}>
                                {t('of {{total}} combined targets', {total: formatPlanningMoney(total, language, currency)})}
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
                        <Text style={planningStyles.muted}>{t('activeGoals', {count: goals.length})}</Text>
                        <Text style={{ color: planningColors.emerald, fontWeight: '700' }}>
                            {t('{{percent}}% achieved', {percent: achievedPercent})}
                        </Text>
                    </View>
                </PlanningCard>

                <Text style={planningStyles.heading}>{t('My Savings Goals')}</Text>
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
                            accessibilityLabel={t('Add contribution to {{name}}', {name: goal.name})}
                        >
                            <PlanningCard>
                                <View style={[planningStyles.row, { gap: 12 }]}>
                                    <PlanningIconTile icon={goal.icon} color={goal.color} bg={goal.bg} size={50} />
                                    <View style={{ flex: 1, gap: 5 }}>
                                        <Text style={planningStyles.body}>{goal.name}</Text>
                                        <Text style={planningStyles.muted}>{t('Target: {{date}}', {date: goal.date})}</Text>
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
                    <Text style={[planningStyles.body, { color: '#21665F' }]}>{t('✦ Keep building your future')}</Text>
                    <Text style={[planningStyles.muted, { color: '#587F83' }]}>
                        {t('Consistent contributions can help you reach your goals sooner.')}
                    </Text>
                </PlanningCard>

                <PlanningButton label={t('＋ Create Savings Goal')} outline onPress={() => setModal('new')} />
                <PlanningPreviewNote />
            </PlanningScreen>

            {modal ? (
                <PlanningModalPanel
                    title={modal === 'new' ? t('Create Savings Goal') : t('Add Contribution')}
                    onClose={() => setModal(null)}
                >
                    {modal === 'new' ? (
                        <PlanningField
                            label={t('Goal name')}
                            value={name}
                            onChange={setName}
                            placeholder={t('e.g. New Car')}
                        />
                    ) : null}
                    <PlanningField
                        label={modal === 'new' ? t('Target amount') : t('Contribution amount')}
                        value={amount}
                        onChange={setAmount}
                        keyboardType="numeric"
                    />
                    <PlanningPreviewNote />
                    <PlanningButton label={t('Save')} onPress={submit} />
                </PlanningModalPanel>
            ) : null}
        </View>
    );
};

export default SavingsGoalsScreen;
