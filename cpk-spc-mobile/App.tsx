import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';

// Screens
import DashboardScreen from './src/screens/Dashboard';
import ChartsScreen from './src/screens/Charts';
import AlertsScreen from './src/screens/Alerts';
import SettingsScreen from './src/screens/Settings';
import NotificationSettingsScreen from './src/screens/NotificationSettings';
import ChartDetailScreen from './src/screens/ChartDetail';

export type RootStackParamList = {
  Main: undefined;
  ChartDetail: { chartType: string; title: string };
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Charts: undefined;
  Alerts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Charts':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Alerts':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#3b82f6',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Tổng quan' }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{ title: 'Biểu đồ' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: 'Cảnh báo' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
    </Tab.Navigator>
  );
}

// App Navigator with Notification handling
function AppNavigator() {
  const { showLocalNotification } = useNotifications();

  useEffect(() => {
    // Handle notification received while app is in foreground
    const handleNotification = (notification: Notifications.Notification) => {
      console.log('Notification received:', notification);
      // You can show an in-app alert or update UI here
    };

    // Handle notification response (user tapped notification)
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);
      
      // Navigate based on notification type
      // You can use navigation ref here to navigate to specific screens
    };

    // These are handled in NotificationProvider, but you can add additional logic here
  }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChartDetail"
        component={ChartDetailScreen}
        options={({ route }) => ({
          title: route.params.title,
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#ffffff',
        })}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Cài đặt thông báo',
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App
export default function App() {
  return (
    <NotificationProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </NotificationProvider>
  );
}
