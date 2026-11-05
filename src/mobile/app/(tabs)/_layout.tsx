/**
 * Tab navigation for the authenticated section of the app.
 *
 * Matches the approved Dashboard V1.5 bottom bar: five fixed tabs, emerald
 * active tint, muted blue-gray inactive tint, white background, and a thin
 * top border. Expo Router owns the navigation; the dashboard never renders a
 * second tab bar.
 */

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

/** Approved active tab color. */
const ACTIVE_TINT = '#0B7956';
/** Approved inactive tab color. */
const INACTIVE_TINT = '#7588A9';

/**
 * Render the five-tab authenticated navigator.
 *
 * @returns {JSX.Element} The tab navigator.
 */
const TabLayout = () => (
    <Tabs
        screenOptions={{
            tabBarActiveTintColor: ACTIVE_TINT,
            tabBarInactiveTintColor: INACTIVE_TINT,
            tabBarLabelStyle: { fontSize: 12 },
            tabBarItemStyle: { paddingVertical: 4 },
            tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopColor: '#EDF0F5',
                borderTopWidth: 1,
            },
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#12213A',
        }}
    >
        <Tabs.Screen
            name="index"
            options={{
                title: 'Home',
                headerShown: false,
                tabBarIcon: ({ focused, color }) => (
                    <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                ),
            }}
        />
        <Tabs.Screen
            name="transactions"
            options={{
                title: 'Transactions',
                headerShown: false,
                tabBarIcon: ({ focused, color }) => (
                    <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
                ),
            }}
        />
        <Tabs.Screen
            name="budgets"
            options={{
                title: 'Planning',
                headerShown: false,
                tabBarIcon: ({ focused, color }) => (
                    <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
                ),
            }}
        />
        <Tabs.Screen
            name="goals"
            options={{
                title: 'Teams',
                headerShown: false,
                tabBarIcon: ({ focused, color }) => (
                    <Ionicons
                        name={focused ? 'people' : 'people-outline'}
                        size={22}
                        color={color}
                    />
                ),
            }}
        />
        <Tabs.Screen
            name="profile"
            options={{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({ focused, color }) => (
                    <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                ),
            }}
        />
    </Tabs>
);

export default TabLayout;
