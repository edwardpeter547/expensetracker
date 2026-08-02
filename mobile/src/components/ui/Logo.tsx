import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const Logo = () => {

    const {colors} = useTheme();
    const Styles = useStyles('auth')
    return (
        <View style={Styles.logoContainer}>
            <View style={[Styles.logoCircle, {backgroundColor: colors.primary}]}>
                <Ionicons name="wallet" size={40} color={colors.white} />
            </View>
            <Text style={[Styles.appName, {color: colors.text}]}>ExpenseTracker</Text>
            <Text style={[Styles.tagline, {color: colors.textLight}]}>Track smart. save more...</Text>
        </View>
    )
}


export default Logo;
