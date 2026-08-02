import SafeScreen from "@/components/SafeScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

const RootLayoutContent = () => {

    const {isLoading } = useAuth();

    if(isLoading){
        return (
            <SafeScreen>
                <View style={{flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#070707"}}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeScreen>
        )
    }

    return (
        <SafeScreen>
            <Stack screenOptions={{headerShown: false}}>
                <Stack.Screen name="index" />
                {/* <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" /> */}
            </Stack>
        </SafeScreen>
    )
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RootLayoutContent />
            </AuthProvider>
        </ThemeProvider>
    )
}