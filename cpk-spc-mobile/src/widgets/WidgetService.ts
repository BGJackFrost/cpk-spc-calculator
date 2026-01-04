import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Widget data types
export interface WidgetData {
  cpk: number;
  oee: number;
  lastUpdated: string;
  lineName: string;
  productName: string;
  status: 'good' | 'warning' | 'critical';
}

// Storage keys
const WIDGET_DATA_KEY = '@widget_data';
const WIDGET_CONFIG_KEY = '@widget_config';

// Widget configuration
export interface WidgetConfig {
  selectedLineId: string;
  selectedProductId: string;
  refreshInterval: number; // in minutes
  showCpk: boolean;
  showOee: boolean;
}

// Default configuration
const defaultConfig: WidgetConfig = {
  selectedLineId: '',
  selectedProductId: '',
  refreshInterval: 15,
  showCpk: true,
  showOee: true,
};

// Get widget configuration
export const getWidgetConfig = async (): Promise<WidgetConfig> => {
  try {
    const config = await AsyncStorage.getItem(WIDGET_CONFIG_KEY);
    return config ? JSON.parse(config) : defaultConfig;
  } catch (error) {
    console.error('Error getting widget config:', error);
    return defaultConfig;
  }
};

// Save widget configuration
export const saveWidgetConfig = async (config: WidgetConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(config));
    // Trigger widget update
    await updateWidget();
  } catch (error) {
    console.error('Error saving widget config:', error);
  }
};

// Get widget data
export const getWidgetData = async (): Promise<WidgetData | null> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting widget data:', error);
    return null;
  }
};

// Save widget data
export const saveWidgetData = async (data: WidgetData): Promise<void> => {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving widget data:', error);
  }
};

// Fetch and update widget data from API
export const fetchWidgetData = async (apiBaseUrl: string): Promise<WidgetData | null> => {
  try {
    const config = await getWidgetConfig();
    
    if (!config.selectedLineId) {
      return null;
    }
    
    const response = await fetch(`${apiBaseUrl}/api/trpc/widget.getData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lineId: config.selectedLineId,
        productId: config.selectedProductId,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch widget data');
    }
    
    const result = await response.json();
    const data: WidgetData = {
      cpk: result.result.data.cpk,
      oee: result.result.data.oee,
      lastUpdated: new Date().toISOString(),
      lineName: result.result.data.lineName,
      productName: result.result.data.productName,
      status: result.result.data.cpk >= 1.33 ? 'good' : result.result.data.cpk >= 1.0 ? 'warning' : 'critical',
    };
    
    await saveWidgetData(data);
    return data;
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return null;
  }
};

// Update widget (platform-specific)
export const updateWidget = async (): Promise<void> => {
  const data = await getWidgetData();
  
  if (Platform.OS === 'android') {
    // Android widget update using SharedPreferences
    // This would be handled by native module
    console.log('Updating Android widget with data:', data);
  } else if (Platform.OS === 'ios') {
    // iOS widget update using WidgetKit
    // This would be handled by native module
    console.log('Updating iOS widget with data:', data);
  }
};

// Schedule background widget updates
export const scheduleWidgetUpdates = async (apiBaseUrl: string): Promise<void> => {
  const config = await getWidgetConfig();
  
  // Set up background task for widget updates
  // This would use expo-background-fetch or similar
  console.log(`Scheduling widget updates every ${config.refreshInterval} minutes`);
};

export default {
  getWidgetConfig,
  saveWidgetConfig,
  getWidgetData,
  saveWidgetData,
  fetchWidgetData,
  updateWidget,
  scheduleWidgetUpdates,
};
