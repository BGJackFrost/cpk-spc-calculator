import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  authenticateWithBiometric,
  getBiometricSettings,
  getBiometricTypeName,
  BiometricSettings,
} from '../services/biometricAuth';

const { width, height } = Dimensions.get('window');

interface BiometricLockProps {
  onUnlock: () => void;
  onCancel?: () => void;
}

const BiometricLock: React.FC<BiometricLockProps> = ({ onUnlock, onCancel }) => {
  const [settings, setSettings] = useState<BiometricSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const biometricSettings = await getBiometricSettings();
      setSettings(biometricSettings);
    };
    loadSettings();
  }, []);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-authenticate on mount
  useEffect(() => {
    const autoAuth = async () => {
      // Wait for animation and settings to load
      await new Promise(resolve => setTimeout(resolve, 500));
      handleAuthenticate();
    };
    autoAuth();
  }, []);

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticateWithBiometric('Xác thực để mở khóa ứng dụng');
      
      if (result.success) {
        // Success animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onUnlock();
        });
      } else {
        setError(result.error || 'Xác thực thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, onUnlock, fadeAnim, scaleAnim]);

  const biometricIcon = settings?.biometricType === 1 ? 'finger-print' : 'scan';
  const biometricName = getBiometricTypeName(settings?.biometricType ?? null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />
      
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="analytics" size={48} color="#ffffff" />
          </View>
          <Text style={styles.appName}>CPK SPC Calculator</Text>
        </View>

        {/* Lock Icon */}
        <View style={styles.lockSection}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              isAuthenticating && styles.biometricButtonActive,
            ]}
            onPress={handleAuthenticate}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            <Ionicons
              name={biometricIcon as any}
              size={64}
              color={isAuthenticating ? '#93c5fd' : '#ffffff'}
            />
          </TouchableOpacity>
          
          <Text style={styles.biometricText}>
            {isAuthenticating ? 'Đang xác thực...' : `Nhấn để sử dụng ${biometricName}`}
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Retry Button */}
        {error && !isAuthenticating && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleAuthenticate}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button (optional) */}
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <View style={styles.decorationLine} />
        <Text style={styles.securityText}>
          <Ionicons name="shield-checkmark" size={14} color="#64748b" />
          {' '}Được bảo vệ bởi xác thực sinh trắc học
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#1e3a5f',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  lockSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  biometricButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  biometricButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderColor: '#3b82f6',
  },
  biometricText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 16,
    color: '#64748b',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  decorationLine: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default BiometricLock;
