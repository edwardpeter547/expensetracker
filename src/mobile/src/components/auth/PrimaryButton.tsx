import { brandColors } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { ActivityIndicator, Pressable, Text } from 'react-native';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Full-width emerald primary action button with a loading state.
 */
const PrimaryButton = ({
  title,
  onPress,
  loading,
  disabled,
}: PrimaryButtonProps) => {
  const styles = useStyles('authForm');
  const blocked = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(blocked), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.button,
        pressed && !blocked && styles.buttonPressed,
        blocked && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={brandColors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
};

PrimaryButton.displayName = 'PrimaryButton';

export default PrimaryButton;
