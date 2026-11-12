/**
 * Lightweight premium finance illustration.
 *
 * Pure React Native shapes and Ionicons glyphs keep this dependency-free and
 * visually consistent with the emerald/ivory premium gate concept.
 */

import { Ionicons } from '@expo/vector-icons';
import { premiumColors } from '@/constants/premiumTheme';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

/**
 * Render the premium dashboard illustration.
 *
 * @returns {JSX.Element} The illustration.
 */
const PremiumIllustration = () => {
    const { t } = useTranslation('profile');
    return (
        <View
            accessible
            accessibilityLabel={t('Illustration of a premium finance dashboard with a secure lock')}
            style={styles.stage}
        >
            <View style={styles.halo} />
            <View style={styles.sheet}>
                <View style={styles.header} />
                <View style={styles.caption} />
                <View style={styles.bars}>
                    {[36, 25, 45, 31, 52].map((height, index) => (
                        <View
                            key={`${height}-${index}`}
                            style={[
                                styles.bar,
                                {
                                    height,
                                    backgroundColor:
                                        index === 2 || index === 4
                                            ? premiumColors.emerald
                                            : '#8FD2AA',
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>
            <View style={styles.lock}>
                <Ionicons name="lock-closed" size={23} color="#FFFFFF" />
            </View>
            <View style={styles.check}>
                <Ionicons name="checkmark" size={21} color={premiumColors.emerald} />
            </View>
        </View>
    );
};

/** Illustration styles. */
const styles = StyleSheet.create({
    stage: {
        height: 178,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 360,
    },
    halo: {
        position: 'absolute',
        width: 165,
        height: 165,
        borderRadius: 90,
        backgroundColor: '#E0F1E6',
    },
    sheet: {
        width: 144,
        height: 116,
        borderRadius: 18,
        backgroundColor: premiumColors.surface,
        borderWidth: 1,
        borderColor: '#D1E5D9',
        padding: 15,
        shadowColor: '#174E36',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        height: 13,
        borderRadius: 8,
        backgroundColor: '#E5F2E9',
    },
    caption: {
        height: 7,
        width: 52,
        borderRadius: 4,
        backgroundColor: '#DAE6E0',
        marginTop: 10,
    },
    bars: {
        flexDirection: 'row',
        gap: 7,
        alignItems: 'flex-end',
        marginTop: 4,
        height: 53,
    },
    bar: {
        width: 15,
        borderRadius: 4,
    },
    lock: {
        position: 'absolute',
        top: 13,
        right: '23%',
        width: 47,
        height: 47,
        borderRadius: 24,
        backgroundColor: premiumColors.emeraldDark,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    check: {
        position: 'absolute',
        bottom: 21,
        left: '21%',
        width: 37,
        height: 37,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#D4E9DC',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default PremiumIllustration;
