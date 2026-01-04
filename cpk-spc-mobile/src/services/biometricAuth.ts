import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TYPE_KEY = 'biometric_type';
const APP_LOCK_ENABLED_KEY = 'app_lock_enabled';
const LAST_ACTIVE_KEY = 'last_active_timestamp';
const LOCK_TIMEOUT_KEY = 'lock_timeout_minutes';

// Default lock timeout (5 minutes)
const DEFAULT_LOCK_TIMEOUT = 5;

export interface BiometricSettings {
  enabled: boolean;
  appLockEnabled: boolean;
  biometricType: LocalAuthentication.AuthenticationType | null;
  lockTimeoutMinutes: number;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Check if device supports biometric authentication
 */
export const isBiometricSupported = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
};

/**
 * Check if biometric is enrolled (user has set up Face ID/Touch ID)
 */
export const isBiometricEnrolled = async (): Promise<boolean> => {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric enrollment:', error);
    return false;
  }
};

/**
 * Get available biometric types
 */
export const getAvailableBiometricTypes = async (): Promise<LocalAuthentication.AuthenticationType[]> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types;
  } catch (error) {
    console.error('Error getting biometric types:', error);
    return [];
  }
};

/**
 * Get human-readable biometric type name
 */
export const getBiometricTypeName = (type: LocalAuthentication.AuthenticationType | null): string => {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'Face ID';
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'Touch ID / Vân tay';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'Iris';
    default:
      return 'Sinh trắc học';
  }
};

/**
 * Authenticate using biometric
 */
export const authenticateWithBiometric = async (
  promptMessage: string = 'Xác thực để tiếp tục'
): Promise<BiometricAuthResult> => {
  try {
    // Check if biometric is available
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return {
        success: false,
        error: 'Thiết bị không hỗ trợ xác thực sinh trắc học',
      };
    }

    // Check if biometric is enrolled
    const isEnrolled = await isBiometricEnrolled();
    if (!isEnrolled) {
      return {
        success: false,
        error: 'Chưa cài đặt Face ID/Touch ID trên thiết bị',
        warning: 'Vui lòng cài đặt trong Cài đặt hệ thống',
      };
    }

    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Hủy',
      fallbackLabel: 'Sử dụng mật khẩu',
      disableDeviceFallback: false,
    });

    if (result.success) {
      // Update last active timestamp
      await updateLastActiveTimestamp();
      return { success: true };
    }

    // Handle different error types
    if (result.error === 'user_cancel') {
      return { success: false, error: 'Đã hủy xác thực' };
    }
    if (result.error === 'user_fallback') {
      return { success: false, error: 'Người dùng chọn phương thức khác' };
    }
    if (result.error === 'lockout') {
      return { 
        success: false, 
        error: 'Quá nhiều lần thử không thành công. Vui lòng thử lại sau.' 
      };
    }

    return { success: false, error: result.error || 'Xác thực thất bại' };
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return { success: false, error: error.message || 'Lỗi xác thực' };
  }
};

/**
 * Get biometric settings
 */
export const getBiometricSettings = async (): Promise<BiometricSettings> => {
  try {
    const [enabledStr, appLockStr, typeStr, timeoutStr] = await Promise.all([
      AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY),
      AsyncStorage.getItem(APP_LOCK_ENABLED_KEY),
      AsyncStorage.getItem(BIOMETRIC_TYPE_KEY),
      AsyncStorage.getItem(LOCK_TIMEOUT_KEY),
    ]);

    return {
      enabled: enabledStr === 'true',
      appLockEnabled: appLockStr === 'true',
      biometricType: typeStr ? parseInt(typeStr, 10) : null,
      lockTimeoutMinutes: timeoutStr ? parseInt(timeoutStr, 10) : DEFAULT_LOCK_TIMEOUT,
    };
  } catch (error) {
    console.error('Error getting biometric settings:', error);
    return {
      enabled: false,
      appLockEnabled: false,
      biometricType: null,
      lockTimeoutMinutes: DEFAULT_LOCK_TIMEOUT,
    };
  }
};

/**
 * Save biometric settings
 */
export const saveBiometricSettings = async (settings: Partial<BiometricSettings>): Promise<void> => {
  try {
    const promises: Promise<void>[] = [];

    if (settings.enabled !== undefined) {
      promises.push(AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(settings.enabled)));
    }
    if (settings.appLockEnabled !== undefined) {
      promises.push(AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, String(settings.appLockEnabled)));
    }
    if (settings.biometricType !== undefined) {
      promises.push(AsyncStorage.setItem(BIOMETRIC_TYPE_KEY, String(settings.biometricType)));
    }
    if (settings.lockTimeoutMinutes !== undefined) {
      promises.push(AsyncStorage.setItem(LOCK_TIMEOUT_KEY, String(settings.lockTimeoutMinutes)));
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('Error saving biometric settings:', error);
    throw error;
  }
};

/**
 * Enable biometric authentication
 */
export const enableBiometric = async (): Promise<BiometricAuthResult> => {
  try {
    // First authenticate to confirm
    const authResult = await authenticateWithBiometric('Xác thực để bật Face ID/Touch ID');
    if (!authResult.success) {
      return authResult;
    }

    // Get available biometric type
    const types = await getAvailableBiometricTypes();
    const primaryType = types[0] || null;

    // Save settings
    await saveBiometricSettings({
      enabled: true,
      biometricType: primaryType,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error enabling biometric:', error);
    return { success: false, error: error.message || 'Không thể bật xác thực sinh trắc học' };
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<void> => {
  try {
    await saveBiometricSettings({
      enabled: false,
      appLockEnabled: false,
      biometricType: null,
    });
  } catch (error) {
    console.error('Error disabling biometric:', error);
    throw error;
  }
};

/**
 * Update last active timestamp
 */
export const updateLastActiveTimestamp = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch (error) {
    console.error('Error updating last active timestamp:', error);
  }
};

/**
 * Get last active timestamp
 */
export const getLastActiveTimestamp = async (): Promise<number> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  } catch (error) {
    console.error('Error getting last active timestamp:', error);
    return 0;
  }
};

/**
 * Check if app should be locked based on inactivity
 */
export const shouldLockApp = async (): Promise<boolean> => {
  try {
    const settings = await getBiometricSettings();
    
    // If app lock is not enabled, don't lock
    if (!settings.appLockEnabled || !settings.enabled) {
      return false;
    }

    const lastActive = await getLastActiveTimestamp();
    if (lastActive === 0) {
      return true; // First time, should lock
    }

    const now = Date.now();
    const timeoutMs = settings.lockTimeoutMinutes * 60 * 1000;
    const timeSinceActive = now - lastActive;

    return timeSinceActive > timeoutMs;
  } catch (error) {
    console.error('Error checking if app should lock:', error);
    return false;
  }
};

/**
 * Store sensitive data securely (using SecureStore)
 */
export const storeSecurely = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Error storing securely:', error);
    throw error;
  }
};

/**
 * Get sensitive data from secure storage
 */
export const getSecurely = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Error getting from secure store:', error);
    return null;
  }
};

/**
 * Delete sensitive data from secure storage
 */
export const deleteSecurely = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Error deleting from secure store:', error);
    throw error;
  }
};

/**
 * Get security level of device
 */
export const getSecurityLevel = async (): Promise<LocalAuthentication.SecurityLevel> => {
  try {
    return await LocalAuthentication.getEnrolledLevelAsync();
  } catch (error) {
    console.error('Error getting security level:', error);
    return LocalAuthentication.SecurityLevel.NONE;
  }
};

export default {
  isBiometricSupported,
  isBiometricEnrolled,
  getAvailableBiometricTypes,
  getBiometricTypeName,
  authenticateWithBiometric,
  getBiometricSettings,
  saveBiometricSettings,
  enableBiometric,
  disableBiometric,
  updateLastActiveTimestamp,
  getLastActiveTimestamp,
  shouldLockApp,
  storeSecurely,
  getSecurely,
  deleteSecurely,
  getSecurityLevel,
};
