import { brandColors } from '@/constants/designTokens';
import useStyles from '@/hooks/useStyles';
import { forwardRef, useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Labeled text input with shared focus and error styling.
 */
const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  ({ label, error, containerStyle, style, onFocus, onBlur, ...props }, ref) => {
    const styles = useStyles('authForm');
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.field, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            style,
          ]}
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
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

AuthTextField.displayName = 'AuthTextField';

export default AuthTextField;
