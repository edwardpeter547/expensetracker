import { resendVerificationEmail, verifyEmail } from '@/api/auth';
import { normalizeApiError } from '@/api/errors';
import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Email-verification step shown after registration.
 *
 * The six-digit code is entered in six individual boxes with decorative dash
 * separators. Focus advances automatically, backspace moves back through the
 * boxes, pasting a complete code fills every box, and the code is submitted
 * to the real backend. No demo or simulated verification path exists.
 */
const VerifyEmailScreen = () => {
    const params = useLocalSearchParams<{ email?: string | string[] }>();
    const { t } = useTranslation('auth');
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const email = Array.isArray(params.email) ? (params.email[0] ?? '') : (params.email ?? '');

    useEffect(() => {
        if (resendIn <= 0) {
            return;
        }
        const timer = setInterval(() => {
            setResendIn((current) => (current > 1 ? current - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendIn]);

    /**
     * Submit a fully entered code to the backend and return to sign in.
     *
     * On a rejected code the boxes are cleared and focus returns to the first
     * box; on a network or timeout failure the digits are retained so the user
     * can retry without re-entering them.
     *
     * @param {string} entered The six-digit code to verify.
     * @returns {Promise<void>}
     */
    const submitCode = async (entered: string) => {
        if (loading) {
            return;
        }
        setError('');
        if (!email) {
            setError(t('Email address is missing'));
            return;
        }
        if (entered.length !== CODE_LENGTH) {
            setError(t('Enter all 6 digits'));
            return;
        }
        setLoading(true);
        try {
            await verifyEmail(email, entered);
            router.replace('/login');
        } catch (cause) {
            const normalized = normalizeApiError(cause);
            setError(normalized.message);
            if (normalized.kind === 'validation') {
                setDigits(Array(CODE_LENGTH).fill(''));
                inputRefs.current[0]?.focus?.();
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Update one box from user input, distributing a pasted multi-digit value
     * across the remaining boxes and advancing focus or submitting when full.
     *
     * @param {number} index The box being edited.
     * @param {string} value The raw input value.
     */
    const handleDigitChange = (index: number, value: string) => {
        const numeric = value.replace(/\D/g, '');

        if (numeric.length === 0) {
            setDigits((current) => {
                const next = [...current];
                next[index] = '';
                return next;
            });
            return;
        }

        const next = [...digits];
        const characters = numeric.split('');
        for (let offset = 0; offset < characters.length && index + offset < CODE_LENGTH; offset += 1) {
            next[index + offset] = characters[offset];
        }

        setDigits(next);
        setError('');

        if (next.every((digit) => digit !== '')) {
            void submitCode(next.join(''));
            return;
        }

        inputRefs.current[Math.min(index + characters.length, CODE_LENGTH - 1)]?.focus?.();
    };

    /**
     * Move focus back and clear the previous box when backspace is pressed on
     * an empty box.
     *
     * @param {number} index The box receiving the key press.
     * @param {string} key The pressed key.
     */
    const handleDigitKeyPress = (index: number, key: string) => {
        if (key !== 'Backspace' || digits[index] || index === 0) {
            return;
        }
        setDigits((current) => {
            const next = [...current];
            next[index - 1] = '';
            return next;
        });
        inputRefs.current[index - 1]?.focus?.();
    };

    /**
     * Request a fresh code and start the client-side resend cooldown.
     *
     * @returns {Promise<void>}
     */
    const handleResend = async () => {
        if (resendLoading || resendIn > 0) {
            return;
        }
        setError('');
        if (!email) {
            setError(t('Email address is missing'));
            return;
        }
        setResendLoading(true);
        try {
            await resendVerificationEmail(email);
            setResendIn(RESEND_COOLDOWN_SECONDS);
        } catch (cause) {
            setError(normalizeApiError(cause).message);
        } finally {
            setResendLoading(false);
        }
    };

    const resendLabel =
        resendIn > 0 ? t('Resend code in {{time}}', {time: resendIn}) : t('Resend verification code');

    return (
        <CenteredAuthScreen>
            <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                    {t('Verify your email')}
                </Text>
                <Text style={styles.subtitle}>
                    {t('We sent a verification code to your email address')}
                </Text>

                <View style={styles.codeRow}>
                    {digits.map((digit, index) => (
                        <Fragment key={`digit-${index}`}>
                            {index > 0 ? (
                                <Text
                                    accessible={false}
                                    importantForAccessibility="no"
                                    style={styles.dash}
                                >
                                    -
                                </Text>
                            ) : null}
                            <TextInput
                                ref={(element) => {
                                    inputRefs.current[index] = element;
                                }}
                                style={[styles.digitBox, error ? styles.digitBoxError : null]}
                                value={digit}
                                onChangeText={(value) => handleDigitChange(index, value)}
                                onKeyPress={({ nativeEvent }) =>
                                    handleDigitKeyPress(index, nativeEvent.key)
                                }
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="oneTimeCode"
                                autoComplete="one-time-code"
                                selectTextOnFocus
                                editable={!loading}
                                autoFocus={index === 0}
                                maxLength={CODE_LENGTH}
                                accessibilityLabel={t('Digit {{index}}', {index: index + 1})}
                                returnKeyType={index === CODE_LENGTH - 1 ? 'done' : 'next'}
                                onSubmitEditing={() => {
                                    if (index < CODE_LENGTH - 1) {
                                        inputRefs.current[index + 1]?.focus?.();
                                    } else {
                                        void submitCode(digits.join(''));
                                    }
                                }}
                            />
                        </Fragment>
                    ))}
                </View>

                {error ? (
                    <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                        {error}
                    </Text>
                ) : null}

                <Pressable
                    onPress={() => void submitCode(digits.join(''))}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={t('Verify email')}
                    accessibilityState={{ disabled: loading, busy: loading }}
                    style={({ pressed }) => [
                        styles.button,
                        pressed && !loading && styles.buttonPressed,
                        loading && styles.buttonDisabled,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>{t('Verify email')}</Text>
                    )}
                </Pressable>

                <Pressable
                    onPress={handleResend}
                    disabled={resendLoading || resendIn > 0}
                    accessibilityRole="button"
                    accessibilityLabel={resendLabel}
                    accessibilityState={{ disabled: resendLoading || resendIn > 0 }}
                    hitSlop={8}
                    style={styles.resendLink}
                >
                    <Text
                        style={[
                            styles.linkText,
                            (resendLoading || resendIn > 0) && styles.linkTextDisabled,
                        ]}
                    >
                        {resendLabel}
                    </Text>
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
    codeRow: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    digitBox: {
        flex: 1,
        minWidth: 0,
        height: 58,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D7E2DC',
        backgroundColor: '#FFFFFF',
        color: '#15372F',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        padding: 0,
    },
    digitBoxError: {
        borderColor: '#D64C4C',
    },
    dash: {
        color: '#9AAFA7',
        fontSize: 22,
        fontWeight: '700',
        paddingHorizontal: 2,
    },
    errorText: {
        color: '#B93B3B',
        fontSize: 13,
        marginTop: 10,
        alignSelf: 'stretch',
        textAlign: 'center',
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
    buttonDisabled: {
        opacity: 0.65,
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
    linkTextDisabled: {
        opacity: 0.55,
    },
});

export default VerifyEmailScreen;
