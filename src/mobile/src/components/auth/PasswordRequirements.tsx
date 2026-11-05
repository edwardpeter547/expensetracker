import { brandColors } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export interface PasswordRequirement {
  id: string;
  label: string;
  satisfied: boolean;
}

interface PasswordRequirementsProps {
  requirements: PasswordRequirement[];
}

/**
 * Compact password requirement indicators.
 *
 * Success is conveyed with both a filled check icon and color, so the state
 * does not rely on color alone.
 */
const PasswordRequirements = ({ requirements }: PasswordRequirementsProps) => {
  const styles = useStyles('authForm');

  return (
    <View
      style={styles.requirements}
      accessibilityLabel={`Password requirements: ${requirements
        .map((requirement) => requirement.label)
        .join(', ')}`}
    >
      {requirements.map((requirement) => (
        <View
          key={requirement.id}
          style={styles.requirementRow}
          accessible
          accessibilityLabel={`${requirement.label}, ${
            requirement.satisfied ? 'satisfied' : 'not satisfied'
          }`}
        >
          <Ionicons
            name={requirement.satisfied ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={requirement.satisfied ? brandColors.success : '#C4CCD8'}
          />
          <Text
            style={[
              styles.requirementText,
              requirement.satisfied && styles.requirementTextMet,
            ]}
          >
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

PasswordRequirements.displayName = 'PasswordRequirements';

export default PasswordRequirements;
