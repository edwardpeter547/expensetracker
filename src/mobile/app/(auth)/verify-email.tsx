import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

/**
 * Email-verification step shown after registration.
 *
 * UI-only: the entered code is checked locally and then the user is returned
 * to sign in. Backend verification is not wired yet.
 */
const VerifyEmailScreen = () => {
    const { t } = useTranslation('auth');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    /**
     * Validate the local code and return to the sign-in screen.
     */
    const handleVerify = () => {
        setError('');
        if (code.trim().length === 0) {
            setError(t('Enter the verification code'));
            return;
        }
        router.replace('/login');
    };

    return (
        <CenteredAuthScreen>
            <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                    {t('Verify your email')}
                </Text>
                <Text style={styles.subtitle}>
                    {t('We sent a verification code to your email address')}
                </Text>

                <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={(value) => {
                        setCode(value.replace(/\D/g, '').slice(0, 6));
                        setError('');
                    }}
                    placeholder={t('Verification code')}
                    placeholderTextColor="#889A92"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    accessibilityLabel={t('Verification code')}
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                />

                {error ? (
                    <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                        {error}
                    </Text>
                ) : null}

                <Pressable
                    onPress={handleVerify}
                    accessibilityRole="button"
                    accessibilityLabel={t('Verify email')}
                    style={({ pressed }) => [
                        styles.button,
                        pressed && styles.buttonPressed,
                    ]}
                >
                    <Text style={styles.buttonText}>{t('Verify email')}</Text>
                </Pressable>

                <Pressable
                    onPress={() => setCode('')}
                    accessibilityRole="button"
                    accessibilityLabel={t('Resend verification code')}
                    hitSlop={8}
                    style={styles.resendLink}
                >
                    <Text style={styles.linkText}>{t('Resend verification code')}</Text>
                </Pressable>

                <Pressable
                    onPress={() => router.replace('/login')}
                    accessibilityRole="button"
                    accessibilityLabel={t('Back to sign in')}
                    hitSlop={8}
                    style={styles.backLink}
                >
                    <Text style={styles.linkText}>{t('Back to sign in')}</Text>
                </Pressable>
            </View>
        </CenteredAuthScreen>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#FAFBF9',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E0EAE5',
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.7,
        color: '#15372F',
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 6,
        marginBottom: 22,
        fontSize: 15,
        lineHeight: 21,
        color: '#74877F',
        textAlign: 'center',
    },
    input: {
        alignSelf: 'stretch',
        minHeight: 53,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D7E2DC',
        backgroundColor: '#FFFFFF',
        color: '#233D34',
        fontSize: 16,
        paddingHorizontal: 14,
    },
    errorText: {
        color: '#B93B3B',
        fontSize: 13,
        marginTop: 6,
        alignSelf: 'stretch',
    },
    button: {
        alignSelf: 'stretch',
        minHeight: 54,
        borderRadius: 12,
        backgroundColor: '#1B9568',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
    },
    buttonPressed: {
        opacity: 0.9,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
    },
    resendLink: {
        marginTop: 18,
    },
    backLink: {
        marginTop: 12,
    },
    linkText: {
        color: '#168D64',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default VerifyEmailScreen;
