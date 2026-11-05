import { brandColors } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

interface PasswordInputProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * Password input with a visibility toggle and shared focus/error styling.
 */
const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ label, error, onFocus, onBlur, ...props }, ref) => {
    const styles = useStyles('authForm');
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.passwordWrap,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
          ]}
        >
          <TextInput
            ref={ref}
            style={styles.passwordInput}
            secureTextEntry={!visible}
            placeholderTextColor={brandColors.placeholder}
            accessibilityLabel={label}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...props}
          />
          <TouchableOpacity
            onPress={() => setVisible((current) => !current)}
            style={styles.eyeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={brandColors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
