import SafeScreen from "@/components/SafeScreen";
import AppLockScreen from "@/components/security/AppLockScreen";
import { brandColors } from "@/constants/designTokens";
import { AppLockProvider, useAppLock } from "@/contexts/AppLockContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FeatureAccessProvider } from "@/contexts/FeatureAccessContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import i18n from "@/i18n";
import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const RootLayoutContent = () => {

    const { user, isLoading } = useAuth();
    const { enabled, locked, lockReady } = useAppLock();

    if (isLoading) {
        return (
            <View style={{flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brandColors.background}}>
                <ActivityIndicator size="large" color={brandColors.primary} />
            </View>
        )
    }

    if (user && !lockReady) {
        return (
            <View style={{flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brandColors.background}}>
                <ActivityIndicator size="large" color={brandColors.primary} />
            </View>
        )
    }

    if (user && enabled && locked) {
        return <AppLockScreen />;
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
        <GestureHandlerRootView style={{ flex: 1 }}>
            <I18nextProvider i18n={i18n}>
                <ThemeProvider>
                    <LocaleProvider>
                        <AuthProvider>
                            <AppLockProvider>
                                <FeatureAccessProvider>
                                    <RootLayoutContent />
                                </FeatureAccessProvider>
                            </AppLockProvider>
                        </AuthProvider>
                    </LocaleProvider>
                </ThemeProvider>
            </I18nextProvider>
        </GestureHandlerRootView>
    )
}
