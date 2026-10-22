import Button from "@/components/ui/Button";
import InputField from "@/components/ui/Input";
import KeyboardAvoidWrapper from "@/components/ui/KeyboardAvoidWrapper";
import Logo from "@/components/ui/Logo";
import { useAuth } from "@/hooks/useAuth";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

const LoginScreen = () => {
    const {login, user} = useAuth();

    useEffect(() => {
        console.log(JSON.stringify(user));
        if(user) {
            router.replace("/(tabs)")
        }
    }, [user]);


    const {colors} = useTheme();
    const styles = useStyles('auth');

    // Form States
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState("");

    // Refs for focusing next field
    const passwordRef = useRef<any>(null);

    const handleLogin = async () => {
        // Basic client side validation
        if(!email.trim()){
            setError("Please enter your email address");
            return;
        }

        if(!password){
            setError("Please enter your password");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await login(email, password);
            router.replace("/(tabs)");
        }catch(error: any){
            error.response?.data?.message || "An error occurred. Please try again.";
        }
        finally{
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidWrapper>
            <View style={styles.container}>
                <Logo />
                {error ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={20} color={colors.expense} />
                        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    </View>
                ) : null}

                <InputField
                    label="Email"
                    isPassword={false}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        setError("");
                    }}
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    leftIcon="mail-outline"
                />

                <InputField
                    label="Password"
                    isPassword={true}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {setPassword(text); setError("")}}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    ref={passwordRef}
                    leftIcon="lock-closed-outline"
                />

                <Link href="/(auth)/forgot-password" style={[styles.forgotPassword, { color: colors.primary }]}>Forgot Password?</Link>

                <Button
                    title="Log In"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                />


                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textLight }]}>
                        Don't have an account?
                    </Text>
                    <Link
                        href="/(auth)/register"
                        style={[styles.linkText, { color: colors.primary }]}
                    >
                        Sign Up
                    </Link>
                </View>


            </View>
        </KeyboardAvoidWrapper>
    )
}


export default LoginScreen;