import useTheme from "@/hooks/useTheme";
import { StyleSheet } from "react-native";


const homeStyles = () => {

    const { colors } = useTheme();

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 20,
            paddingBottom: 0,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingHorizontal: 0,
            paddingVertical: 12,
        },
        headerLeft: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
        },
        headerLogo: {
            width: 75,
            height: 75,
        },
        welcomeContainer: {
            flex: 1,
            marginLeft: 20,
        },
        welcomeText: {
            fontSize: 14,
            color: colors.textLight,
            marginBottom: 2,
        },
        usernameText: {
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
        },
        headerRight: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        headerTitle: {
            fontSize: 28,
            fontWeight: "bold",
            color: colors.text,
        },
        addButton: {
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 24,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        addButtonText: {
            color: colors.white,
            fontWeight: "600",
            marginLeft: 4,
        },
        logoutButton: {
            padding: 10,
            borderRadius: 20,
            backgroundColor: colors.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        balanceCard: {
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOffset: {
            width: 0,
            height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        balanceTitle: {
            fontSize: 16,
            color: colors.textLight,
            marginBottom: 8,
        },
        balanceAmount: {
            fontSize: 32,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 20,
        },
        balanceStats: {
            flexDirection: "row",
            justifyContent: "space-between",
        },
        balanceStatItem: {
            flex: 1,
            alignItems: "center",
        },
        statDivider: {
            borderRightWidth: 1,
            borderColor: colors.border,
        },
        balanceStatLabel: {
            fontSize: 14,
            color: colors.textLight,
            marginBottom: 4,
        },
        balanceStatAmount: {
            fontSize: 18,
            fontWeight: "600",
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 15,
        },
        transactionCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            marginBottom: 10,
            padding: 15,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        transactionContent: {
            flex: 1,
            flexDirection: "row",
            padding: 15,
            alignItems: "center",
        },
        categoryIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#F5F5F5",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
        },
        transactionLeft: {
            flex: 1,
        },
        transactionTitle: {
            fontSize: 16,
            fontWeight: "500",
            color: colors.text,
            marginBottom: 4,
        },
        transactionCategory: {
            fontSize: 14,
            color: colors.textLight,
        },
        transactionRight: {
            alignItems: "flex-end",
        },
        transactionAmount: {
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 4,
        },
        transactionDate: {
            fontSize: 12,
            color: colors.textLight,
        },
        deleteButton: {
            padding: 15,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
        },
        transactionsContainer: {
            marginBottom: 20,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
        },
        emptyState: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 30,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        emptyStateIcon: {
            marginBottom: 16,
        },
        emptyStateTitle: {
            fontSize: 18,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 8,
        },
        emptyStateText: {
            color: colors.textLight,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 20,
        },
        emptyStateButton: {
            backgroundColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
        },
        emptyStateButtonText: {
            color: colors.white,
            fontWeight: "600",
            marginLeft: 6,
        },
        transactionsHeaderContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 5,
        },
        transactionsList: {
            flex: 1,
            marginHorizontal: 20,
        },
        transactionsListContent: {
            paddingBottom: 20,
        },
    });
}


export default homeStyles;