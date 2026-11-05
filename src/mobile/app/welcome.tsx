import AuditWalletMark from '@/components/ui/AuditWalletMark';
import WelcomeLandscape from '@/components/ui/WelcomeLandscape';
import { spacing } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The splash and welcome screen shown to unauthenticated users.
 *
 * Presents the brand mark, tagline, illustration and the two entry actions
 * into registration and login.
 */
const WelcomeScreen = () => {
  const styles = useStyles('welcome');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { marginTop: -insets.top, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.brand}>
          <AuditWalletMark size={76} variant="navy" />
          <Image
            source={require('../assets/images/AuditWallet_wordmark_split_light.png')}
            accessibilityLabel="AuditWallet"
            resizeMode="contain"
            style={styles.wordmark}
          />
          <Text style={styles.subtitle}>
            {'Take control of\nyour finances'}
          </Text>
        </View>

        <View style={styles.illustration}>
          <WelcomeLandscape />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Started"
            onPress={() => router.push('/register')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default WelcomeScreen;
