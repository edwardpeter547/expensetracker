import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Channel = 'email' | 'mobile' | 'whatsapp';

const CHANNELS: {
  id: Channel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'email', label: 'Email', icon: 'mail-outline' },
  { id: 'mobile', label: 'Mobile number', icon: 'phone-portrait-outline' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
];

/**
 * Password-reset entry screen: identify the account and choose a delivery
 * channel for the reset code. UI-only; the backend call comes later.
 */
const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<Channel>('email');

  /**
   * Continue to the reset-code screen.
   */
  const handleSendCode = () => {
    router.push({ pathname: '/reset-code', params: { channel } });
  };

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Forgot password?
        </Text>
        <Text style={styles.subtitle}>Choose where to receive your reset code</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#889A92"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="Email"
          returnKeyType="done"
        />

        <Text style={[styles.label, styles.channelLabel]}>Receive code via</Text>
        {CHANNELS.map((option) => {
          const selected = channel === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setChannel(option.id)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={selected ? '#1B9568' : '#74877F'}
              />
              <Text
                style={[styles.optionText, selected && styles.optionTextSelected]}
              >
                {option.label}
              </Text>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? '#1B9568' : '#C4CCD8'}
              />
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleSendCode}
          accessibilityRole="button"
          accessibilityLabel="Send reset code"
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Send reset code</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
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
  channelLabel: {
    marginTop: 20,
  },
  option: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 51,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E2DC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: '#1B9568',
    backgroundColor: '#E9F7F0',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#233D34',
  },
  optionTextSelected: {
    color: '#15372F',
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#1B9568',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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

export default ForgotPasswordScreen;
