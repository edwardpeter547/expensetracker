/**
 * Membership additions inserted into the existing Profile V2 surface.
 *
 * `MembershipHeaderBadge` is rendered beneath the profile identity in the
 * navy header, and `MembershipTierChip` is the trailing tier indicator for
 * the "Membership & Billing" menu row. The menu row itself continues to use
 * the existing Profile V2 `SettingsRow` component.
 */

import { Ionicons } from '@expo/vector-icons';
import type { MembershipSummary } from '@/types/membership';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Render the compact membership tier badge for the profile header.
 *
 * A missing membership renders a neutral "Membership unavailable" state
 * rather than assuming a Free tier.
 *
 * @param {object} props Component props.
 * @param {MembershipSummary|null} props.membership The resolved membership.
 * @returns {JSX.Element} The header badge.
 */
export const MembershipHeaderBadge = ({
    membership,
}: {
    membership: MembershipSummary | null;
}) => {
    const { t } = useTranslation('profile');
    const label = membership?.displayName ?? t('Membership unavailable');
    const premium = membership != null && membership.tier !== 'free';

    return (
        <View
            accessibilityLabel={t('Membership: {{label}}', { label })}
            style={[styles.badge, premium && styles.badgePremium]}
        >
            <Ionicons
                name={premium ? 'diamond-outline' : 'person-outline'}
                size={13}
                color={premium ? '#BDF0D7' : '#D1DCE6'}
            />
            <Text style={[styles.badgeText, premium && styles.badgeTextPremium]}>
                {label}
            </Text>
        </View>
    );
};

/** Membership addition styles. */
const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF20',
        borderRadius: 30,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 9,
    },
    badgePremium: { backgroundColor: '#1B956830' },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#D1DCE6' },
    badgeTextPremium: { color: '#BDF0D7' },
});
