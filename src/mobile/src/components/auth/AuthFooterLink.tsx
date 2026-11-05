import useStyles from '@/hooks/useStyles';
import { Pressable, Text, View } from 'react-native';

interface AuthFooterLinkProps {
  prompt: string;
  linkText: string;
  onPress: () => void;
}

/**
 * Bottom navigation line such as "Don't have an account? Sign Up".
 */
const AuthFooterLink = ({ prompt, linkText, onPress }: AuthFooterLinkProps) => {
  const styles = useStyles('authForm');

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{prompt}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={linkText}
        hitSlop={4}
      >
        <Text style={styles.footerLink}>{linkText}</Text>
      </Pressable>
    </View>
  );
};

AuthFooterLink.displayName = 'AuthFooterLink';

export default AuthFooterLink;
