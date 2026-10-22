import { apiClient } from "@/api/client";
import QuickAddForm from "@/components/forms/QuickAddForm";
import SafeScreen from "@/components/SafeScreen";
import Avatar from "@/components/ui/Avatar";
import QuickActionButtons from "@/components/ui/QuickActionButtons";
import { useAuth } from "@/hooks/useAuth";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { DashboardData } from "@/types/Common";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const DashboardScreen = () => {

   const { colors }  = useTheme();
   const Styles = useStyles("home");
   const { user } = useAuth();
   const [data, setData] = useState<DashboardData | null>(null);
   const [loading, setLoading] = useState<boolean>(true);
   const [refreshing, setRefreshing] = useState<boolean>(false);
   const [showForm, setShowForm] = useState(false);
   const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

   const fetchDashboard = async () => {
        try {
            const response = await apiClient.get("/user/dashboard");
            setData(response.data.data);
        }catch(error){
            console.log("failed to fetch dashboard:", error);
        }finally{
            setLoading(false);
            setRefreshing(false)
        }
   }

   useEffect(() => {
        fetchDashboard();
   }, []);

   const onRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
   }

   if (loading) {
        return (
            <SafeScreen>
                <View style={Styles.loadingContainer}>
                    <ActivityIndicator size={"large"} color={colors.primary} />
                </View>
            </SafeScreen>
        );
   }

   return (
        <SafeScreen>
            <ScrollView 
                style={Styles.container}
                contentContainerStyle={Styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header with user greeting */}
                <View style={Styles.header}>
                    <View style={Styles.headerLeft}>
                        <Avatar firstName={user?.firstname} lastName={user?.lastname} size={50} />
                        <View style={Styles.welcomeContainer}>
                            <Text style={Styles.welcomeText}>Welcome back,</Text>
                            <Text style={Styles.usernameText}>{user?.firstname || "User"}</Text>
                        </View>
                    </View>
                    <View style={Styles.headerRight}>
                        <TouchableOpacity style={Styles.logoutButton}>
                            <Ionicons name="notifications-outline" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Balance Card */}
                <View style={Styles.balanceCard}>
                    <Text style={Styles.balanceTitle}>Current Balance</Text>
                    <Text style={Styles.balanceAmount}>${data?.balance?.toFixed(2) || "0.00"}</Text>
                    <View style={Styles.balanceStats}>
                        <View style={[Styles.balanceStatItem, Styles.statDivider]}>
                            <Text style={Styles.balanceStatLabel}>Income</Text>
                            <Text style={[Styles.balanceStatAmount, {color: colors.income}]}>
                                ${data?.totalIncome?.toFixed(2) || "0.00"}
                            </Text>
                        </View>
                        <View style={Styles.balanceStatItem}>
                            <Text style={Styles.balanceStatLabel}>Expenses</Text>
                            <Text style={[Styles.balanceStatAmount, { color: colors.expense }]}>
                                ${data?.totalExpenses?.toFixed(2) || "0.00"}
                            </Text>
                        </View>
                    </View>
                </View>

                <QuickActionButtons
                    onIncomePress={() => { setFormType("INCOME"); setShowForm(!showForm); }}
                    onExpensePress={() => { setFormType("EXPENSE"); setShowForm(!showForm); }}
                    showForm={showForm}
                    activeType={formType}
                />

                {showForm && (
                    <QuickAddForm
                        formType={formType}
                        onClose={() => setShowForm(false)}
                        onSuccess={() => {
                            setShowForm(false);
                            fetchDashboard();
                        }}
                    />
                )}

                {/* Recent Transactions */}
                <View style={Styles.transactionsHeaderContainer}>
                    <Text style={Styles.sectionTitle}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
                        <Text style={{color: colors.primary, fontWeight: "600"}}>See All</Text>
                    </TouchableOpacity>
                </View>

                {data?.recentTransactions?.length ? (
                    data.recentTransactions.map((transaction) => (
                        <View key={transaction.id} style={Styles.transactionCard}>
                            <View style={Styles.categoryIconContainer}>
                                <Ionicons
                                    name={
                                        transaction.transType === "INCOME"
                                            ? "arrow-down-circle"
                                            : "arrow-up-circle"
                                    }
                                    size={24}
                                    color={
                                        transaction.transType === "INCOME"
                                            ? colors.income
                                            : colors.expense
                                    }
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={Styles.transactionTitle}>
                                    {transaction.description || transaction.category}
                                </Text>
                                <Text style={Styles.transactionCategory}>
                                    {transaction.category}
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text
                                    style={[
                                        Styles.transactionAmount,
                                        {
                                            color:
                                                transaction.transType === "INCOME"
                                                    ? colors.income
                                                    : colors.expense,
                                        },
                                    ]}
                                >
                                    {transaction.transType === "INCOME" ? "+" : "-"}$
                                    {transaction.amount.toFixed(2)}
                                </Text>
                                <Text style={Styles.transactionDate}>
                                    {new Date(transaction.transactionDate).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    ))
                ): null}

            </ScrollView>
        </SafeScreen>
   )
}


export default DashboardScreen;