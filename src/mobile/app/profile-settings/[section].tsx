/**
 * Dynamic route for the eight Profile V2 settings destinations.
 *
 * The route stays thin: it validates the incoming `section` parameter and
 * delegates rendering to `ProfileSettings`, which owns the shared header,
 * back navigation, and per-section content.
 */

import ProfileSettings, { type ProfileSection } from '@/components/profile/ProfileSettings';
import { profileTheme as t } from '@/constants/profileTheme';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

/** Sections reachable from the Profile home menu. */
const ALLOWED_SECTIONS: readonly ProfileSection[] = [
    'personal',
    'security',
    'linked',
    'notifications',
    'preferences',
    'categories',
    'export',
    'account',
];

/**
 * Render the settings destination named by the `section` route parameter.
 *
 * @returns {JSX.Element} The settings screen or a not-found fallback.
 */
const ProfileSettingsRoute = () => {
    const { section } = useLocalSearchParams<{ section: string }>();

    if (!section || !ALLOWED_SECTIONS.includes(section as ProfileSection)) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: t.background }}>
                <Text style={{ color: t.text, fontSize: 15 }}>Settings page not found.</Text>
            </View>
        );
    }

    return <ProfileSettings section={section as ProfileSection} />;
};

export default ProfileSettingsRoute;
