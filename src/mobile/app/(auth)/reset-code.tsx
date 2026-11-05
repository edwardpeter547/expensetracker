import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * Map a delivery channel id to the copy shown on the code screen.
 *
 * @param channel - The selected delivery channel id.
 * @returns The human-readable channel phrase.
 */
const channelLabelFor = (channel?: string): string => {
  switch (channel) {
    case 'mobile':
      return 'your mobile number';
    case 'whatsapp':
      return 'your WhatsApp';
    default:
      return 'your email';
  }
};

/**
 * Format a countdown value as mm:ss.
 *
 * @param seconds - The number of seconds remaining.
 * @returns The formatted expiry time.
 */
const formatExpiry = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Centered screen for entering the six-digit password-reset code.
 *
 * UI-only: the code is not validated against a backend yet. The mismatch
 * error state and resend countdown are ready for the future API wiring.
 */
const ResetCodeScreen = () => {
  const { channel } = useLocalSearchParams<{ channel?: string }>();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [codeError, setCodeError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Update one digit and advance focus to the next empty box.
   *
   * @param index - The digit position being edited.
   * @param value - The raw input value.
   */
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setCodeError('');
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus?.();
    }
  };

  /**
   * Move focus back when backspace is pressed on an empty box.
   *
   * @param index - The digit position being edited.
   * @param key - The pressed key.
   */
  const handleDigitKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus?.();
    }
  };

  /**
   * Validate the entered digits and advance to the new-password screen.
   */
  const handleVerify = () => {
    const entered = digits.join('');
    if (entered.length < CODE_LENGTH) {
      setCodeError('Enter all 6 digits');
      return;
    }
    setCodeError('');
    router.push('/reset-password');
  };

  /**
   * Reset the code entry and restart the expiry countdown.
   */
  const handleResend = () => {
    setDigits(Array(CODE_LENGTH).fill(''));
    setCodeError('');
    setSecondsLeft(RESEND_SECONDS);
    inputRefs.current[0]?.focus?.();
  };

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Enter code
        </Text>
        <Text style={styles.subtitle}>
          {`We sent a 6-digit code to ${channelLabelFor(channel)}`}
        </Text>

        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              style={[styles.digitBox, codeError ? styles.digitBoxError : null]}
              value={digit}
              onChangeText={(value) => handleDigitChange(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleDigitKeyPress(index, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              selectTextOnFocus
              accessibilityLabel={`Digit ${index + 1}`}
              returnKeyType={index === CODE_LENGTH - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                if (index < CODE_LENGTH - 1) {
                  inputRefs.current[index + 1]?.focus?.();
                } else {
                  handleVerify();
                }
              }}
            />
          ))}
        </View>

        {codeError ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {codeError}
          </Text>
        ) : null}

        <Text style={styles.expiryText}>
          {`Code expires in ${formatExpiry(secondsLeft)}`}
        </Text>

        <Pressable
          onPress={handleVerify}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Verify code</Text>
        </Pressable>

        <Pressable
          onPress={handleResend}
          accessibilityRole="button"
          accessibilityLabel="Resend code"
          hitSlop={8}
          style={styles.resendLink}
        >
          <Text style={styles.linkText}>Resend code</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Change delivery method"
          hitSlop={8}
          style={styles.backLink}
        >
          <Text style={styles.linkText}>Change delivery method</Text>
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
  codeRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
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
  errorText: {
    alignSelf: 'stretch',
    color: '#B93B3B',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  expiryText: {
    marginTop: 14,
    fontSize: 13,
    color: '#74877F',
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  resendLink: {
    marginTop: 16,
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

export default ResetCodeScreen;
