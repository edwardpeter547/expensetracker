/**
 * Small shared primitives for Teams screens.
 *
 * These build on the approved Planning light palette so team screens stay
 * visually consistent with the frozen personal Planning design without
 * duplicating its color system.
 */

import { PlanningCard } from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { teamModeShort } from '@/components/teams/teamPresentation';
import type { FinanceMode } from '@/types/team';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

/** Props for the team card wrapper. */
export interface TeamCardProps {
    children: ReactNode;
    style?: object;
}

/**
 * Render a white team card with a subtle shadow so it reads as a distinct
 * surface against the screen background.
 *
 * @param {TeamCardProps} props Component props.
 * @returns {JSX.Element} The team card.
 */
export const TeamCard = ({ children, style }: TeamCardProps) => (
    <PlanningCard style={[styles.card, style]}>{children}</PlanningCard>
);

/** Props for the finance-mode badge. */
export interface ModeBadgeProps {
    mode: FinanceMode;
}

/**
 * Render a compact finance-mode badge.
 *
 * @param {ModeBadgeProps} props Component props.
 * @returns {JSX.Element} The badge.
 */
export const ModeBadge = ({ mode }: ModeBadgeProps) => {
    const { t } = useTranslation('teams');
    const pooled = mode === 'POOLED';
    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: pooled ? planningColors.emeraldLight : planningColors.blueLight },
            ]}
        >
            <Text
                style={[
                    styles.badgeText,
                    { color: pooled ? planningColors.emerald : planningColors.blue },
                ]}
            >
                {t(teamModeShort(mode))}
            </Text>
        </View>
    );
};

/** Props for the single-select chip row. */
export interface TeamSelectChipOption<T extends string> {
    value: T;
    label: string;
}

/** Props for the single-select chip row. */
export interface TeamSelectChipsProps<T extends string> {
    options: readonly TeamSelectChipOption<T>[];
    value: T;
    onChange: (value: T) => void;
}

/**
 * Render a wrapping row of selectable chips.
 *
 * @template T The option value type.
 * @param {TeamSelectChipsProps<T>} props Component props.
 * @returns {JSX.Element} The chip row.
 */
export const TeamSelectChips = <T extends string>({
    options,
    value,
    onChange,
}: TeamSelectChipsProps<T>) => (
    <View style={styles.chips}>
        {options.map((option) => {
            const active = option.value === value;
            return (
                <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => onChange(option.value)}
                    style={[styles.chip, active && styles.chipActive]}
                >
                    <Text
                        style={[
                            styles.chipText,
                            { color: active ? planningColors.emerald : planningColors.muted },
                            active && styles.chipTextActive,
                        ]}
                    >
                        {option.label}
                    </Text>
                </Pressable>
            );
        })}
    </View>
);

/** Props for the labelled section heading. */
export interface TeamSectionHeadingProps {
    title: string;
    subtitle?: string;
}

/**
 * Render a section heading inside a team screen.
 *
 * @param {TeamSectionHeadingProps} props Component props.
 * @returns {JSX.Element} The heading.
 */
export const TeamSectionHeading = ({ title, subtitle }: TeamSectionHeadingProps) => (
    <View style={styles.heading}>
        <Text style={styles.headingTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headingSubtitle}>{subtitle}</Text> : null}
    </View>
);

/** Team primitive styles. */
const styles = StyleSheet.create({
    badge: {
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: planningColors.border,
        backgroundColor: '#F1F4F8',
    },
    chipActive: {
        backgroundColor: planningColors.emeraldLight,
        borderColor: '#9DD9BD',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '700',
    },
    chipTextActive: {
        color: planningColors.emerald,
    },
    heading: {
        gap: 3,
    },
    headingTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: planningColors.text,
    },
    headingSubtitle: {
        fontSize: 12,
        color: planningColors.muted,
    },
    card: {
        backgroundColor: '#FFFDF8',
        borderColor: '#E7EDF3',
        shadowColor: '#12213A',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
    },
});
