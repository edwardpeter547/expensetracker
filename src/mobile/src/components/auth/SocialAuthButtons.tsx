import useStyles from '@/hooks/useStyles';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import GoogleIcon from './GoogleIcon';

/**
 * Deferred social sign-in section.
 *
 * The buttons are intentionally disabled and explained to assistive
 * technology while preserving the reference layout for a future story.
 */
const SocialAuthButtons = () => {
  const styles = useStyles('authForm');

  return (
    <View style={styles.socialSection}>
      <Text style={styles.dividerText}>Or continue with</Text>
      <View style={styles.socialRow}>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel="Google sign-in coming soon"
          accessibilityHint="Google sign-in is not available yet"
          accessibilityState={{ disabled: true }}
          style={styles.socialButton}
        >
          <GoogleIcon size={22} />
        </Pressable>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel="Apple sign-in coming soon"
          accessibilityHint="Apple sign-in is not available yet"
          accessibilityState={{ disabled: true }}
          style={styles.socialButton}
        >
          <Ionicons name="logo-apple" size={26} color="#0B0B0F" />
        </Pressable>
      </View>
    </View>
  );
};

SocialAuthButtons.displayName = 'SocialAuthButtons';

export default SocialAuthButtons;
