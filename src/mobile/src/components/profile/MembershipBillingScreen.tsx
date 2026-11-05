/**
 * Membership & Billing dedicated screen.
 *
 * Presents the current membership tier, included benefits, and subscription
 * details when available. Plan comparison is an external link to the product
 * website rather than an in-app plan list; until the website is live the
 * action is clearly non-functional.
 */

import { getAuditWalletPlansUrl } from '@/api/plans';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { profileTheme as t } from '@/constants/profileTheme';
import type { MembershipSummary } from '@/types/membership';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Props for the Membership & Billing screen. */
export interface MembershipBillingScreenProps {
    membership: MembershipSummary | null;
    onBack: () => void;
    onManageSubscription?: () => void;
    loading?: boolean;
    error?: string | null;
}

/**
 * Render one subscription detail row.
 *
 * @param {object} props Row props.
 * @param {string} props.label The row label.
 * @param {string} props.value The row value.
 * @returns {JSX.Element} The detail row.
 */
const Info = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.info}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

/**
 * Render the Membership & Billing screen.
 *
 * @param {MembershipBillingScreenProps} props Component props.
 * @returns {JSX.Element} The membership screen.
 */
const MembershipBillingScreen = ({
    membership,
    onBack,
    onManageSubscription,
    loading = false,
    error,
}: MembershipBillingScreenProps) => {
    const insets = useSafeAreaInsets();
    const plansUrl = getAuditWalletPlansUrl();
    const isFree = membership?.tier === 'free';
    const isPaid = membership != null && !isFree;
    const planName = loading ? 'Loading…' : membership?.displayName ?? 'Unavailable';

    /**
     * Open the product website for plan comparison, or explain that the
     * website is not available yet.
     *
     * @returns {void}
     */
    const openComparePlans = () => {
        if (plansUrl) {
            void Linking.openURL(plansUrl);
            return;
        }
        Alert.alert(
            'Not available yet',
            'Plan comparison will be available on the product website soon.',
        );
    };

    return (
        <View style={[styles.root, { marginTop: -insets.top }]}>
            <LinearGradient
                colors={[t.navyLight, t.navyDeep]}
                style={[styles.header, { paddingTop: insets.top + 14 }]}
            >
                <View style={styles.nav}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Back to Profile"
                        onPress={onBack}
                        style={styles.back}
                    >
                        <Ionicons name="chevron-back" color="white" size={22} />
                    </Pressable>
                    <Text style={styles.heading}>Membership & Billing</Text>
                </View>

                <View style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <View style={styles.heroCopy}>
                            <Text style={styles.eyebrow}>YOUR CURRENT PLAN</Text>
                            <Text style={styles.plan}>{planName}</Text>
                        </View>
                        <View style={styles.crown}>
                            <Ionicons name="diamond-outline" size={24} color="#FFFFFF" />
                        </View>
                    </View>
                    {membership?.priceLabel ? (
                        <Text style={styles.price}>
                            {membership.priceLabel}
                            {membership.billingCycleLabel ? (
                                <Text style={styles.cycle}> / {membership.billingCycleLabel}</Text>
                            ) : null}
                        </Text>
                    ) : (
                        <Text style={styles.heroDescription}>
                            {isFree
                                ? 'Your personal finance essentials'
                                : 'View your membership information'}
                        </Text>
                    )}
                    {membership?.status && membership.status !== 'unknown' ? (
                        <Text style={styles.heroDescription}>
                            Subscription status: {membership.status.replace('_', ' ')}
                        </Text>
                    ) : null}
                </View>
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {error ? (
                    <View style={styles.error}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Included in your plan</Text>
                    {membership?.benefits?.length ? (
                        membership.benefits.map((benefit, index) => (
                            <View key={`${index}-${benefit}`} style={styles.benefit}>
                                <Ionicons name="checkmark-circle" size={20} color={t.green} />
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.muted}>Plan benefits are not available yet.</Text>
                    )}
                </View>

                {isPaid ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Subscription</Text>
                        {membership?.status ? (
                            <Info
                                label="Status"
                                value={membership.status.replace('_', ' ')}
                            />
                        ) : null}
                        {membership?.billingCycleLabel ? (
                            <Info label="Billing cycle" value={membership.billingCycleLabel} />
                        ) : null}
                        {membership?.renewalDateLabel ? (
                            <Info label="Next billing / renewal" value={membership.renewalDateLabel} />
                        ) : null}
                        {membership?.billingProviderLabel ? (
                            <Info label="Billing provider" value={membership.billingProviderLabel} />
                        ) : null}
                        {onManageSubscription ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Manage Subscription"
                                onPress={onManageSubscription}
                                style={styles.outline}
                            >
                                <Text style={styles.outlineText}>Manage Subscription</Text>
                            </Pressable>
                        ) : (
                            <Text style={styles.muted}>
                                Subscription management is not yet available here.
                            </Text>
                        )}
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {isFree ? 'Explore Premium' : 'Explore Membership Plans'}
                    </Text>
                    <Text style={styles.muted}>
                        Compare membership plans and benefits on our website.
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Compare Plans"
                        onPress={openComparePlans}
                        style={styles.primary}
                    >
                        <Text style={styles.primaryText}>Compare Plans</Text>
                    </Pressable>
                    {!plansUrl ? (
                        <Text style={[styles.muted, styles.planUnavailable]}>
                            The product website isn&apos;t available yet.
                        </Text>
                    ) : null}
                </View>
            </ScrollView>
        </View>
    );
};

/** Membership & Billing styles. */
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: t.background },
    header: { paddingHorizontal: 20, paddingBottom: 26 },
    nav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    back: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFFFFF20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heading: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    heroCard: { backgroundColor: '#1B3045', padding: 20, borderRadius: 18 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroCopy: { flex: 1, minWidth: 0 },
    eyebrow: { fontSize: 12, letterSpacing: 1.2, fontWeight: '800', color: '#C5D1DE' },
    plan: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', marginTop: 7, letterSpacing: -0.7 },
    crown: {
        backgroundColor: t.green,
        width: 49,
        height: 49,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    price: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 18 },
    cycle: { fontSize: 14, fontWeight: '400', color: '#C5D1DE' },
    heroDescription: { color: '#C5D1DE', fontSize: 14, marginTop: 14 },
    scroll: { flex: 1 },
    content: { padding: 17, paddingBottom: 40 },
    card: {
        backgroundColor: '#FFFFFF',
        borderColor: t.border,
        borderWidth: 1,
        borderRadius: 17,
        padding: 18,
        marginBottom: 14,
    },
    cardTitle: { color: t.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 13 },
    benefit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
    benefitText: { fontSize: 15, color: t.text, flex: 1, lineHeight: 21 },
    muted: { fontSize: 14, color: t.secondary, lineHeight: 20 },
    info: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderBottomColor: '#EDF1F5',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    infoLabel: { color: t.secondary, fontSize: 14 },
    infoValue: {
        color: t.text,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'capitalize',
        textAlign: 'right',
    },
    primary: {
        backgroundColor: t.green,
        padding: 15,
        alignItems: 'center',
        borderRadius: 12,
        marginTop: 15,
    },
    primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    outline: {
        borderWidth: 1,
        borderColor: '#CDE8DD',
        borderRadius: 12,
        padding: 13,
        alignItems: 'center',
        marginTop: 16,
    },
    outlineText: { color: t.green, fontSize: 15, fontWeight: '700' },
    planUnavailable: { marginTop: 12 },
    error: { backgroundColor: '#FFF2F2', padding: 12, borderRadius: 10, marginBottom: 14 },
    errorText: { color: '#B72B39', fontSize: 14 },
});

export default MembershipBillingScreen;
