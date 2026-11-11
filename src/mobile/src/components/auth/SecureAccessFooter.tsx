import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Shared "Secure access to your financial world" footer.
 *
 * Kept as a single component so the reassurance line and shield icon stay
 * consistent across every unauthenticated screen.
 */
const SecureAccessFooter = () => {
  const { t } = useTranslation('auth');

  return (
  <View style={styles.footer}>
    <Ionicons name="shield-checkmark-outline" size={17} color="#80AFA3" />
    <Text style={styles.text}>{t('Secure access to your financial world')}</Text>
  </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 13,
    color: '#AEC5CE',
  },
});

SecureAccessFooter.displayName = 'SecureAccessFooter';

export default SecureAccessFooter;
