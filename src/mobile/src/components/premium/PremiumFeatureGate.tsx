/**
 * Reusable premium feature gate.
 *
 * Presents the approved emerald/ivory/navy upgrade experience for a single
 * feature. The component is presentational and reads feature copy from the
 * centralized catalog; it never evaluates access itself and never changes a
 * user's subscription state.
 */

import { getAuditWalletPlansUrl } from '@/api/plans';
import { getFeatureDefinition } from '@/constants/featureCatalog';
import { premiumColors, premiumRadius } from '@/constants/premiumTheme';
import type { FeatureKey, GatePresentation } from '@/types/featureAccess';
import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import PremiumIllustration from './PremiumIllustration';

/** Props for the premium feature gate. */
export interface PremiumFeatureGateProps {
    feature: FeatureKey;
    /** Presentation variant; defaults to the full-screen experience. */
    presentation?: GatePresentation;
    /** Called for the secondary "Maybe Later" action. */
    onDismiss?: () => void;
    /** Optional verified HTTPS plans URL. Defaults to the configured value. */
    plansUrl?: string;
    /** Optional custom opener; when set, the CTA delegates to this callback. */
    onOpenPlans?: () => void | Promise<void>;
}

/**
 * Render the premium feature gate.
 *
 * @param {PremiumFeatureGateProps} props Component props.
 * @returns {JSX.Element} The gate.
 */
const PremiumFeatureGate = ({
    feature,
    presentation = 'full',
    onDismiss,
    plansUrl,
    onOpenPlans,
}: PremiumFeatureGateProps) => {
    const content = getFeatureDefinition(feature);
    const resolvedUrl = plansUrl ?? getAuditWalletPlansUrl();
    const hasOpener = Boolean(onOpenPlans);
    const canOpen = hasOpener || Boolean(resolvedUrl);
    const isFull = presentation === 'full';

    /**
     * Open the configured plans page or the custom opener.
     *
     * Failures are surfaced as a short alert rather than a misleading success.
     *
     * @returns {Promise<void>}
     */
    const openPlans = async (): Promise<void> => {
        if (onOpenPlans) {
            await onOpenPlans();
            return;
        }
        if (!resolvedUrl) return;

        try {
            const supported = await Linking.canOpenURL(resolvedUrl);
            if (supported) {
                await Linking.openURL(resolvedUrl);
            }
        } catch {
            Alert.alert(
                'Could not open plans',
                'Please check the plan comparison link and try again.',
            );
        }
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {isFull ? (
                    <View style={styles.header}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            onPress={onDismiss}
                            style={styles.close}
                        >
                            <Ionicons name="close" size={24} color={premiumColors.text} />
                        </Pressable>
                        <View style={styles.brand}>
                            <View style={styles.logo}>
                                <Image
                                    source={require('../../../assets/images/favicon.png')}
                                    resizeMode="contain"
                                    style={{ width: 18, height: 18 }}
                                />
                            </View>
                            <Text style={styles.brandText}>AuditWallet</Text>
                        </View>
                        <Text style={styles.pill}>PREMIUM ACCESS</Text>
                    </View>
                ) : (
                    <View style={styles.compactEyebrow}>
                        <Ionicons name="lock-closed" size={13} color={premiumColors.emerald} />
                        <Text style={styles.compactEyebrowText}>PREMIUM FEATURE</Text>
                    </View>
                )}

                <View style={[styles.body, !isFull && styles.compactBody]}>
                    {isFull ? <PremiumIllustration /> : null}

                    <View style={styles.sparkle}>
                        <Text style={styles.sparkleText}>✦  UNLOCK MORE WITH PREMIUM</Text>
                    </View>

                    <Text style={styles.title}>{content.headline}</Text>
                    <Text style={styles.description}>{content.description}</Text>

                    <View style={styles.benefits}>
                        <Text style={styles.benefitTitle}>What you&apos;ll unlock</Text>
                        {content.benefits.map((benefit) => (
                            <View key={benefit} style={styles.benefitRow}>
                                <View style={styles.tick}>
                                    <Ionicons name="checkmark" size={15} color={premiumColors.emerald} />
                                </View>
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Explore Premium Plans"
                    accessibilityHint={
                        canOpen
                            ? 'Opens the AuditWallet plan comparison page'
                            : 'Plan comparison is not configured yet'
                    }
                    disabled={!canOpen}
                    onPress={() => {
                        void openPlans();
                    }}
                    style={[styles.cta, !canOpen && styles.disabled]}
                >
                    <Text style={styles.ctaText}>Explore Premium Plans</Text>
                    <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                </Pressable>

                <Text style={styles.note}>
                    {canOpen
                        ? 'Compare plans and choose what works for you.'
                        : 'Plan comparison is not available yet.'}
                </Text>

                {onDismiss ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Maybe Later"
                        onPress={onDismiss}
                        style={styles.dismiss}
                    >
                        <Text style={styles.dismissText}>Maybe Later</Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
};

/** Premium feature gate styles. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: premiumColors.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    header: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: premiumColors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    close: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: premiumColors.emerald,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandText: {
        color: premiumColors.text,
        fontWeight: '700',
        fontSize: 16,
    },
    pill: {
        color: premiumColors.pill,
        backgroundColor: premiumColors.surface,
        fontSize: 9,
        letterSpacing: 0.5,
        overflow: 'hidden',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 18,
    },
    compactEyebrow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        backgroundColor: premiumColors.emeraldLight,
    },
    compactEyebrowText: {
        color: '#13815B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    body: {
        padding: 24,
        gap: 14,
        alignItems: 'center',
    },
    compactBody: {
        padding: 18,
        gap: 12,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: premiumColors.border,
        backgroundColor: premiumColors.background,
    },
    sparkle: {
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 18,
        backgroundColor: premiumColors.emeraldLight,
    },
    sparkleText: {
        color: '#13815B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    title: {
        fontSize: 28,
        lineHeight: 34,
        color: premiumColors.text,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 4,
    },
    description: {
        color: premiumColors.textSecondary,
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        maxWidth: 330,
    },
    benefits: {
        alignSelf: 'stretch',
        backgroundColor: premiumColors.surface,
        borderWidth: 1,
        borderColor: premiumColors.border,
        borderRadius: premiumRadius,
        padding: 18,
        gap: 14,
        marginTop: 8,
    },
    benefitTitle: {
        color: premiumColors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tick: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: premiumColors.emeraldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitText: {
        color: '#405366',
        fontSize: 13,
        flex: 1,
    },
    cta: {
        backgroundColor: premiumColors.emerald,
        borderRadius: 15,
        paddingHorizontal: 20,
        paddingVertical: 17,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    disabled: {
        opacity: premiumColors.disabledOpacity,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    note: {
        fontSize: 11,
        color: premiumColors.muted,
        textAlign: 'center',
    },
    dismiss: {
        padding: 12,
        alignItems: 'center',
    },
    dismissText: {
        fontSize: 14,
        color: '#607489',
        fontWeight: '600',
    },
});

export default PremiumFeatureGate;
