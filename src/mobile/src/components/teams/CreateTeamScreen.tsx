/**
 * Three-step Create Team screen.
 *
 * Step 1 collects name and type; step 2 requires a finance model; step 3
 * reviews the choices before creating. The finance model is intentionally
 * immutable after creation and is surfaced as a controlled choice here.
 */

import {
    PlanningButton,
    PlanningField,
    PlanningIcon,
    PlanningIconTile,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { TeamCard, TeamSelectChips } from '@/components/teams/teamsPrimitives';
import type { FinanceMode, TeamKind } from '@/types/team';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the Create Team screen. */
export interface CreateTeamScreenProps {
    onBack: () => void;
    onCreate: (input: { name: string; kind: TeamKind; mode: FinanceMode }) => void;
}

/** Team kinds available in step 1. */
const TEAM_KINDS: readonly TeamKind[] = ['Family', 'Couple', 'Travel', 'Other'];

/** Finance models available in step 2. */
const FINANCE_MODELS: readonly {
    id: FinanceMode;
    name: string;
    description: string;
    icon: 'wallet' | 'users';
}[] = [
    {
        id: 'POOLED',
        name: 'Pool money together',
        description:
            'Members contribute to shared funds. Plan, request, approve and record spending.',
        icon: 'wallet',
    },
    {
        id: 'INDEPENDENT',
        name: 'Spend independently',
        description:
            'Everyone keeps their money and records purchases made for the team.',
        icon: 'users',
    },
];

/**
 * Render the three-step team creation flow.
 *
 * @param {CreateTeamScreenProps} props Component props.
 * @returns {JSX.Element} The create team screen.
 */
const CreateTeamScreen = ({ onBack, onCreate }: CreateTeamScreenProps) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [kind, setKind] = useState<TeamKind>('Family');
    const [mode, setMode] = useState<FinanceMode>('POOLED');

    /**
     * Submit the reviewed team choices.
     */
    const submit = () => {
        if (!name.trim()) return;
        onCreate({ name: name.trim(), kind, mode });
    };

    return (
        <PlanningScreen title="Create Team" subtitle="Set up your shared space" onBack={onBack}>
            <View style={styles.stepper}>
                {[1, 2, 3].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.step,
                            { backgroundColor: step >= index ? planningColors.emerald : planningColors.border },
                        ]}
                    />
                ))}
            </View>
            <Text style={planningStyles.muted}>Step {step} of 3</Text>

            {step === 1 ? (
                <>
                    <Text style={planningStyles.heading}>Tell us about your team</Text>
                    <TeamCard>
                        <PlanningField
                            label="Team name"
                            value={name}
                            onChange={setName}
                            placeholder="e.g. Our Family"
                        />
                        <Text style={planningStyles.fieldLabel}>Team type</Text>
                        <TeamSelectChips options={TEAM_KINDS} value={kind} onChange={setKind} />
                        <Text style={planningStyles.muted}>
                            Create a space for people you want to plan and track money with.
                        </Text>
                    </TeamCard>
                    <PlanningButton
                        label="Continue"
                        onPress={() => {
                            if (name.trim()) setStep(2);
                        }}
                    />
                </>
            ) : null}

            {step === 2 ? (
                <>
                    <Text style={planningStyles.heading}>How will your team manage money?</Text>
                    <Text style={planningStyles.muted}>
                        Choose the financial model that fits your team.
                    </Text>
                    {FINANCE_MODELS.map((model) => {
                        const active = mode === model.id;
                        const pooled = model.id === 'POOLED';
                        return (
                            <PressableCard
                                key={model.id}
                                active={active}
                                onPress={() => setMode(model.id)}
                            >
                                <PlanningIconTile
                                    icon={model.icon}
                                    color={pooled ? planningColors.emerald : planningColors.blue}
                                    bg={pooled ? planningColors.emeraldLight : planningColors.blueLight}
                                    size={42}
                                />
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={planningStyles.body}>{model.name}</Text>
                                    <Text style={planningStyles.muted}>{model.description}</Text>
                                </View>
                                <PlanningIcon
                                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                    color={active ? planningColors.emerald : planningColors.muted}
                                    size={22}
                                />
                            </PressableCard>
                        );
                    })}
                    <PlanningButton label="Continue" onPress={() => setStep(3)} />
                </>
            ) : null}

            {step === 3 ? (
                <>
                    <Text style={planningStyles.heading}>Review your team</Text>
                    <TeamCard>
                        <ReviewRow label="Name" value={name || '—'} />
                        <ReviewRow label="Type" value={kind} />
                        <ReviewRow
                            label="Finance model"
                            value={mode === 'POOLED' ? 'Pooled Funds' : 'Independent Spending'}
                        />
                    </TeamCard>
                    <TeamCard style={styles.warningCard}>
                        <PlanningIcon name="shield-check" color="#315D75" size={20} />
                        <Text style={styles.warningText}>
                            Changing the finance model after transactions exist will require a
                            controlled process.
                        </Text>
                    </TeamCard>
                    <PlanningButton label="Create Team" onPress={submit} />
                </>
            ) : null}

            {step > 1 ? (
                <PlanningButton
                    label="Previous Step"
                    outline
                    onPress={() => setStep((current) => current - 1)}
                />
            ) : null}
        </PlanningScreen>
    );
};

/** Props for the selectable finance-model card. */
interface PressableCardProps {
    active: boolean;
    onPress: () => void;
    children: ReactNode;
}

/**
 * Render a pressable finance-model card.
 *
 * @param {PressableCardProps} props Component props.
 * @returns {JSX.Element} The card.
 */
const PressableCard = ({ active, onPress, children }: PressableCardProps) => (
    <TeamCard
        style={
            active
                ? { borderWidth: 2, borderColor: planningColors.emerald }
                : undefined
        }
    >
        <View style={[planningStyles.row, { gap: 12, alignItems: 'flex-start' }]}>
            {children}
        </View>
        <PlanningButton label={active ? 'Selected' : 'Choose this model'} outline={!active} onPress={onPress} />
    </TeamCard>
);

/** Props for a review row. */
interface ReviewRowProps {
    label: string;
    value: string;
}

/**
 * Render a label/value review row.
 *
 * @param {ReviewRowProps} props Component props.
 * @returns {JSX.Element} The row.
 */
const ReviewRow = ({ label, value }: ReviewRowProps) => (
    <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
        <Text style={planningStyles.muted}>{label}</Text>
        <Text style={planningStyles.body}>{value}</Text>
    </View>
);

/** Create Team screen styles. */
const styles = StyleSheet.create({
    stepper: {
        flexDirection: 'row',
        gap: 6,
    },
    step: {
        flex: 1,
        height: 5,
        borderRadius: 8,
    },
    warningCard: {
        backgroundColor: '#EAF5F9',
    },
    warningText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#5D798C',
    },
});

export default CreateTeamScreen;
