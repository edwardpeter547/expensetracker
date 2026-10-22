import useTheme from "@/hooks/useTheme";
import { StyleSheet } from "react-native";

const generalStyles = () => {

    const {colors} = useTheme();

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: "#FFF8F3",
            paddingHorizontal: 24,
        },
        header: {
            alignItems: "center",
            marginTop: 60,
            marginBottom: 40,
        },
        appName: {
            fontSize: 32,
            fontWeight: "bold",
            color: "#4A3428",
            marginBottom: 8,
        },
        tagline: {
            fontSize: 16,
            color: "#9A8478",
        },
        card: {
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
        },
        statusRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        statusLabel: {
            fontSize: 16,
            fontWeight: "600",
            color: "#4A3428",
        },
        statusBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        statusText: {
            fontSize: 14,
            fontWeight: "600",
            color: "#2ECC71",
        },
        greenDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "#2ECC71",
        },
        redDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "#E74C3C",
        },
        divider: {
            height: 1,
            backgroundColor: "#E5D3B7",
            marginVertical: 12,
        },
        infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
        },
        infoLabel: {
            fontSize: 14,
            color: "#9A8478",
        },
        infoValue: {
            fontSize: 14,
            fontWeight: "600",
            color: "#4A3428",
        },
        errorSection: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            padding: 10,
            backgroundColor: "#FFE5E5",
            borderRadius: 8,
        },
        errorDetail: {
            fontSize: 13,
            color: "#4A3428",
            flex: 1,
        },
        retryButton: {
            backgroundColor: "#8B593E",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
        },
        retryText: {
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "600",
        },
        continueButton: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginTop: 24,
            padding: 12,
        },
        continueText: {
            color: "#8B593E",
            fontSize: 15,
            fontWeight: "600",
        },
    });

}


export default generalStyles;


