import { brandColors } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

/**
 * Back arrow plus page title and subtitle shared by the auth screens.
 */
const AuthHeader = ({ title, subtitle, onBack }: AuthHeaderProps) => {
  const styles = useStyles('authForm');
  const { t } = useTranslation('auth');

  return (
    <View>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('Go back')}
      >
        <Ionicons name="chevron-back" size={22} color={brandColors.backIcon} />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

AuthHeader.displayName = 'AuthHeader';

export default AuthHeader;
