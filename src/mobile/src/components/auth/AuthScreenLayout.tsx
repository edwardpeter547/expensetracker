import { spacing } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthScreenLayoutProps {
  children: ReactNode;
}

/**
 * Shared responsive shell for the authentication screens.
 *
 * Handles keyboard avoidance, scrolling, and safe areas. A negative top
 * margin bridges the root layout's themed padding so the status-bar area
 * stays white on the brand screens.
 */
const AuthScreenLayout = ({ children }: AuthScreenLayoutProps) => {
  const styles = useStyles('authForm');
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.keyboardView,
        { marginTop: -insets.top, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreenLayout;
