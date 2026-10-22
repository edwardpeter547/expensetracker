import Button from "@/components/ui/Button";
import InputField from "@/components/ui/Input";
import KeyboardAvoidWrapper from "@/components/ui/KeyboardAvoidWrapper";
import Logo from "@/components/ui/Logo";
import { useAuth } from "@/hooks/useAuth";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { Text, View } from "react-native";




const RegisterScreen = () => {

    const { colors } = useTheme();
    const Styles = useStyles('auth');
    const {register} = useAuth();

    const [email, setEmail] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [firstname, setFirstname] = useState<string>("");
    const [lastname, setLastname] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const firstnameRef = useRef<any>(null);
    const lastnameRef = useRef<any>(null);
    const usernameRef = useRef<any>(null);
    const emailRef = useRef<any>(null);
    const passwordRef = useRef<any>(null);

    const handleRegister = async () => {

        if(!email.trim()){
            setError("Please enter your email address");
            return;
        }

        if(!username.trim()){
            setError("Please enter your username");
            return;
        }

        if(!firstname.trim()){
            setError("Please enter your firstname");
            return;
        }

        if(!lastname.trim()){
            setError("Please enter your lastname");
            return;
        }

        if(!password.trim()){
            setError("Please enter your password");
            return;
        }

        setLoading(true),
        setError("");

        try {
            console.log("Lastname: ", lastname);
            await register({
                email: email,
                firstName: firstname,
                lastName: lastname,
                username: username,
                password: password
            });
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
            <View style={Styles.container}>
                <Logo />
                {error ? (
                    <View style={Styles.errorBox}>
                        <Ionicons name="alert-circle" size={20} color={colors.expense} />
                        <Text style={[Styles.errorText, { color: colors.text }]}>{error}</Text>
                    </View>
                ) : null}
                <InputField
                    label="Firstname"
                    isPassword={false}
                    placeholder="Firstname"
                    value={firstname}
                    onChangeText={(text) => {
                        setFirstname(text);
                        setError("");
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => {lastnameRef.current?.focus()}}
                    ref={firstnameRef}
                    leftIcon="person-outline"
                />
                <InputField
                    label="Lastname"
                    isPassword={false}
                    placeholder="Lastname"
                    value={lastname}
                    onChangeText={(text) => {
                        setLastname(text);
                        setError("");
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => usernameRef.current?.focus()}
                    ref={lastnameRef}
                    leftIcon="person-outline"
                />

                <InputField
                    label="Username"
                    isPassword={false}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                        setUsername(text);
                        setError("");
                    }}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    ref={usernameRef}
                    leftIcon="person-outline"
                />

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
                    ref={emailRef}
                    leftIcon="mail-outline"
                />

                <InputField
                    label="Password"
                    isPassword={true}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {setPassword(text); setError("")}}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    ref={passwordRef}
                    leftIcon="lock-closed-outline"
                />
                
                <Button
                    title="Register"
                    onPress={handleRegister}
                    loading={loading}
                    disabled={loading}
                />


                <View style={Styles.footer}>
                    <Text style={[Styles.footerText, { color: colors.textLight }]}>
                        Already have an account?
                    </Text>
                    <Link
                        href="/(auth)/login"
                        style={[Styles.linkText, { color: colors.primary }]}
                    >
                        Sign In
                    </Link>
                </View>
            </View>
        </KeyboardAvoidWrapper>
    )

}

export default RegisterScreen;