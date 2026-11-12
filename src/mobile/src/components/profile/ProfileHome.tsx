/**
 * Profile V2 landing screen.
 *
 * Renders the premium navy gradient header, the user's identity and avatar,
 * the three grouped settings menus, and a clearly styled sign-out action. The
 * screen is presentational: navigation, authentication, and data loading are
 * supplied by the owning route so the component stays easy to test.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { profileTheme as t } from '@/constants/profileTheme';
import type { ProfileAvatar as ProfileAvatarDto } from '@/types/profile';
import type { MembershipSummary } from '@/types/membership';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ProfileAvatar,
    SettingsRow,
    type ProfileIconName,
} from './ProfilePrimitives';
import {
    MembershipHeaderBadge,
} from './MembershipProfileAdditions';

/** One settings menu entry rendered inside a group. */
export interface ProfileMenuItem {
    id: string;
    title: string;
    subtitle: string;
    icon: ProfileIconName;
}

/** One labelled settings group. */
export interface ProfileMenuGroup {
    label: string;
    items: ProfileMenuItem[];
}

/** Identity fields needed to render the profile header. */
export interface ProfileIdentity {
    displayName: string;
    email: string;
    username?: string;
    firstname?: string | null;
    lastname?: string | null;
    avatar?: ProfileAvatarDto | string | null;
}

/** Props for the profile landing component. */
export interface ProfileHomeProps {
    identity: ProfileIdentity | null;
    membership: MembershipSummary | null;
    loading: boolean;
    accessToken?: string | null;
    onNavigate: (section: string) => void;
    onSignOut: () => void;
}

/** Approved settings groups in reading order. */
const GROUPS: ProfileMenuGroup[] = [
    {
        label: 'YOUR ACCOUNT',
        items: [
            { id: 'personal', title: 'Personal Information', subtitle: 'Your details and profile', icon: 'person-outline' },
            { id: 'security', title: 'Security', subtitle: 'Password and account protection', icon: 'shield-checkmark-outline' },
            { id: 'linked', title: 'Linked Accounts', subtitle: 'Connected financial services', icon: 'card-outline' },
            { id: 'membership', title: 'Membership & Billing', subtitle: 'Your plan, benefits and subscription', icon: 'diamond-outline' },
        ],
    },
    {
        label: 'PREFERENCES & TOOLS',
        items: [
            { id: 'notifications', title: 'Notifications', subtitle: 'Alerts and financial reminders', icon: 'notifications-outline' },
            { id: 'preferences', title: 'App Preferences', subtitle: 'Appearance, currency and language', icon: 'options-outline' },
            { id: 'categories', title: 'Categories', subtitle: 'Organize income and expenses', icon: 'grid-outline' },
            { id: 'export', title: 'Data Export', subtitle: 'Download your financial records', icon: 'download-outline' },
        ],
    },
    {
        label: 'ACCOUNT CONTROL',
        items: [
            { id: 'account', title: 'Account Management', subtitle: 'Privacy and account options', icon: 'settings-outline' },
        ],
    },
];

/**
 * Render the Profile V2 landing screen.
 *
 * @param {ProfileHomeProps} props Component props.
 * @returns {JSX.Element} The profile screen.
 */
const ProfileHome = ({
    identity,
    membership,
    loading,
    accessToken,
    onNavigate,
    onSignOut,
}: ProfileHomeProps) => {
    const { t: tt } = useTranslation('profile');
    const insets = useSafeAreaInsets();
    const name = identity?.displayName || tt('Your Profile');
    const email = identity?.email || tt('Account details from your session');

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={t.green} />
            </View>
        );
    }

    return (
        <View style={[styles.page, { marginTop: -insets.top }]}>
            <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
                <LinearGradient
                    colors={[t.navyLight, t.navy, t.navyDeep]}
                    style={[styles.hero, { paddingTop: insets.top + 29 }]}
                >
                    <Text style={styles.eyebrow}>{tt('MY ACCOUNT')}</Text>
                    <View style={styles.identity}>
                        <ProfileAvatar
                            avatar={identity?.avatar}
                            firstname={identity?.firstname}
                            lastname={identity?.lastname}
                            accessToken={accessToken}
                        />
                        <View style={styles.identityCopy}>
                            <Text style={styles.name}>{name}</Text>
                            <Text style={styles.email}>{email}</Text>
                            <MembershipHeaderBadge membership={membership} />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={tt('Edit Profile')}
                                onPress={() => onNavigate('personal')}
                                style={styles.edit}
                            >
                                <Ionicons name="pencil-outline" color="white" size={14} />
                                <Text style={styles.editText}>{tt('Edit Profile')}</Text>
                            </Pressable>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {GROUPS.map((group) => (
                        <View key={group.label}>
                            <Text style={styles.groupLabel}>{tt(group.label)}</Text>
                            <View style={styles.group}>
                                {group.items.map((item, index) => (
                                    <SettingsRow
                                        key={item.id}
                                        title={tt(item.title)}
                                        subtitle={tt(item.subtitle)}
                                        icon={item.icon}
                                        onPress={() => onNavigate(item.id)}
                                        last={index === group.items.length - 1}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tt('Sign Out')}
                        onPress={onSignOut}
                        style={styles.signout}
                    >
                        <Ionicons name="log-out-outline" color={t.danger} size={21} />
                        <Text style={styles.signoutText}>{tt('Sign Out')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
};

/** Profile landing styles. */
const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: t.background },
    scroll: { paddingBottom: 35 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.background },
    hero: { paddingHorizontal: 22, paddingTop: 29, paddingBottom: 29 },
    eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: '#A8C8C6' },
    identity: { flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 24 },
    identityCopy: { flex: 1, minWidth: 0 },
    name: { color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
    email: { color: '#C2D0DD', fontSize: 14, marginTop: 6 },
    edit: {
        flexDirection: 'row',
        gap: 6,
        alignSelf: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#FFFFFF22',
        borderWidth: 1,
        borderColor: '#FFFFFF33',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9,
        marginTop: 11,
    },
    editText: { color: 'white', fontSize: 14, fontWeight: '700' },
    content: { paddingHorizontal: 18, paddingTop: 5 },
    groupLabel: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: t.muted,
        marginTop: 23,
        marginBottom: 10,
        marginHorizontal: 3,
    },
    group: {
        backgroundColor: 'white',
        borderRadius: 17,
        borderWidth: 1,
        borderColor: t.border,
        paddingHorizontal: 14,
        overflow: 'hidden',
    },
    signout: {
        flexDirection: 'row',
        gap: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        padding: 16,
        backgroundColor: '#FFF2F2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FFD8DD',
    },
    signoutText: { color: t.danger, fontSize: 16, fontWeight: '800' },
});

export default ProfileHome;
