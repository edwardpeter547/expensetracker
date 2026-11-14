import { resetPassword } from '@/api/auth';
import { normalizeApiError } from '@/api/errors';
import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { usePasswordRecovery } from '@/hooks/usePasswordRecovery';
import {
  getPasswordRequirements,
  getPasswordStrength,
  isPasswordStrong,
  PASSWORD_MAX_LENGTH,
} from '@/utils/authValidation';
import { Ionicons } from '@expo/vector-icons';
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
 * Centered screen for choosing a new password after OTP verification.
 *
 * Submits the verified reset code and new password to the real backend, clears
 * the in-memory recovery state on success, and returns the user to sign in.
 */
const ResetPasswordScreen = () => {
  const { t } = useTranslation('auth');
  const { email, verifiedCode, clearRecovery } = usePasswordRecovery();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const contextMissing = !email || !verifiedCode;

  const passwordRules = getPasswordRequirements(password);
  const strength = getPasswordStrength(password);
  const strengthColor =
    strength.score <= 1
      ? '#D64C4C'
      : strength.score === 2
        ? '#E0A23C'
        : strength.score === 3
          ? '#42A85F'
          : '#1B9568';

  const requirements = [
    { id: 'length', label: t('At least 8 characters'), satisfied: passwordRules.length },
    { id: 'uppercase', label: t('One uppercase letter'), satisfied: passwordRules.uppercase },
    { id: 'lowercase', label: t('One lowercase letter'), satisfied: passwordRules.lowercase },
    { id: 'number', label: t('One number'), satisfied: passwordRules.number },
    { id: 'special', label: t('One special character'), satisfied: passwordRules.special },
  ];

  const strengthLabels: Record<'Weak' | 'Fair' | 'Good' | 'Strong', string> = {
    Weak: t('Weak'),
    Fair: t('Fair'),
    Good: t('Good'),
    Strong: t('Strong'),
  };
  const strengthLabel = strength.label
    ? strengthLabels[strength.label as keyof typeof strengthLabels] ?? strength.label
    : t('Not rated');

  /**
   * Validate the local inputs and submit the verified reset code to the API.
   *
   * @returns {Promise<void>}
   */
  const handleUpdatePassword = async () => {
    setError('');
    if (!email || !verifiedCode) {
      clearRecovery();
      router.replace('/forgot-password');
      return;
    }
    if (!isPasswordStrong(password)) {
      setError(t('Password must meet all strength requirements'));
      return;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      setError(t('Password must be at most 100 characters'));
      return;
    }
    if (password !== confirm) {
      setError(t('Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, verifiedCode, password);
      clearRecovery();
      router.replace('/password-updated');
    } catch (cause) {
      const normalized = normalizeApiError(cause);
      setError(normalized.message);
      if (
        normalized.code === 'RESET_TOKEN_INVALID' ||
        normalized.code === 'RESET_TOKEN_EXPIRED'
      ) {
        clearRecovery();
      }
    } finally {
      setLoading(false);
    }
  };

  if (contextMissing) {
    return (
      <CenteredAuthScreen>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('Password reset expired')}
          </Text>
          <Text style={styles.subtitle}>
            {t('Your password reset session has expired. Please start again.')}
          </Text>
          <Pressable
            onPress={() => router.replace('/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel={t('Start over')}
            style={({pressed}) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{t('Start over')}</Text>
          </Pressable>
        </View>
      </CenteredAuthScreen>
    );
  }

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('Create new password')}
        </Text>
        <Text style={styles.subtitle}>
          {t('Choose a new password for your account')}
        </Text>

        <Text style={styles.label}>{t('New password')}</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            placeholder={t('Enter a new password')}
            placeholderTextColor="#889A92"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel={t('New password')}
            editable={!loading}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            returnKeyType="next"
          />
          <Pressable
            onPress={() => setShowPassword((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('Hide password') : t('Show password')}
            hitSlop={10}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={23}
              color="#73857E"
            />
          </Pressable>
        </View>

        {passwordFocused ? (
          <View
            style={styles.requirements}
            accessibilityLabel={t('Password requirements: {{items}}', {
              items: requirements.map((requirement) => requirement.label).join(', '),
            })}
          >
            {requirements.map((requirement) => (
              <View
                key={requirement.id}
                style={styles.requirementRow}
                accessible
                accessibilityLabel={`${requirement.label}, ${
                  requirement.satisfied ? t('satisfied') : t('not satisfied')
                }`}
              >
                <Ionicons
                  name={requirement.satisfied ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={requirement.satisfied ? '#1B9568' : '#C4CCD8'}
                />
                <Text
                  style={[
                    styles.requirementText,
                    requirement.satisfied && styles.requirementTextMet,
                  ]}
                >
                  {requirement.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {!passwordFocused && password.length > 0 ? (
          <View
            style={styles.strengthRow}
            accessibilityLabel={t('Password strength: {{label}}', {label: strengthLabel})}
          >
            <View style={styles.strengthTrack}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: `${strength.score * 25}%`,
                    backgroundColor: strengthColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.strengthLabel, {color: strengthColor}]}>
              {strengthLabel}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.label, styles.confirmLabel]}>{t('Confirm password')}</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              setError('');
            }}
            placeholder={t('Re-enter your new password')}
            placeholderTextColor="#889A92"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel={t('Confirm password')}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleUpdatePassword}
          />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleUpdatePassword}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('Update password')}
          accessibilityState={{disabled: loading, busy: loading}}
          style={({pressed}) => [
            styles.button,
            pressed && !loading && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t('Update password')}</Text>
          )}
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
  confirmLabel: {
    marginTop: 20,
  },
  passwordWrap: {
    alignSelf: 'stretch',
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E2DC',
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 51,
    paddingLeft: 14,
    paddingRight: 6,
    fontSize: 16,
    color: '#233D34',
  },
  eyeButton: {
    width: 48,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirements: {
    alignSelf: 'stretch',
    marginTop: 12,
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  requirementText: {
    fontSize: 13,
    color: '#74877F',
  },
  requirementTextMet: {
    color: '#1B9568',
  },
  strengthRow: {
    alignSelf: 'stretch',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0EAE5',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
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

export default ResetPasswordScreen;
