import { normalizeApiError } from '@/api/errors';
import AuthBrandHeader from '@/components/auth/AuthBrandHeader';
import SecureAccessFooter from '@/components/auth/SecureAccessFooter';
import GoogleIcon from '@/components/auth/GoogleIcon';
import { useAuth } from '@/hooks/useAuth';
import {
  getPasswordRequirements,
  getPasswordStrength,
  isPasswordStrong,
  isValidEmail,
} from '@/utils/authValidation';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FieldErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

/** Midnight Luxe V1.5 palette, mirrored from the sign-in screen. */
const C = {
  navy: '#0D1B2E',
  green: '#1B9568',
  ivory: '#FAFBF9',
  heading: '#15372F',
  body: '#233D34',
  muted: '#74877F',
  border: '#E0EAE5',
  inputBorder: '#D7E2DC',
  inputBg: '#FFFFFF',
  link: '#168D64',
  apple: '#111C19',
  googleBorder: '#DCE5E0',
  googleText: '#26372F',
  divider: '#DFE8E3',
  dividerText: '#788A82',
  placeholder: '#889A92',
  error: '#B93B3B',
  errorBorder: '#D64C4C',
  white: '#FFFFFF',
  success: '#1B9568',
  neutral: '#C4CCD8',
  weak: '#D64C4C',
  fair: '#E0A23C',
  good: '#42A85F',
  strong: '#1B9568',
} as const;

/**
 * Derive a temporary username from the registration email.
 *
 * The backend still requires a username in its registration payload, so this
 * keeps signup working until the API contract is updated. The user can set
 * their real username later from the profile screen.
 *
 * @param {string} email The entered email address.
 * @returns {string} A 3-30 character alphanumeric username.
 */
const deriveUsernameFromEmail = (email: string): string => {
  const localPart = email.trim().split('@')[0] ?? '';
  const cleaned = localPart.replace(/[^A-Za-z0-9]/g, '');
  const base = cleaned || 'user';
  if (base.length < 3) return base.padEnd(3, '0');
  return base.slice(0, 30);
};

/**
 * Screen 03 - Create Account, restyled to match the Midnight Luxe sign-in.
 *
 * Keeps the existing registration flow and backend call while adding the
 * standard client-side password strength checklist. The backend still only
 * enforces length; these extra checks are UI guidance and submit gating.
 */
const RegisterScreen = () => {
  const { register } = useAuth();
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  /**
   * Clear the validation message for a field and any form-level error.
   *
   * @param {keyof FieldErrors} field The field whose error is being cleared.
   */
  const clearError = (field: keyof FieldErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  /**
   * Validate the registration fields before submission.
   *
   * @returns {boolean} True when every field passes client-side validation.
   */
  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = t('Email is required');
    } else if (!isValidEmail(email)) {
      next.email = t('Enter a valid email address');
    }
    if (!firstName.trim()) {
      next.firstName = t('First name is required');
    }
    if (!lastName.trim()) {
      next.lastName = t('Last name is required');
    }
    if (!password) {
      next.password = t('Password is required');
    } else if (!isPasswordStrong(password)) {
      next.password = t('Password must meet all strength requirements');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * Submit the registration form and advance to email verification.
   *
   * @returns {Promise<void>}
   */
  const handleRegister = async () => {
    setFormError('');
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const username = deriveUsernameFromEmail(email.trim());
      await register({
        email: email.trim(),
        username,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      router.replace('/verify-email');
    } catch (error) {
      setFormError(normalizeApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Surface a clear message for social providers that are not yet wired.
   *
   * @param {'Google' | 'Apple'} provider The unavailable provider name.
   */
  const handleUnavailableProvider = (provider: 'Google' | 'Apple') => {
    setFormError(t("{{provider}} sign-in isn't available yet.", {provider}));
  };

  const passwordRules = getPasswordRequirements(password);
  const strength = getPasswordStrength(password);
  const strengthColor =
    strength.score <= 1
      ? C.weak
      : strength.score === 2
        ? C.fair
        : strength.score === 3
          ? C.good
          : C.strong;

  const requirements = [
    { id: 'length', label: t('At least 8 characters'), satisfied: passwordRules.length },
    { id: 'uppercase', label: t('One uppercase letter'), satisfied: passwordRules.uppercase },
    { id: 'lowercase', label: t('One lowercase letter'), satisfied: passwordRules.lowercase },
    { id: 'number', label: t('One number'), satisfied: passwordRules.number },
    { id: 'special', label: t('One special character'), satisfied: passwordRules.special },
  ];

  const strengthLabels = {
    Weak: t('Weak'),
    Fair: t('Fair'),
    Good: t('Good'),
    Strong: t('Strong'),
  } as const;
  const strengthLabel = strength.label
    ? strengthLabels[strength.label as keyof typeof strengthLabels] ?? strength.label
    : t('Not rated');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { marginTop: -insets.top }]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AuthBrandHeader />

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('Create Account')}
          </Text>
          <Text style={styles.subtitle}>{t('Start your financial journey')}</Text>

          <View style={styles.fields}>
            <View>
              <Text style={styles.label}>{t('Email')}</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearError('email');
                }}
                placeholder={t('you@example.com')}
                placeholderTextColor={C.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel={t('Email')}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => firstNameRef.current?.focus()}
              />
              {errors.email ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>{t('First name')}</Text>
                <TextInput
                  ref={firstNameRef}
                  style={[styles.input, errors.firstName ? styles.inputError : null]}
                  value={firstName}
                  onChangeText={(value) => {
                    setFirstName(value);
                    clearError('firstName');
                  }}
                  placeholder={t('Jane')}
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  accessibilityLabel={t('First name')}
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
                {errors.firstName ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                    {errors.firstName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.nameField}>
                <Text style={styles.label}>{t('Last name')}</Text>
                <TextInput
                  ref={lastNameRef}
                  style={[styles.input, errors.lastName ? styles.inputError : null]}
                  value={lastName}
                  onChangeText={(value) => {
                    setLastName(value);
                    clearError('lastName');
                  }}
                  placeholder={t('Doe')}
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  textContentType="familyName"
                  accessibilityLabel={t('Last name')}
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {errors.lastName ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                    {errors.lastName}
                  </Text>
                ) : null}
              </View>
            </View>

            <View>
              <Text style={styles.label}>{t('Password')}</Text>
              <View
                style={[styles.passwordWrap, errors.password ? styles.inputError : null]}
              >
                <TextInput
                  ref={passwordRef}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    clearError('password');
                  }}
                  placeholder={t('Create a password')}
                  placeholderTextColor={C.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel={t('Password')}
                  editable={!loading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
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
              {errors.password ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errors.password}
                </Text>
              ) : null}
            </View>

            {passwordFocused ? (
              <View
                style={styles.requirements}
                accessibilityLabel={t('Password requirements: {{items}}', {items: requirements
                  .map((requirement) => requirement.label)
                  .join(', ')})}
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
                      color={requirement.satisfied ? C.success : C.neutral}
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
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                  {strengthLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {formError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('Create Account')}
            accessibilityState={{ disabled: loading, busy: loading }}
            style={({ pressed }) => [
              styles.button,
              pressed && !loading && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.buttonText}>{t('Create Account')}</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t('OR CONTINUE WITH')}</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            onPress={() => handleUnavailableProvider('Google')}
            accessibilityRole="button"
            accessibilityLabel={t('Continue with Google')}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <GoogleIcon size={22} />
            <Text style={styles.googleText}>{t('Continue with Google')}</Text>
          </Pressable>

          <Pressable
            onPress={() => handleUnavailableProvider('Apple')}
            accessibilityRole="button"
            accessibilityLabel={t('Continue with Apple')}
            style={({ pressed }) => [
              styles.appleButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="logo-apple" size={23} color={C.white} />
            <Text style={styles.appleText}>{t('Continue with Apple')}</Text>
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>{t('Already have an account? ')}</Text>
            <Pressable
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              accessibilityLabel={t('Sign In')}
              hitSlop={4}
            >
              <Text style={styles.registerLink}>{t('Sign In')}</Text>
            </Pressable>
          </View>
        </View>

        <SecureAccessFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** Styles local to the Midnight Luxe registration screen. */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.navy,
  },
  scroll: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: C.ivory,
    marginHorizontal: 28,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.9,
    color: C.heading,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    marginTop: 5,
    marginBottom: 22,
  },
  fields: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: C.body,
    marginBottom: 9,
  },
  input: {
    minHeight: 53,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    backgroundColor: C.inputBg,
    color: C.body,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: C.errorBorder,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  passwordWrap: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    backgroundColor: C.inputBg,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 51,
    paddingLeft: 14,
    paddingRight: 6,
    fontSize: 16,
    color: C.body,
  },
  eyeButton: {
    width: 48,
    height: 51,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: C.error,
    fontSize: 13,
    marginTop: 6,
  },
  requirements: {
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: C.muted,
  },
  requirementTextMet: {
    color: C.body,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DFE8E3',
  },
  strengthFill: {
    height: 6,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 54,
    textAlign: 'right',
  },
  button: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 22,
    marginBottom: 17,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: C.divider,
  },
  dividerText: {
    fontSize: 11,
    color: C.dividerText,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  googleButton: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: C.googleBorder,
    backgroundColor: C.white,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  googleText: {
    color: C.googleText,
    fontSize: 16,
    fontWeight: '700',
  },
  appleButton: {
    minHeight: 51,
    backgroundColor: C.apple,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    color: C.muted,
  },
  registerLink: {
    fontSize: 14,
    color: C.link,
    fontWeight: '700',
  },
});

export default RegisterScreen;
