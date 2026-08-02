
import SafeScreen from "@/components/SafeScreen";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";



const IndexScreen = () => {

    const {user, isLoading} = useAuth();

    useEffect(() =>{
        if(!isLoading){
            if(user){
                console.log("I got here")
                router.replace("/(tabs)")
            } else {
                router.replace("/(auth)/login")
            }
        }
    }, [user, isLoading])


    return (
        <SafeScreen>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        </SafeScreen>
    );
}


export default IndexScreen;