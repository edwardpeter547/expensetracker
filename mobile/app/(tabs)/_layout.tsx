import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';


const TabLayout = () => {

    const { colors } = useTheme();

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textLight,
            tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
            },
            headerStyle: {
                backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
        }}>
            <Tabs.Screen
                name='index'
                options={{
                    title: "Dashboard",
                    headerShown: false,
                    tabBarIcon: ({color, size}) => (
                        <Ionicons name='home' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name='transactions'
                options={{
                    title: 'Transactions',
                    tabBarIcon: ({color, size}) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />

             <Tabs.Screen
                name="budgets"
                options={{
                    title: "Budgets",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            
        </Tabs>
    )

}

export default TabLayout;


