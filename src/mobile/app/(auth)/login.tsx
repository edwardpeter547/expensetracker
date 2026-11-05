import { normalizeApiError } from '@/api/errors';
import AuthBrandHeader from '@/components/auth/AuthBrandHeader';
import SecureAccessFooter from '@/components/auth/SecureAccessFooter';
import GoogleIcon from '@/components/auth/GoogleIcon';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/utils/authValidation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  password?: string;
}

/** Midnight Luxe V1.5 palette, kept local to the sign-in screen only. */
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
  biometricBg: '#E9F5EE',
  biometricText: '#17664D',
  placeholder: '#889A92',
  error: '#B93B3B',
  errorBorder: '#D64C4C',
  white: '#FFFFFF',
} as const;

/**
 * Screen 02 - Sign In, restyled as Midnight Luxe V1.5.
 *
 * Preserves the existing credential, biometric, and redirect flows while
 * adopting the navy/ivory visual spec. Google and Apple buttons keep their
 * reference presentation but surface an honest unavailable message until the
 * auth context exposes real social sign-in handlers.
 */
const LoginScreen = () => {
  const { login, user, loginWithBiometrics } = useAuth();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

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
   * Validate the local credentials before submission.
   *
   * @returns {boolean} True when both fields pass client-side validation.
   */
  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address';
    }
    if (!password) {
      next.password = 'Password is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * Submit the existing-password sign-in form.
   *
   * @returns {Promise<void>}
   */
  const handleLogin = async () => {
    setFormError('');
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(normalizeApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Attempt biometric sign-in using the enrolled account credential.
   *
   * @returns {Promise<void>}
   */
  const handleBiometricLogin = async () => {
    setFormError('');
    setBiometricError('');
    setBiometricLoading(true);
    try {
      await loginWithBiometrics();
    } catch (error) {
      setBiometricError(
        error instanceof Error ? error.message : normalizeApiError(error).message,
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  /**
   * Surface a clear message for social providers that are not yet wired.
   *
   * @param {'Google' | 'Apple'} provider The unavailable provider name.
   */
  const handleUnavailableProvider = (provider: 'Google' | 'Apple') => {
    setFormError(`${provider} sign-in isn't available yet.`);
  };

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
            paddingBottom: insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AuthBrandHeader />

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Sign in
          </Text>
          <Text style={styles.subtitle}>Access your financial dashboard</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearError('email');
            }}
            placeholder="you@example.com"
            placeholderTextColor={C.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            editable={!loading}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          {errors.email ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {errors.email}
            </Text>
          ) : null}

          <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
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
              placeholder="Enter your password"
              placeholderTextColor={C.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              accessibilityLabel="Password"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable
              onPress={() => setShowPassword((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
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

          <Pressable
            onPress={() => router.push('/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Forgot Password?"
            style={styles.forgot}
            hitSlop={8}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {formError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {formError}
            </Text>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityState={{ disabled: loading, busy: loading }}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && !loading && styles.signInButtonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={styles.signInText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color={C.white} />
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            onPress={() => handleUnavailableProvider('Google')}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.signInButtonPressed,
            ]}
          >
            <GoogleIcon size={22} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            onPress={() => handleUnavailableProvider('Apple')}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            style={({ pressed }) => [
              styles.appleButton,
              pressed && styles.signInButtonPressed,
            ]}
          >
            <Ionicons name="logo-apple" size={23} color={C.white} />
            <Text style={styles.appleText}>Continue with Apple</Text>
          </Pressable>

          {!isIOS ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Biometrics"
                onPress={() => void handleBiometricLogin()}
                disabled={biometricLoading}
                accessibilityState={{ disabled: biometricLoading, busy: biometricLoading }}
                style={({ pressed }) => [
                  styles.biometricButton,
                  pressed && !biometricLoading && styles.signInButtonPressed,
                  biometricLoading && styles.buttonDisabled,
                ]}
              >
                {biometricLoading ? (
                  <ActivityIndicator color={C.biometricText} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="fingerprint" size={25} color={C.link} />
                    <Text style={styles.biometricText}>Sign in with Biometrics</Text>
                  </>
                )}
              </Pressable>
              {biometricError ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {biometricError}
                </Text>
              ) : null}
            </>
          ) : null}

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>New to ExpenseTracker? </Text>
            <Pressable
              onPress={() => router.push('/register')}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              hitSlop={4}
            >
              <Text style={styles.registerLink}>Create account</Text>
            </Pressable>
          </View>
        </View>

        <SecureAccessFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** Styles local to the Midnight Luxe sign-in screen. */
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
  passwordLabel: {
    marginTop: 20,
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
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 11,
    marginBottom: 8,
  },
  forgotText: {
    color: C.link,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: C.error,
    fontSize: 13,
    marginTop: 6,
  },
  signInButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: C.green,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  signInText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
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
  biometricButton: {
    minHeight: 51,
    marginTop: 14,
    backgroundColor: C.biometricBg,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricText: {
    color: C.biometricText,
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

export default LoginScreen;
