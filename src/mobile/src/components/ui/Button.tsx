import useStyles from '@/hooks/useStyles';
import useTheme from '@/hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: "primary" | "outline";
}

const Button = ({title, onPress, loading, disabled, variant = "primary"}: ButtonProps) => {
    const { colors } = useTheme();
    const styles = useStyles("components");

    // For outline variant, don't use LinearGradient at all
    if (variant === "outline") {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[
                    styles.buttonBase,
                    {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        backgroundColor: "transparent"
                    },
                    disabled && styles.disabled
                ]}
            >
                <View style={styles.gradient}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <Text style={[styles.buttonText, { color: colors.primary }]}>
                            {title}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    // For primary variant, use LinearGradient with real colors
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[styles.buttonBase, disabled && styles.disabled]}
        >
            <LinearGradient
                colors={[colors.primary, colors.primary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <Text style={[styles.buttonText, { color: colors.white }]}>
                        {title}
                    </Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};


Button.displayName = "Button";


export default Button;