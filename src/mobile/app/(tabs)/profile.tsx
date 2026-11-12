/**
 * Profile tab: the approved Profile V2 landing screen.
 *
 * Keeps the tab thin by deriving an identity from the authenticated user (or
 * a clearly-labelled demo identity in demo mode) and delegating rendering,
 * navigation, and sign-out wiring to `ProfileHome`.
 */

import { getAccessToken } from '@/api/client';
import ProfileHome, { type ProfileIdentity } from '@/components/profile/ProfileHome';
import { isDemoMode } from '@/contracts';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import type { UserProfile } from '@/types/profile';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';

/** Demo identity shown only when demo mode is on and no user is signed in. */
const DEMO_IDENTITY: ProfileIdentity = {
    displayName: 'Demo Account',
    email: 'demo@expensetracker.app',
    username: 'demo',
    firstname: 'Demo',
    lastname: 'Account',
};

/**
 * Derive a presentation-ready identity from an authenticated profile.
 *
 * @param {UserProfile|null} user The authenticated user, when present.
 * @returns {ProfileIdentity} The display identity.
 */
const identityFromUser = (user: UserProfile | null): ProfileIdentity => {
    if (!user) {
        return {
            displayName: '',
            email: '',
            username: '',
            firstname: '',
            lastname: '',
        };
    }

    const displayName =
        user.displayName
        || [user.firstname, user.lastname].filter(Boolean).join(' ')
        || user.username
        || user.email;

    return {
        displayName: displayName || '',
        email: user.email,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.avatar,
    };
};

/**
 * Render the Profile tab.
 *
 * @returns {JSX.Element} The profile screen.
 */
const ProfileScreen = () => {
    const { t: tt } = useTranslation('profile');
    const { t: tc } = useTranslation('common');
    const { user, isLoading, logout, refreshProfile } = useAuth();
    const { membership } = useMembership();
    const accessToken = getAccessToken();
    const firstFocus = useRef(true);

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
                return;
            }
            void refreshProfile().catch(() => undefined);
        }, [refreshProfile]),
    );

    const identity = useMemo(
        () => (isDemoMode && !user ? DEMO_IDENTITY : identityFromUser(user)),
        [user],
    );

    /**
     * Ask for confirmation before signing out, because signing out also
     * clears the biometric login credential.
     *
     * @returns {void}
     */
    const confirmSignOut = () => {
        Alert.alert(
            tt('Sign Out'),
            tt('You will need your password to sign back in, and biometric sign-in will need to be enabled again.'),
            [
                { text: tc('Cancel'), style: 'cancel' },
                {
                    text: tt('Sign Out'),
                    style: 'destructive',
                    onPress: () => {
                        void logout().finally(() => {
                            router.replace('/welcome');
                        });
                    },
                },
            ],
        );
    };

    return (
        <ProfileHome
            identity={identity}
            membership={membership}
            loading={isLoading}
            accessToken={accessToken}
            onNavigate={(section) => {
                if (section === 'membership') {
                    router.push('/membership');
                    return;
                }
                router.push({
                    pathname: '/profile-settings/[section]' as never,
                    params: { section },
                });
            }}
            onSignOut={confirmSignOut}
        />
    );
};

export default ProfileScreen;
