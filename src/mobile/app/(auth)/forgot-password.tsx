import { forgotPassword } from '@/api/auth';
import { normalizeApiError } from '@/api/errors';
import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { usePasswordRecovery } from '@/hooks/usePasswordRecovery';
import { isValidEmail } from '@/utils/authValidation';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/**
 * Password-reset entry screen: collect the account email and request a reset
 * code through the real backend endpoint. Only email delivery is supported.
 */
const ForgotPasswordScreen = () => {
  const { t } = useTranslation('auth');
  const { beginRecovery } = usePasswordRecovery();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Validate the email, request a reset code, and advance to the OTP screen.
   *
   * The backend returns the same success shape for known and unknown emails,
   * so the screen never differentiates them.
   *
   * @returns {Promise<void>}
   */
  const handleSendCode = async () => {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('Email is required'));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError(t('Enter a valid email address'));
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimmed);
      beginRecovery(trimmed);
      router.push('/reset-code');
    } catch (cause) {
      setError(normalizeApiError(cause).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('Forgot password?')}
        </Text>
        <Text style={styles.subtitle}>
          {t("Enter your email and we'll send a reset code")}
        </Text>

        <Text style={styles.label}>{t('Email')}</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError('');
          }}
          placeholder={t('you@example.com')}
          placeholderTextColor="#889A92"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel={t('Email')}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleSendCode}
        />

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSendCode}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('Send reset code')}
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
            <Text style={styles.buttonText}>{t('Send reset code')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
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
    marginTop: 0,
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
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '700',
    color: '#233D34',
    marginBottom: 9,
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
  inputError: {
    borderColor: '#D64C4C',
  },
  errorText: {
    alignSelf: 'stretch',
    color: '#B93B3B',
    fontSize: 13,
    marginTop: 10,
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
  backLink: {
    marginTop: 18,
  },
  linkText: {
    color: '#168D64',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
