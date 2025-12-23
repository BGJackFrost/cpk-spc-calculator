/**
 * Alert Sound Service
 * Manages notification sounds for different SPC/OEE alert types
 */

// Alert categories
export type SpcAlertType = 
  | 'cpk_low'           // CPK < 1.33
  | 'cpk_critical'      // CPK < 1.0
  | 'rule_violation'    // SPC rule violation
  | 'trend_detected'    // Trend pattern detected
  | 'shift_detected'    // Shift pattern detected
  | 'out_of_spec';      // Value out of specification

export type OeeAlertType = 
  | 'availability_low'   // Availability below threshold
  | 'performance_low'    // Performance below threshold
  | 'quality_low'        // Quality below threshold
  | 'oee_critical'       // OEE below critical threshold
  | 'downtime_start'     // Machine downtime started
  | 'downtime_extended'; // Extended downtime

export type SystemAlertType = 
  | 'connection_lost'
  | 'connection_restored'
  | 'sync_conflict'
  | 'sync_complete'
  | 'backup_complete';

export type AlertType = SpcAlertType | OeeAlertType | SystemAlertType | 'general';

// Sound configuration
export interface SoundConfig {
  frequency: number;
  duration: number;
  pattern?: number[];
  waveType?: OscillatorType;
  volume?: number;
}

// Alert sound mapping
const ALERT_SOUND_MAP: Record<AlertType, SoundConfig> = {
  // SPC Alerts - More urgent sounds
  cpk_low: {
    frequency: 600,
    duration: 300,
    pattern: [600, 700, 600],
    waveType: 'sine'
  },
  cpk_critical: {
    frequency: 400,
    duration: 400,
    pattern: [400, 500, 400, 500, 400],
    waveType: 'square',
    volume: 0.4
  },
  rule_violation: {
    frequency: 500,
    duration: 250,
    pattern: [500, 600, 500],
    waveType: 'sine'
  },
  trend_detected: {
    frequency: 700,
    duration: 200,
    pattern: [700, 800, 900],
    waveType: 'sine'
  },
  shift_detected: {
    frequency: 650,
    duration: 200,
    pattern: [650, 750, 650],
    waveType: 'sine'
  },
  out_of_spec: {
    frequency: 350,
    duration: 500,
    pattern: [350, 450, 350, 450],
    waveType: 'sawtooth',
    volume: 0.35
  },

  // OEE Alerts - Moderate urgency
  availability_low: {
    frequency: 550,
    duration: 250,
    pattern: [550, 650],
    waveType: 'sine'
  },
  performance_low: {
    frequency: 600,
    duration: 250,
    pattern: [600, 700],
    waveType: 'sine'
  },
  quality_low: {
    frequency: 500,
    duration: 250,
    pattern: [500, 600],
    waveType: 'sine'
  },
  oee_critical: {
    frequency: 400,
    duration: 350,
    pattern: [400, 500, 400, 500],
    waveType: 'square',
    volume: 0.35
  },
  downtime_start: {
    frequency: 450,
    duration: 300,
    pattern: [450, 350, 450],
    waveType: 'sine'
  },
  downtime_extended: {
    frequency: 380,
    duration: 400,
    pattern: [380, 480, 380, 480],
    waveType: 'square',
    volume: 0.35
  },

  // System Alerts - Informational sounds
  connection_lost: {
    frequency: 300,
    duration: 400,
    pattern: [400, 300, 200],
    waveType: 'sine'
  },
  connection_restored: {
    frequency: 800,
    duration: 150,
    pattern: [600, 800, 1000],
    waveType: 'sine'
  },
  sync_conflict: {
    frequency: 500,
    duration: 200,
    pattern: [500, 400, 500],
    waveType: 'triangle'
  },
  sync_complete: {
    frequency: 1000,
    duration: 100,
    pattern: [800, 1000, 1200],
    waveType: 'sine'
  },
  backup_complete: {
    frequency: 900,
    duration: 100,
    pattern: [700, 900],
    waveType: 'sine'
  },

  // General
  general: {
    frequency: 800,
    duration: 200,
    waveType: 'sine'
  }
};

// User preferences storage key
const ALERT_SOUND_PREFS_KEY = 'cpk_spc_alert_sound_prefs';

// User preferences interface
export interface AlertSoundPreferences {
  enabled: boolean;
  globalVolume: number;
  alertOverrides: Partial<Record<AlertType, {
    enabled: boolean;
    volume?: number;
    soundConfig?: Partial<SoundConfig>;
  }>>;
}

// Default preferences
const DEFAULT_PREFERENCES: AlertSoundPreferences = {
  enabled: true,
  globalVolume: 70,
  alertOverrides: {}
};

class AlertSoundService {
  private audioContext: AudioContext | null = null;
  private preferences: AlertSoundPreferences = DEFAULT_PREFERENCES;
  private isInitialized = false;

  constructor() {
    this.loadPreferences();
  }

  // Initialize audio context (must be called after user interaction)
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Load preferences from localStorage
  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem(ALERT_SOUND_PREFS_KEY);
      if (saved) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('[AlertSoundService] Error loading preferences:', e);
    }
    this.isInitialized = true;
  }

  // Save preferences to localStorage
  savePreferences(prefs: Partial<AlertSoundPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    try {
      localStorage.setItem(ALERT_SOUND_PREFS_KEY, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('[AlertSoundService] Error saving preferences:', e);
    }
  }

  // Get current preferences
  getPreferences(): AlertSoundPreferences {
    return { ...this.preferences };
  }

  // Check if sound is enabled for alert type
  isEnabledForAlert(alertType: AlertType): boolean {
    if (!this.preferences.enabled) return false;
    
    const override = this.preferences.alertOverrides[alertType];
    if (override && override.enabled === false) return false;
    
    return true;
  }

  // Get effective volume for alert type
  private getEffectiveVolume(alertType: AlertType): number {
    const baseVolume = this.preferences.globalVolume / 100;
    const override = this.preferences.alertOverrides[alertType];
    
    if (override?.volume !== undefined) {
      return (override.volume / 100) * baseVolume;
    }
    
    const soundConfig = ALERT_SOUND_MAP[alertType];
    if (soundConfig.volume !== undefined) {
      return soundConfig.volume * baseVolume;
    }
    
    return baseVolume * 0.3; // Default 30% of global volume
  }

  // Get effective sound config for alert type
  private getEffectiveSoundConfig(alertType: AlertType): SoundConfig {
    const baseConfig = ALERT_SOUND_MAP[alertType] || ALERT_SOUND_MAP.general;
    const override = this.preferences.alertOverrides[alertType]?.soundConfig;
    
    if (override) {
      return { ...baseConfig, ...override };
    }
    
    return baseConfig;
  }

  // Play a single tone
  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    waveType: OscillatorType,
    startTime: number
  ): void {
    const audioContext = this.getAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = waveType;
    
    // Attack
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    
    // Sustain and decay
    gainNode.gain.setValueAtTime(volume, startTime + duration / 1000 - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
  }

  // Play alert sound
  playAlertSound(alertType: AlertType): void {
    if (!this.isEnabledForAlert(alertType)) {
      console.log(`[AlertSoundService] Sound disabled for ${alertType}`);
      return;
    }

    try {
      const audioContext = this.getAudioContext();
      const config = this.getEffectiveSoundConfig(alertType);
      const volume = this.getEffectiveVolume(alertType);
      const waveType = config.waveType || 'sine';
      
      let currentTime = audioContext.currentTime;
      
      if (config.pattern && config.pattern.length > 0) {
        // Play pattern
        config.pattern.forEach((freq) => {
          this.playTone(freq, config.duration, volume, waveType, currentTime);
          currentTime += config.duration / 1000 + 0.05;
        });
      } else {
        // Play single tone
        this.playTone(config.frequency, config.duration, volume, waveType, currentTime);
      }
      
      console.log(`[AlertSoundService] Playing sound for ${alertType}`);
    } catch (e) {
      console.error('[AlertSoundService] Error playing sound:', e);
    }
  }

  // Preview sound for configuration
  previewSound(config: SoundConfig, volume: number = 70): void {
    try {
      const audioContext = this.getAudioContext();
      const normalizedVolume = (volume / 100) * 0.3;
      const waveType = config.waveType || 'sine';
      
      let currentTime = audioContext.currentTime;
      
      if (config.pattern && config.pattern.length > 0) {
        config.pattern.forEach((freq) => {
          this.playTone(freq, config.duration, normalizedVolume, waveType, currentTime);
          currentTime += config.duration / 1000 + 0.05;
        });
      } else {
        this.playTone(config.frequency, config.duration, normalizedVolume, waveType, currentTime);
      }
    } catch (e) {
      console.error('[AlertSoundService] Error previewing sound:', e);
    }
  }

  // Get available alert types
  getAlertTypes(): { type: AlertType; name: string; category: string }[] {
    return [
      // SPC Alerts
      { type: 'cpk_low', name: 'CPK Thấp (< 1.33)', category: 'SPC' },
      { type: 'cpk_critical', name: 'CPK Nghiêm trọng (< 1.0)', category: 'SPC' },
      { type: 'rule_violation', name: 'Vi phạm Rule SPC', category: 'SPC' },
      { type: 'trend_detected', name: 'Phát hiện Trend', category: 'SPC' },
      { type: 'shift_detected', name: 'Phát hiện Shift', category: 'SPC' },
      { type: 'out_of_spec', name: 'Ngoài Spec', category: 'SPC' },
      
      // OEE Alerts
      { type: 'availability_low', name: 'Availability Thấp', category: 'OEE' },
      { type: 'performance_low', name: 'Performance Thấp', category: 'OEE' },
      { type: 'quality_low', name: 'Quality Thấp', category: 'OEE' },
      { type: 'oee_critical', name: 'OEE Nghiêm trọng', category: 'OEE' },
      { type: 'downtime_start', name: 'Bắt đầu Downtime', category: 'OEE' },
      { type: 'downtime_extended', name: 'Downtime Kéo dài', category: 'OEE' },
      
      // System Alerts
      { type: 'connection_lost', name: 'Mất kết nối', category: 'System' },
      { type: 'connection_restored', name: 'Khôi phục kết nối', category: 'System' },
      { type: 'sync_conflict', name: 'Xung đột Sync', category: 'System' },
      { type: 'sync_complete', name: 'Sync hoàn tất', category: 'System' },
      { type: 'backup_complete', name: 'Backup hoàn tất', category: 'System' },
      
      // General
      { type: 'general', name: 'Thông báo chung', category: 'General' }
    ];
  }

  // Get sound config for alert type
  getSoundConfig(alertType: AlertType): SoundConfig {
    return this.getEffectiveSoundConfig(alertType);
  }

  // Set custom sound config for alert type
  setAlertSoundConfig(alertType: AlertType, config: Partial<SoundConfig>): void {
    const currentOverrides = this.preferences.alertOverrides[alertType] || {};
    this.preferences.alertOverrides[alertType] = {
      ...currentOverrides,
      soundConfig: { ...currentOverrides.soundConfig, ...config }
    };
    this.savePreferences(this.preferences);
  }

  // Enable/disable sound for specific alert type
  setAlertEnabled(alertType: AlertType, enabled: boolean): void {
    const currentOverrides = this.preferences.alertOverrides[alertType] || {};
    this.preferences.alertOverrides[alertType] = {
      ...currentOverrides,
      enabled
    };
    this.savePreferences(this.preferences);
  }

  // Set volume for specific alert type
  setAlertVolume(alertType: AlertType, volume: number): void {
    const currentOverrides = this.preferences.alertOverrides[alertType] || {};
    this.preferences.alertOverrides[alertType] = {
      ...currentOverrides,
      volume: Math.max(0, Math.min(100, volume))
    };
    this.savePreferences(this.preferences);
  }

  // Reset alert to default
  resetAlertToDefault(alertType: AlertType): void {
    delete this.preferences.alertOverrides[alertType];
    this.savePreferences(this.preferences);
  }

  // Reset all to defaults
  resetAllToDefaults(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences(this.preferences);
  }
}

// Singleton instance
export const alertSoundService = new AlertSoundService();

export default alertSoundService;
