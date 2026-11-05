import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * Centered screen for choosing a new password after reset-code verification.
 *
 * UI-only: the new password is not submitted to a backend yet.
 */
const ResetPasswordScreen = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  /**
   * Validate the local inputs and return to sign in.
   */
  const handleUpdatePassword = () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    router.replace('/login');
  };

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Create new password
        </Text>
        <Text style={styles.subtitle}>
          Choose a new password for your account
        </Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
            placeholder="Enter a new password"
            placeholderTextColor="#889A92"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel="New password"
            returnKeyType="next"
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

        <Text style={[styles.label, styles.confirmLabel]}>Confirm password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              setError('');
            }}
            placeholder="Re-enter your new password"
            placeholderTextColor="#889A92"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel="Confirm password"
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
          accessibilityRole="button"
          accessibilityLabel="Update password"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Update password</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/login')}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          hitSlop={8}
          style={styles.backLink}
        >
          <Text style={styles.linkText}>Back to sign in</Text>
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
