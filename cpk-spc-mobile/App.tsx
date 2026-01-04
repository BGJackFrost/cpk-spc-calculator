import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
import { BiometricProvider, useBiometric } from './src/contexts/BiometricContext';
import { NetworkProvider, useNetwork } from './src/contexts/NetworkContext';
import { OfflineIndicatorCompact } from './src/components/OfflineIndicator';

// Screens
import DashboardScreen from './src/screens/Dashboard';
import ChartsScreen from './src/screens/Charts';
import AlertsScreen from './src/screens/Alerts';
import SettingsScreen from './src/screens/Settings';
import NotificationSettingsScreen from './src/screens/NotificationSettings';
import ChartDetailScreen from './src/screens/ChartDetail';
import BiometricLockScreen from './src/screens/BiometricLock';
import BiometricSettingsScreen from './src/screens/BiometricSettings';

export type RootStackParamList = {
  Main: undefined;
  ChartDetail: { chartType: string; title: string };
  NotificationSettings: undefined;
  BiometricSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Charts: undefined;
  Alerts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Navigator with offline indicator
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
        headerRight: () => <OfflineIndicatorCompact />,
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

// App Navigator with Biometric Lock
function AppNavigator() {
  const { showLocalNotification } = useNotifications();
  const { isLocked, unlock } = useBiometric();

  useEffect(() => {
    // Handle notification received while app is in foreground
    const handleNotification = (notification: Notifications.Notification) => {
      console.log('Notification received:', notification);
    };

    // Handle notification response (user tapped notification)
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);
    };
  }, []);

  // Show biometric lock screen if locked
  if (isLocked) {
    return <BiometricLockScreen onUnlock={unlock} />;
  }

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
      <Stack.Screen
        name="BiometricSettings"
        component={BiometricSettingsScreen}
        options={{
          title: 'Bảo mật sinh trắc học',
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App with all providers
export default function App() {
  return (
    <NetworkProvider
      onConnectionRestored={() => {
        console.log('Connection restored - syncing data...');
      }}
      onConnectionLost={() => {
        console.log('Connection lost - switching to offline mode');
      }}
    >
      <BiometricProvider
        onLock={() => {
          console.log('App locked');
        }}
        onUnlock={() => {
          console.log('App unlocked');
        }}
      >
        <NotificationProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </NotificationProvider>
      </BiometricProvider>
    </NetworkProvider>
  );
}
