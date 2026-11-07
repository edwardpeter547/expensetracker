import { Image, StyleSheet, View } from 'react-native';

/**
 * Shared navy brand header for the unauthenticated screens.
 *
 * Renders the A2 monogram beside the AuditWallet wordmark inside a rounded
 * navy card so every pre-login screen carries the same brand treatment.
 */
const AuthBrandHeader = () => (
  <View style={styles.card}>
    <View style={styles.icon}>
      <Image
        source={require('../../../assets/images/favicon.png')}
        resizeMode="contain"
        style={{ width: 26, height: 26 }}
      />
    </View>
    <Image
      source={require('../../../assets/images/AuditWallet_wordmark_split_dark.png')}
      accessibilityLabel="AuditWallet"
      resizeMode="contain"
      style={styles.wordmark}
    />
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27455F',
    backgroundColor: '#14283E',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1B9568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    height: 26,
    width: 198,
  },
});

AuthBrandHeader.displayName = 'AuthBrandHeader';

export default AuthBrandHeader;
