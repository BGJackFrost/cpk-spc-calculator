/**
 * Widget Service - Enhanced with Native Bridge Integration
 * Supports both Android AppWidgetProvider and iOS WidgetKit
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Widget data types
export interface WidgetData {
  cpk: number;
  oee: number;
  lastUpdated: string;
  lineName: string;
  productName: string;
  status: 'good' | 'warning' | 'critical' | 'error';
}

// Widget configuration
export interface WidgetConfig {
  apiUrl: string;
  selectedLineId: string;
  selectedProductId: string;
  lineName: string;
  productName: string;
  refreshInterval: number; // in minutes
  showCpk: boolean;
  showOee: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Storage keys
const WIDGET_DATA_KEY = '@widget_data';
const WIDGET_CONFIG_KEY = '@widget_config';
const WIDGET_BACKGROUND_TASK = 'cpk-widget-background-update';

// Native module interface
interface NativeWidgetModule {
  configureWidget(config: string): Promise<boolean>;
  updateWidgetData(data: string): Promise<boolean>;
  requestWidgetUpdate(): Promise<boolean>;
  isWidgetSupported(): Promise<boolean>;
  getInstalledWidgets(): Promise<string[]>;
}

// Get native module
const NativeWidget: NativeWidgetModule | null = 
  NativeModules.CpkWidgetModule || null;

// Event emitter for widget events
let widgetEventEmitter: NativeEventEmitter | null = null;
if (NativeWidget && NativeModules.CpkWidgetModule) {
  widgetEventEmitter = new NativeEventEmitter(NativeModules.CpkWidgetModule);
}

// Default configuration
const defaultConfig: WidgetConfig = {
  apiUrl: '',
  selectedLineId: '',
  selectedProductId: '',
  lineName: '',
  productName: '',
  refreshInterval: 15,
  showCpk: true,
  showOee: true,
  theme: 'auto',
};

// ============ Widget Support Check ============

/**
 * Check if widgets are supported on this device
 */
export async function isWidgetSupported(): Promise<boolean> {
  if (NativeWidget) {
    try {
      return await NativeWidget.isWidgetSupported();
    } catch {
      return false;
    }
  }
  // Fallback: assume supported on iOS 14+ and Android 4.0+
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Get list of installed widgets
 */
export async function getInstalledWidgets(): Promise<string[]> {
  if (NativeWidget) {
    try {
      return await NativeWidget.getInstalledWidgets();
    } catch {
      return [];
    }
  }
  return [];
}

// ============ Configuration Management ============

/**
 * Get widget configuration
 */
export async function getWidgetConfig(): Promise<WidgetConfig> {
  try {
    const config = await AsyncStorage.getItem(WIDGET_CONFIG_KEY);
    return config ? { ...defaultConfig, ...JSON.parse(config) } : defaultConfig;
  } catch (error) {
    console.error('[Widget] Error getting config:', error);
    return defaultConfig;
  }
}

/**
 * Save widget configuration
 */
export async function saveWidgetConfig(config: Partial<WidgetConfig>): Promise<boolean> {
  try {
    const currentConfig = await getWidgetConfig();
    const newConfig = { ...currentConfig, ...config };
    
    await AsyncStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(newConfig));
    
    // Send to native module
    if (NativeWidget) {
      await NativeWidget.configureWidget(JSON.stringify(newConfig));
    }
    
    // Trigger widget update
    await updateWidget();
    
    return true;
  } catch (error) {
    console.error('[Widget] Error saving config:', error);
    return false;
  }
}

// ============ Data Management ============

/**
 * Get widget data
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Widget] Error getting data:', error);
    return null;
  }
}

/**
 * Save widget data
 */
export async function saveWidgetData(data: WidgetData): Promise<boolean> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
    
    // Send to native module
    if (NativeWidget) {
      await NativeWidget.updateWidgetData(JSON.stringify(data));
    }
    
    return true;
  } catch (error) {
    console.error('[Widget] Error saving data:', error);
    return false;
  }
}

/**
 * Fetch and update widget data from API
 */
export async function fetchWidgetData(apiBaseUrl?: string): Promise<WidgetData | null> {
  try {
    const config = await getWidgetConfig();
    const baseUrl = apiBaseUrl || config.apiUrl;
    
    if (!baseUrl || !config.selectedLineId) {
      console.log('[Widget] Missing API URL or line ID');
      return null;
    }
    
    const response = await fetch(`${baseUrl}/api/trpc/widget.getData`, {
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
      throw new Error(`Failed to fetch widget data: ${response.status}`);
    }
    
    const result = await response.json();
    const resultData = result.result?.data || result.data;
    
    if (!resultData) {
      throw new Error('Invalid response format');
    }
    
    const data: WidgetData = {
      cpk: resultData.cpk ?? 0,
      oee: resultData.oee ?? 0,
      lastUpdated: new Date().toISOString(),
      lineName: resultData.lineName || config.lineName || 'Unknown',
      productName: resultData.productName || config.productName || '',
      status: getCpkStatus(resultData.cpk ?? 0),
    };
    
    await saveWidgetData(data);
    return data;
  } catch (error) {
    console.error('[Widget] Error fetching data:', error);
    
    // Return error state
    const errorData: WidgetData = {
      cpk: 0,
      oee: 0,
      lastUpdated: new Date().toISOString(),
      lineName: 'Error',
      productName: '',
      status: 'error',
    };
    await saveWidgetData(errorData);
    return errorData;
  }
}

// ============ Widget Update ============

/**
 * Update widget (platform-specific)
 */
export async function updateWidget(): Promise<boolean> {
  const data = await getWidgetData();
  
  if (!data) {
    console.log('[Widget] No data to update');
    return false;
  }
  
  if (NativeWidget) {
    try {
      return await NativeWidget.requestWidgetUpdate();
    } catch (error) {
      console.error('[Widget] Error requesting update:', error);
      return false;
    }
  }
  
  // Log for development
  if (Platform.OS === 'android') {
    console.log('[Widget] Android widget update triggered:', data);
  } else if (Platform.OS === 'ios') {
    console.log('[Widget] iOS widget update triggered:', data);
  }
  
  return true;
}

/**
 * Force refresh widget data
 */
export async function forceRefresh(apiBaseUrl?: string): Promise<WidgetData | null> {
  const data = await fetchWidgetData(apiBaseUrl);
  if (data) {
    await updateWidget();
  }
  return data;
}

// ============ Background Updates ============

/**
 * Define background task for widget updates
 */
TaskManager.defineTask(WIDGET_BACKGROUND_TASK, async () => {
  try {
    console.log('[Widget] Background update started');
    const data = await fetchWidgetData();
    
    if (data && data.status !== 'error') {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Widget] Background update error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background widget updates
 */
export async function registerBackgroundUpdates(): Promise<boolean> {
  try {
    const config = await getWidgetConfig();
    const intervalMinutes = Math.max(config.refreshInterval, 15); // Minimum 15 minutes
    
    await BackgroundFetch.registerTaskAsync(WIDGET_BACKGROUND_TASK, {
      minimumInterval: intervalMinutes * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log(`[Widget] Background updates registered (${intervalMinutes} min interval)`);
    return true;
  } catch (error) {
    console.error('[Widget] Error registering background updates:', error);
    return false;
  }
}

/**
 * Unregister background widget updates
 */
export async function unregisterBackgroundUpdates(): Promise<boolean> {
  try {
    await BackgroundFetch.unregisterTaskAsync(WIDGET_BACKGROUND_TASK);
    console.log('[Widget] Background updates unregistered');
    return true;
  } catch (error) {
    console.error('[Widget] Error unregistering background updates:', error);
    return false;
  }
}

// ============ Event Handling ============

/**
 * Subscribe to widget events
 */
export function subscribeToWidgetEvents(
  callback: (event: { type: string; data?: any }) => void
): () => void {
  if (!widgetEventEmitter) {
    return () => {};
  }
  
  const subscription = widgetEventEmitter.addListener('onWidgetEvent', callback);
  return () => subscription.remove();
}

// ============ Helper Functions ============

/**
 * Get CPK status from value
 */
export function getCpkStatus(cpk: number): 'good' | 'warning' | 'critical' {
  if (cpk >= 1.33) return 'good';
  if (cpk >= 1.0) return 'warning';
  return 'critical';
}

/**
 * Get status color
 */
export function getStatusColor(status: WidgetData['status']): string {
  switch (status) {
    case 'good': return '#22c55e';
    case 'warning': return '#f59e0b';
    case 'critical': return '#ef4444';
    case 'error': return '#6b7280';
    default: return '#6b7280';
  }
}

/**
 * Get platform-specific widget setup instructions
 */
export function getWidgetSetupInstructions(): {
  platform: string;
  steps: string[];
  supported: boolean;
} {
  if (Platform.OS === 'ios') {
    return {
      platform: 'iOS',
      supported: true,
      steps: [
        '1. Nhấn giữ trên màn hình chính',
        '2. Chạm nút "+" ở góc trên bên trái',
        '3. Tìm kiếm "CPK/SPC Monitor"',
        '4. Chọn kích thước widget (nhỏ, vừa, hoặc lớn)',
        '5. Chạm "Thêm Widget"',
        '6. Cấu hình dây chuyền/sản phẩm trong cài đặt app',
      ],
    };
  } else if (Platform.OS === 'android') {
    return {
      platform: 'Android',
      supported: true,
      steps: [
        '1. Nhấn giữ trên màn hình chính',
        '2. Chạm "Widgets"',
        '3. Tìm widget "CPK/SPC Monitor"',
        '4. Kéo vào màn hình chính',
        '5. Chọn dây chuyền/sản phẩm để theo dõi',
        '6. Chạm "Xong" để lưu',
      ],
    };
  }
  
  return {
    platform: 'Unknown',
    supported: false,
    steps: ['Widgets không được hỗ trợ trên nền tảng này'],
  };
}

export default {
  isWidgetSupported,
  getInstalledWidgets,
  getWidgetConfig,
  saveWidgetConfig,
  getWidgetData,
  saveWidgetData,
  fetchWidgetData,
  updateWidget,
  forceRefresh,
  registerBackgroundUpdates,
  unregisterBackgroundUpdates,
  subscribeToWidgetEvents,
  getCpkStatus,
  getStatusColor,
  getWidgetSetupInstructions,
};
