import useTheme from "@/hooks/useTheme";
import { StyleSheet } from "react-native";

const componentStyles = () => {

    const {colors} = useTheme();

    return StyleSheet.create({
        wrapper: {
            marginBottom: 16,
        },
        label: {
            fontSize: 14,
            fontWeight: "600",
            marginBottom: 8,
        },
        inputContainer: {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 12,
            borderWidth: 1.5,
            paddingHorizontal: 16,
        },
        leftIcon: {
            marginRight: 10,
        },
        input: {
            flex: 1,
            fontSize: 16,
            paddingVertical: 14,
        },
        eyeIcon: {
            padding: 4,
        },
        errorText: {
            fontSize: 12,
            marginTop: 4, 
            marginLeft: 4
        },
        buttonBase: {
            borderRadius: 12,
            overflow: "hidden",
            marginTop: 10,
            marginBottom: 20,
        },
        gradient: {
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
        },
        buttonText: {
            fontSize: 18,
            fontWeight: "700",
        },
        disabled: {
            opacity: 0.6
        },
        keyboardContainer: {
            flex: 1,
        },
        keyboardScrollContent: {
            flexGrow: 1,
            justifyContent: "center"
        }
    });

}


export default componentStyles;


