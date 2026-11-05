/**
 * Team workspace overview.
 *
 * Shows the mode-specific financial summary, entry points for members/chat,
 * the team finance tool grid, a mode-specific member breakdown, and an
 * explicit note about the pending personal-category integration.
 */

import {
    PlanningButton,
    PlanningIcon,
    PlanningIconTile,
    PlanningProgress,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { formatPlanningMoney, planningColors } from '@/components/planning/planningTheme';
import { teamKindIcon } from '@/components/teams/teamPresentation';
import { ModeBadge, TeamCard, TeamSectionHeading } from '@/components/teams/teamsPrimitives';
import type { Team } from '@/types/team';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** A team finance tool entry. */
interface TeamTool {
    key: string;
    name: string;
    icon: Parameters<typeof PlanningIconTile>[0]['icon'];
    color: string;
    bg: string;
}

/** The approved team finance tool grid. */
const TEAM_TOOLS: TeamTool[] = [
    { key: 'budgets', name: 'Budgets', icon: 'wallet', color: planningColors.emerald, bg: planningColors.emeraldLight },
    { key: 'goals', name: 'Savings Goals', icon: 'target', color: planningColors.blue, bg: planningColors.blueLight },
    { key: 'insights', name: 'Insights', icon: 'chart-no-axes-combined', color: planningColors.purple, bg: planningColors.purpleLight },
    { key: 'monthly-plan', name: 'Monthly Plan', icon: 'calendar-days', color: planningColors.orange, bg: planningColors.orangeLight },
    { key: 'cash-flow', name: 'Cash Flow', icon: 'trending-up', color: planningColors.teal, bg: planningColors.tealLight },
    { key: 'planned-expenses', name: 'Planned Expenses', icon: 'shopping-bag', color: planningColors.pink, bg: planningColors.pinkLight },
    { key: 'expenses', name: 'Shared Expenses', icon: 'receipt', color: planningColors.blue, bg: planningColors.blueLight },
    { key: 'activity', name: 'Activity', icon: 'time', color: planningColors.muted, bg: '#F0F3F8' },
];

/** Props for the Team workspace screen. */
export interface TeamWorkspaceScreenProps {
    team: Team;
    currency: string;
    language: string;
    memberCount: number;
    messageCount: number;
    activityCount: number;
    onBack: () => void;
    onMembers: () => void;
    onChat: () => void;
    onTool: (key: string) => void;
    onInvite: () => void;
    onBreakdown: () => void;
}

/**
 * Render the Team workspace overview.
 *
 * @param {TeamWorkspaceScreenProps} props Component props.
 * @returns {JSX.Element} The workspace screen.
 */
const TeamWorkspaceScreen = ({
    team,
    currency,
    language,
    memberCount,
    messageCount,
    activityCount,
    onBack,
    onMembers,
    onChat,
    onTool,
    onInvite,
    onBreakdown,
}: TeamWorkspaceScreenProps) => {
    const pooled = team.mode === 'POOLED';
    const progress = team.budgetTarget > 0
        ? Math.round((team.spent / team.budgetTarget) * 100)
        : 0;
    const headline = pooled ? team.budgetTarget - team.spent : team.spent;
    const headlineLabel = pooled
        ? 'Available team funds (tracked)'
        : 'Total team spending this month';
    const secondaryLabel = pooled
        ? 'Team fund allocation'
        : 'Shared spending target';

    return (
        <PlanningScreen title={team.name} subtitle="Team workspace" onBack={onBack}>
            <TeamCard>
                <View style={[planningStyles.row, { gap: 12 }]}>
                    <PlanningIconTile
                        icon={teamKindIcon(team.kind)}
                        color={pooled ? planningColors.emerald : planningColors.blue}
                        bg={pooled ? planningColors.emeraldLight : planningColors.blueLight}
                        size={42}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={planningStyles.body}>{team.name}</Text>
                        <Text style={planningStyles.muted}>{team.memberCount} members</Text>
                    </View>
                    <ModeBadge mode={team.mode} />
                </View>

                <Text style={planningStyles.muted}>{headlineLabel}</Text>
                <Text style={planningStyles.large}>
                    {formatPlanningMoney(headline, language, currency)}
                </Text>
                <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                    <Text style={planningStyles.muted}>{secondaryLabel}</Text>
                    <Text style={planningStyles.body}>
                        {formatPlanningMoney(team.budgetTarget, language, currency)}
                    </Text>
                </View>
                <PlanningProgress value={progress} color={pooled ? planningColors.emerald : planningColors.blue} />
                <Text style={planningStyles.muted}>
                    {pooled
                        ? 'Tracked pool — AuditWallet does not hold funds.'
                        : 'Each member keeps their own money; totals are recorded purchases.'}
                </Text>
            </TeamCard>

            <View style={styles.tileRow}>
                <ToolTile
                    title="Members"
                    subtitle="People & roles"
                    icon="users"
                    color={planningColors.blue}
                    bg={planningColors.blueLight}
                    badgeCount={memberCount}
                    onPress={onMembers}
                />
                <ToolTile
                    title="Team Chat"
                    subtitle="Group messages"
                    icon="chatbubbles"
                    color={planningColors.emerald}
                    bg={planningColors.emeraldLight}
                    badgeCount={messageCount}
                    onPress={onChat}
                />
            </View>

            <TeamSectionHeading
                title="Team Finance Tools"
                subtitle="Custom tools to manage team finance"
            />
            <View style={styles.tileRow}>
                {TEAM_TOOLS.map((tool) => (
                    <ToolTile
                        key={tool.key}
                        title={tool.name}
                        icon={tool.icon}
                        color={tool.color}
                        bg={tool.bg}
                        centered
                        iconSize={54}
                        badgeCount={tool.key === 'activity' ? activityCount : undefined}
                        badgeColor={tool.key === 'activity' ? planningColors.orange : undefined}
                        onPress={() => onTool(tool.key)}
                    />
                ))}
            </View>

            <TeamCard>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pooled ? 'Team contributions' : 'Member spending'}
                    onPress={onBreakdown}
                    style={[planningStyles.row, { justifyContent: 'space-between' }]}
                >
                    <View style={[planningStyles.row, { gap: 10 }]}>
                        <PlanningIconTile
                            icon="cash"
                            color={planningColors.teal}
                            bg={planningColors.tealLight}
                            size={36}
                        />
                        <View>
                            <Text style={planningStyles.body}>
                                {pooled ? 'Contributions' : 'Member Spending'}
                            </Text>
                            <Text style={planningStyles.muted}>
                                {pooled ? 'Shared inflows by member' : 'Purchases paid by member'}
                            </Text>
                        </View>
                    </View>
                    <PlanningIcon name="chevron-right" color={planningColors.muted} />
                </Pressable>
            </TeamCard>

            <PlanningButton label="Invite Team Member" outline onPress={onInvite} />

            <TeamCard style={styles.personalCard}>
                <PlanningIcon name="shield-check" color="#315D75" size={20} />
                <Text style={styles.personalTitle}>Personal finance link</Text>
                <Text style={styles.personalText}>
                    {pooled
                        ? 'In production, contributions will be recorded as an outflow in your personal team category and a linked inflow in this team ledger. Later team spending is not counted again as your personal spend.'
                        : 'In production, your own team purchases will appear under your personal team category. Other members\u2019 purchases stay out of your personal spending.'}
                    {' '}
                    Automatic category linking is not connected yet.
                </Text>
            </TeamCard>
        </PlanningScreen>
    );
};

/** Props for a compact tool tile. */
interface ToolTileProps {
    title: string;
    subtitle?: string;
    icon: Parameters<typeof PlanningIconTile>[0]['icon'];
    color: string;
    bg: string;
    iconSize?: number;
    centered?: boolean;
    badgeCount?: number;
    badgeColor?: string;
    onPress: () => void;
}

/**
 * Render a compact tool tile.
 *
 * @param {ToolTileProps} props Component props.
 * @returns {JSX.Element} The tile.
 */
const ToolTile = ({
    title,
    subtitle,
    icon,
    color,
    bg,
    iconSize = 42,
    centered = false,
    badgeCount,
    badgeColor = planningColors.emerald,
    onPress,
}: ToolTileProps) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={[styles.toolTile, centered && styles.toolTileCentered]}
    >
        {badgeCount !== undefined ? (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
        ) : null}
        <PlanningIconTile icon={icon} color={color} bg={bg} size={iconSize} />
        <Text style={[styles.toolTitle, centered && styles.toolTitleCentered]}>{title}</Text>
        {subtitle ? (
            <Text style={[styles.toolSubtitle, centered && styles.toolSubtitleCentered]}>
                {subtitle}
            </Text>
        ) : null}
    </Pressable>
);

/** Team workspace screen styles. */
const styles = StyleSheet.create({
    tileRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    toolTile: {
        width: '48%',
        minHeight: 148,
        backgroundColor: '#FFFDF8',
        borderWidth: 1,
        borderColor: '#E7EDF3',
        borderRadius: 20,
        padding: 16,
        gap: 9,
        shadowColor: '#12213A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    toolTileCentered: {
        alignItems: 'center',
    },
    toolTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: planningColors.text,
    },
    toolTitleCentered: {
        textAlign: 'center',
    },
    toolSubtitle: {
        fontSize: 12,
        color: planningColors.muted,
    },
    toolSubtitleCentered: {
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    personalCard: {
        backgroundColor: '#EAF5F9',
    },
    personalTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#315D75',
    },
    personalText: {
        fontSize: 12,
        lineHeight: 17,
        color: '#5D798C',
    },
});

export default TeamWorkspaceScreen;
