/**
 * Neutral pending and unavailable states for feature-access checks.
 *
 * These are deliberately not upgrade prompts: a loading or unknown decision
 * must never be presented as a confirmed premium requirement.
 */

import { premiumColors } from '@/constants/premiumTheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

/** Props for the pending state. */
export interface FeatureAccessLoadingProps {
    onBack?: () => void;
}

/**
 * Render a pending state while access is being determined.
 *
 * @param {FeatureAccessLoadingProps} props Component props.
 * @returns {JSX.Element} The pending view.
 */
export const FeatureAccessLoading = ({ onBack }: FeatureAccessLoadingProps) => {
    const { t } = useTranslation('profile');
    return (
        <View style={styles.root}>
            {onBack ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Back')}
                    onPress={onBack}
                    style={styles.back}
                >
                    <Ionicons name="chevron-back" size={24} color={premiumColors.text} />
                </Pressable>
            ) : null}
            <ActivityIndicator size="large" color={premiumColors.emerald} />
            <Text style={styles.title}>{t('Checking access…')}</Text>
            <Text style={styles.body}>{t("We're confirming what is included in your plan.")}</Text>
        </View>
    );
};

/** Props for the unavailable state. */
export interface FeatureAccessUnavailableProps {
    onRetry: () => void;
    onBack?: () => void;
    reason?: string;
}

/**
 * Render an unavailable state when access could not be determined.
 *
 * This state offers retry rather than claiming the user needs to upgrade.
 *
 * @param {FeatureAccessUnavailableProps} props Component props.
 * @returns {JSX.Element} The unavailable view.
 */
export const FeatureAccessUnavailable = ({
    onRetry,
    onBack,
    reason,
}: FeatureAccessUnavailableProps) => {
    const { t } = useTranslation('profile');
    return (
        <View style={styles.root}>
            {onBack ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Back')}
                    onPress={onBack}
                    style={styles.back}
                >
                    <Ionicons name="chevron-back" size={24} color={premiumColors.text} />
                </Pressable>
            ) : null}
            <View style={styles.badge}>
                <Ionicons name="cloud-offline-outline" size={24} color={premiumColors.textSecondary} />
            </View>
            <Text style={styles.title}>{t("We couldn't check access")}</Text>
            <Text style={styles.body}>
                {reason ?? t('Please check your connection and try again.')}
            </Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Retry')}
                onPress={onRetry}
                style={styles.retry}
            >
                <Text style={styles.retryText}>{t('Try Again')}</Text>
            </Pressable>
        </View>
    );
};

/** Shared pending/unavailable styles. */
const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        gap: 14,
        backgroundColor: premiumColors.background,
    },
    back: {
        position: 'absolute',
        top: 12,
        left: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: premiumColors.surface,
        borderWidth: 1,
        borderColor: premiumColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: premiumColors.text,
        textAlign: 'center',
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        color: premiumColors.textSecondary,
        textAlign: 'center',
        maxWidth: 320,
    },
    retry: {
        backgroundColor: premiumColors.emerald,
        borderRadius: 14,
        paddingHorizontal: 22,
        paddingVertical: 13,
        marginTop: 4,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
