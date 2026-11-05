import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBrandHeader from './AuthBrandHeader';
import SecureAccessFooter from './SecureAccessFooter';

interface CenteredAuthScreenProps {
  children: ReactNode;
}

/**
 * Navy, vertically-centered shell for the password-reset flow screens.
 *
 * The scroll view grows to fill the viewport and centers its content so the
 * reset forms sit in the middle of the screen on both iOS and Android.
 */
const CenteredAuthScreen = ({ children }: CenteredAuthScreenProps) => {
  const insets = useSafeAreaInsets();

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
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.body}>
          <AuthBrandHeader />
          <View style={styles.cardGap}>{children}</View>
        </View>
        <SecureAccessFooter />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D1B2E',
  },
  scroll: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  cardGap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 28,
  },
});

CenteredAuthScreen.displayName = 'CenteredAuthScreen';

export default CenteredAuthScreen;
