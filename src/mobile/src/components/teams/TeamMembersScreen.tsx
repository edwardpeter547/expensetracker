/**
 * Team Members screen.
 *
 * Lists members with roles and shows pending invitations. Invitations are
 * demo-only and never sent; the screen labels that explicitly.
 */

import {
    PlanningButton,
    PlanningIcon,
    PlanningScreen,
    planningStyles,
} from '@/components/planning/PlanningUI';
import { planningColors } from '@/components/planning/planningTheme';
import { ModeBadge, TeamCard, TeamSectionHeading } from '@/components/teams/teamsPrimitives';
import type { Team, TeamInvitation, TeamMember } from '@/types/team';
import { StyleSheet, Text, View } from 'react-native';

/** Props for the Team Members screen. */
export interface TeamMembersScreenProps {
    team: Team;
    members: TeamMember[];
    invitations: TeamInvitation[];
    onBack: () => void;
    onInvite: () => void;
}

/**
 * Render the Team Members screen.
 *
 * @param {TeamMembersScreenProps} props Component props.
 * @returns {JSX.Element} The members screen.
 */
const TeamMembersScreen = ({
    team,
    members,
    invitations,
    onBack,
    onInvite,
}: TeamMembersScreenProps) => (
    <PlanningScreen title="Team Members" subtitle="People and roles" onBack={onBack}>
        <TeamCard>
            <View style={[planningStyles.row, { justifyContent: 'space-between' }]}>
                <Text style={planningStyles.body}>Members</Text>
                <ModeBadge mode={team.mode} />
            </View>
            <Text style={planningStyles.muted}>{members.length} members</Text>
            {members.map((member) => (
                <View key={member.id} style={[planningStyles.row, { gap: 12 }]}>
                    <PlanningIcon name="person" color={planningColors.blue} size={28} />
                    <View style={{ flex: 1 }}>
                        <Text style={planningStyles.body}>{member.name}</Text>
                        <Text style={planningStyles.muted}>{member.role}</Text>
                    </View>
                    <RoleBadge role={member.role} />
                </View>
            ))}
        </TeamCard>

        <PlanningButton label="Invite Member" onPress={onInvite} />

        <TeamSectionHeading title="Pending Invitations" subtitle="Demo only — nothing has been delivered" />
        {invitations.length === 0 ? (
            <TeamCard>
                <Text style={planningStyles.body}>No pending invitations.</Text>
            </TeamCard>
        ) : (
            invitations.map((invitation) => (
                <TeamCard key={invitation.id}>
                    <View style={[planningStyles.row, { gap: 12 }]}>
                        <PlanningIcon name="mail" color={planningColors.muted} size={22} />
                        <View style={{ flex: 1 }}>
                            <Text style={planningStyles.body}>{invitation.contact}</Text>
                            <Text style={planningStyles.muted}>
                                {invitation.method} · {invitation.role}
                            </Text>
                        </View>
                        <Text style={styles.pending}>Pending</Text>
                    </View>
                </TeamCard>
            ))
        )}

        <Text style={styles.note}>
            Production invitations will be validated server-side and will never reveal whether a
            phone number or email already has an account.
        </Text>
    </PlanningScreen>
);

/** Props for the role badge. */
interface RoleBadgeProps {
    role: TeamMember['role'];
}

/**
 * Render a member role badge.
 *
 * @param {RoleBadgeProps} props Component props.
 * @returns {JSX.Element} The badge.
 */
const RoleBadge = ({ role }: RoleBadgeProps) => {
    const owner = role === 'Owner';
    return (
        <View style={[styles.roleBadge, { backgroundColor: owner ? planningColors.emeraldLight : '#F0F3F8' }]}>
            <Text style={[styles.roleText, { color: owner ? planningColors.emerald : planningColors.muted }]}>
                {role}
            </Text>
        </View>
    );
};

/** Team Members screen styles. */
const styles = StyleSheet.create({
    pending: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A96E26',
    },
    roleBadge: {
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '800',
    },
    note: {
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 17,
        color: planningColors.muted,
    },
});

export default TeamMembersScreen;
