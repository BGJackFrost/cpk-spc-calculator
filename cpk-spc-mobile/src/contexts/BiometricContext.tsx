import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  BiometricSettings,
  BiometricAuthResult,
  isBiometricSupported,
  isBiometricEnrolled,
  getAvailableBiometricTypes,
  getBiometricTypeName,
  getBiometricSettings,
  saveBiometricSettings,
  enableBiometric,
  disableBiometric,
  authenticateWithBiometric,
  shouldLockApp,
  updateLastActiveTimestamp,
} from '../services/biometricAuth';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricContextType {
  // State
  isSupported: boolean;
  isEnrolled: boolean;
  settings: BiometricSettings;
  isLocked: boolean;
  isLoading: boolean;
  availableTypes: LocalAuthentication.AuthenticationType[];
  
  // Actions
  enableBiometricAuth: () => Promise<BiometricAuthResult>;
  disableBiometricAuth: () => Promise<void>;
  updateSettings: (settings: Partial<BiometricSettings>) => Promise<void>;
  authenticate: (promptMessage?: string) => Promise<BiometricAuthResult>;
  unlock: () => void;
  checkAndLock: () => Promise<void>;
  
  // Helpers
  getBiometricName: () => string;
}

const BiometricContext = createContext<BiometricContextType | undefined>(undefined);

interface BiometricProviderProps {
  children: ReactNode;
  onLock?: () => void;
  onUnlock?: () => void;
}

export const BiometricProvider: React.FC<BiometricProviderProps> = ({
  children,
  onLock,
  onUnlock,
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [settings, setSettings] = useState<BiometricSettings>({
    enabled: false,
    appLockEnabled: false,
    biometricType: null,
    lockTimeoutMinutes: 5,
  });
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableTypes, setAvailableTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Initialize biometric state
  useEffect(() => {
    const initialize = async () => {
      try {
        const [supported, enrolled, types, savedSettings] = await Promise.all([
          isBiometricSupported(),
          isBiometricEnrolled(),
          getAvailableBiometricTypes(),
          getBiometricSettings(),
        ]);

        setIsSupported(supported);
        setIsEnrolled(enrolled);
        setAvailableTypes(types);
        setSettings(savedSettings);

        // Check if app should be locked on startup
        if (savedSettings.enabled && savedSettings.appLockEnabled) {
          const shouldLock = await shouldLockApp();
          if (shouldLock) {
            setIsLocked(true);
            onLock?.();
          }
        }
      } catch (error) {
        console.error('Error initializing biometric:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Handle app state changes for auto-lock
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // App coming to foreground
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (settings.enabled && settings.appLockEnabled) {
          const shouldLock = await shouldLockApp();
          if (shouldLock) {
            setIsLocked(true);
            onLock?.();
          }
        }
      }
      
      // App going to background - update last active time
      if (nextAppState.match(/inactive|background/) && appState === 'active') {
        await updateLastActiveTimestamp();
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appState, settings, onLock]);

  // Enable biometric authentication
  const enableBiometricAuth = useCallback(async (): Promise<BiometricAuthResult> => {
    setIsLoading(true);
    try {
      const result = await enableBiometric();
      if (result.success) {
        const newSettings = await getBiometricSettings();
        setSettings(newSettings);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disable biometric authentication
  const disableBiometricAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await disableBiometric();
      setSettings({
        enabled: false,
        appLockEnabled: false,
        biometricType: null,
        lockTimeoutMinutes: 5,
      });
      setIsLocked(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<BiometricSettings>): Promise<void> => {
    try {
      await saveBiometricSettings(newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error updating biometric settings:', error);
      throw error;
    }
  }, []);

  // Authenticate
  const authenticate = useCallback(async (promptMessage?: string): Promise<BiometricAuthResult> => {
    const result = await authenticateWithBiometric(promptMessage);
    if (result.success) {
      await updateLastActiveTimestamp();
    }
    return result;
  }, []);

  // Unlock app
  const unlock = useCallback(() => {
    setIsLocked(false);
    updateLastActiveTimestamp();
    onUnlock?.();
  }, [onUnlock]);

  // Check and lock if needed
  const checkAndLock = useCallback(async () => {
    if (settings.enabled && settings.appLockEnabled) {
      const shouldLock = await shouldLockApp();
      if (shouldLock) {
        setIsLocked(true);
        onLock?.();
      }
    }
  }, [settings, onLock]);

  // Get biometric name
  const getBiometricName = useCallback(() => {
    return getBiometricTypeName(settings.biometricType);
  }, [settings.biometricType]);

  const value: BiometricContextType = {
    isSupported,
    isEnrolled,
    settings,
    isLocked,
    isLoading,
    availableTypes,
    enableBiometricAuth,
    disableBiometricAuth,
    updateSettings,
    authenticate,
    unlock,
    checkAndLock,
    getBiometricName,
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometric = (): BiometricContextType => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
};

export default BiometricContext;
