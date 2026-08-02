import useTheme from "@/hooks/useTheme";
import { StyleSheet, Text, View } from 'react-native';


interface AvatarProps {
    firstName?: string;
    lastName?: string;
    size?: number;
}

const Avatar = ({ firstName, lastName, size=40 }: AvatarProps) => {
    const { colors } = useTheme();
    
    const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

    return (
        <View style={[
            styles.container,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.primary,
            },
        ]}
        >
            <Text 
                style={[
                    styles.text,
                    {
                        fontSize: size * 0.4,
                        color: colors.white
                    }
                ]}
                >{initials}</Text>
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center"
    },
    text: {
        fontWeight: "700"
    }
});


export default Avatar;