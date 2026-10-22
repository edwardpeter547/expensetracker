import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";


interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    isPassword: boolean;
    leftIcon?: keyof typeof Ionicons.glyphMap;
}


const InputField = forwardRef<TextInput, InputProps>(({label, error, isPassword, leftIcon, style, ...props}, ref) => {

    const { colors } = useTheme();
    const styles = useStyles('components');

    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    return (
        <View style={styles.wrapper}>
            {label && (
                <Text style={[styles.label, {color: colors.text}]}>{label}</Text>
            )}
            <View style={[
                styles.inputContainer, 
                {
                    backgroundColor: colors.white, 
                    borderColor: error
                    ? colors.expense 
                    : isFocused
                    ? colors.primary
                    : colors.border}
                ]}
            >
                {leftIcon &&(
                    <Ionicons name={leftIcon} size={20} color={colors.textLight} style={styles.leftIcon} />
                )}

                <TextInput
                    style={[
                        styles.input,
                        {color: colors.text},
                        style
                    ]}
                    ref={ref}
                    placeholderTextColor={colors.textLight}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    autoCapitalize="none"
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                    >
                        <Ionicons name={showPassword ? "eye-off": "eye"} size={20} color={colors.textLight} />
                    </TouchableOpacity>
                )}
            </View>
            {error && (
                <Text style={[styles.errorText, { color: colors.expense }]}>
                    {error}
                </Text>
            )}
        </View>
    )

});

export default InputField;