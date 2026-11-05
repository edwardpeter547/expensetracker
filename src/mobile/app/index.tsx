
import { brandColors } from "@/constants/designTokens";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";



const IndexScreen = () => {

    const {user, isLoading} = useAuth();

    useEffect(() =>{
        if(!isLoading){
            if(user){
                router.replace("/(tabs)")
            } else {
                router.replace("/welcome")
            }
        }
    }, [user, isLoading])


    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: brandColors.background }}>
            <ActivityIndicator size="large" color={brandColors.primary} />
        </View>
    );
}


export default IndexScreen;
