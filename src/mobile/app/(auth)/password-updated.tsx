import CenteredAuthScreen from '@/components/auth/CenteredAuthScreen';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * Password-reset success screen.
 *
 * Shows a spring-animated green tick, confirms the password change, and then
 * returns the user to sign in after a short delay or on button press.
 */
const PasswordUpdatedScreen = () => {
  const { t } = useTranslation('auth');
  const [scale] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [opacity, scale]);

  return (
    <CenteredAuthScreen>
      <View style={styles.card}>
        <Animated.View
          style={[
            styles.checkBadge,
            {
              opacity,
              transform: [{scale}],
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={72}
            color="#FFFFFF"
            accessible={false}
            importantForAccessibility="no"
          />
        </Animated.View>

        <Text accessibilityRole="header" style={styles.title}>
          {t('Password updated')}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {t('Your password has been changed. You can now sign in with your new password.')}
        </Text>

        <Pressable
          onPress={() => router.replace('/login')}
          accessibilityRole="button"
          accessibilityLabel={t('Back to sign in')}
          style={({pressed}) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{t('Back to sign in')}</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  checkBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#1B9568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 26,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: '#15372F',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
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
    marginTop: 26,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default PasswordUpdatedScreen;
