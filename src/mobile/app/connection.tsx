import { apiClient } from "@/api/client";
import SafeScreen from "@/components/SafeScreen";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";


const ConnectionChecker = () => {
    const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const checkConnection = async () => {
        setStatus("loading");
        setErrorMessage("");

        const start = Date.now();
        try{
            await apiClient.get('/health');
            const elapsed = Date.now() - start;
            setResponseTime(elapsed);
            setStatus('connected');

        }catch(error: any){
            const elapsed = Date.now() - start;
            setResponseTime(elapsed);
            setStatus("error");
            setErrorMessage(error.message || "Connection failure");
        }
    }

    useEffect(() => {
        checkConnection();
    }, []);

    const styles = useStyles('general');
    const {colors} = useTheme();


    return (
        <SafeScreen>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.appName}>ExpenseTracker</Text>
                    <Text style={styles.tagline}>API Connection Tester</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Backend Status</Text>
                        <View style={styles.statusBadge}>
                            {status === 'loading' && (
                                <ActivityIndicator size="small" color={colors.text} />
                            )}
                            {status === 'connected'  && (
                                <View style={[styles.statusRow, {gap: 6}]}>
                                    <Text style={[styles.statusText, {color: '#0f5a05'}]}>Connected</Text>
                                    <View style={styles.greenDot} />
                                </View>
                            )}
                            {status === 'error' &&(
                                <View style={[styles.statusRow, {gap: 6}]}>
                                    <Text style={[styles.statusText, {color: "#E74C3C"}]}>Disconnected</Text>
                                    <View style={styles.redDot} />
                                </View>
                            )}

                        </View>
                    </View>
                </View>

                <View style={styles.divider} />
                {responseTime !== null &&(
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Response Time</Text>
                        <Text style={styles.infoValue}>{responseTime}ms</Text>
                    </View>
                )}
                {errorMessage ? (
                    <View style={styles.errorSection}>
                        <Ionicons name="warning" size={16} color="#E74C3C" />
                        <Text style={styles.errorDetail}>{errorMessage}</Text>
                    </View>
                ) : null}

                <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={styles.retryText}>Test Connection</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.continueButton} onPress={() => router.replace("/(auth)/login")}>
                    <Text style={styles.continueText}>Continue to App</Text>
                    <Ionicons name="arrow-forward" size={18} color="#8B593E" />
                </TouchableOpacity>
            </View>
        </SafeScreen>
        
    )
}

export default ConnectionChecker;