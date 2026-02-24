/**
 * Settings Backup Service
 * Manages scheduled backups for notification settings with versioning
 */

// Storage keys
const BACKUP_STORAGE_KEY = 'cpk_spc_settings_backups';
const BACKUP_CONFIG_KEY = 'cpk_spc_backup_config';
const MAX_BACKUPS = 5;

// Types
export interface SettingsBackup {
  id: string;
  version: number;
  createdAt: number;
  trigger: 'manual' | 'scheduled' | 'auto_change';
  description?: string;
  data: {
    notificationPreferences?: any;
    alertSoundPreferences?: any;
    ssePreferences?: any;
    syncPreferences?: any;
  };
  size: number; // bytes
}

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number; // 0 = disabled
  backupOnChange: boolean;
  lastBackupAt: number;
  nextBackupAt: number;
}

// Default config
const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  intervalMinutes: 60, // Every hour
  backupOnChange: true,
  lastBackupAt: 0,
  nextBackupAt: 0
};

// Settings keys to backup
const SETTINGS_KEYS = [
  'notification_preferences',
  'cpk_spc_alert_sound_prefs',
  'sse_notification_prefs',
  'sse_enabled',
  'sync_preferences'
];

class SettingsBackupService {
  private config: BackupConfig = DEFAULT_CONFIG;
  private backupTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(backups: SettingsBackup[]) => void> = new Set();
  private changeListeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadConfig();
    this.setupChangeDetection();
  }

  // Initialize service
  init(): void {
    if (this.isInitialized) return;
    
    this.loadConfig();
    this.startScheduledBackup();
    this.isInitialized = true;
    
    console.log('[SettingsBackupService] Initialized');
  }

  // Load config from localStorage
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(BACKUP_CONFIG_KEY);
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('[SettingsBackupService] Error loading config:', e);
    }
  }

  // Save config to localStorage
  private saveConfig(): void {
    try {
      localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[SettingsBackupService] Error saving config:', e);
    }
  }

  // Get current config
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  // Update config
  updateConfig(updates: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    
    // Restart scheduled backup if interval changed
    if (updates.intervalMinutes !== undefined || updates.enabled !== undefined) {
      this.startScheduledBackup();
    }
  }

  // Setup change detection for auto-backup
  private setupChangeDetection(): void {
    // Listen for storage changes
    window.addEventListener('storage', (event) => {
      if (SETTINGS_KEYS.includes(event.key || '')) {
        this.handleSettingsChange();
      }
    });

    // Also listen for custom events
    window.addEventListener('settings-changed', () => {
      this.handleSettingsChange();
    });
  }

  // Handle settings change
  private handleSettingsChange(): void {
    if (this.config.backupOnChange) {
      // Debounce - wait 5 seconds before backup
      this.changeListeners.forEach(listener => listener());
      
      setTimeout(() => {
        this.createBackup('auto_change', 'Auto-backup on settings change');
      }, 5000);
    }
  }

  // Start scheduled backup
  private startScheduledBackup(): void {
    // Clear existing timer
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }

    if (!this.config.enabled || this.config.intervalMinutes <= 0) {
      return;
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    
    // Calculate next backup time
    this.config.nextBackupAt = Date.now() + intervalMs;
    this.saveConfig();

    // Start timer
    this.backupTimer = setInterval(() => {
      this.createBackup('scheduled', 'Scheduled backup');
    }, intervalMs);

    console.log(`[SettingsBackupService] Scheduled backup every ${this.config.intervalMinutes} minutes`);
  }

  // Stop scheduled backup
  stopScheduledBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // Generate backup ID
  private generateId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all backups
  getBackups(): SettingsBackup[] {
    try {
      const saved = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('[SettingsBackupService] Error loading backups:', e);
    }
    return [];
  }

  // Save backups to localStorage
  private saveBackups(backups: SettingsBackup[]): void {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
      this.notifyListeners(backups);
    } catch (e) {
      console.error('[SettingsBackupService] Error saving backups:', e);
    }
  }

  // Notify listeners
  private notifyListeners(backups: SettingsBackup[]): void {
    this.listeners.forEach(listener => listener(backups));
  }

  // Subscribe to backup changes
  onBackupsChange(callback: (backups: SettingsBackup[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Collect current settings
  private collectSettings(): SettingsBackup['data'] {
    const data: SettingsBackup['data'] = {};

    try {
      // Notification preferences
      const notifPrefs = localStorage.getItem('notification_preferences');
      if (notifPrefs) {
        data.notificationPreferences = JSON.parse(notifPrefs);
      }

      // Alert sound preferences
      const alertPrefs = localStorage.getItem('cpk_spc_alert_sound_prefs');
      if (alertPrefs) {
        data.alertSoundPreferences = JSON.parse(alertPrefs);
      }

      // SSE preferences
      const ssePrefs = localStorage.getItem('sse_notification_prefs');
      if (ssePrefs) {
        data.ssePreferences = JSON.parse(ssePrefs);
      }

      // Sync preferences
      const syncPrefs = localStorage.getItem('sync_preferences');
      if (syncPrefs) {
        data.syncPreferences = JSON.parse(syncPrefs);
      }
    } catch (e) {
      console.error('[SettingsBackupService] Error collecting settings:', e);
    }

    return data;
  }

  // Create backup
  createBackup(
    trigger: SettingsBackup['trigger'] = 'manual',
    description?: string
  ): SettingsBackup | null {
    try {
      const backups = this.getBackups();
      const data = this.collectSettings();
      
      // Calculate size
      const dataStr = JSON.stringify(data);
      const size = new Blob([dataStr]).size;

      // Get next version number
      const maxVersion = backups.reduce((max, b) => Math.max(max, b.version), 0);

      const backup: SettingsBackup = {
        id: this.generateId(),
        version: maxVersion + 1,
        createdAt: Date.now(),
        trigger,
        description,
        data,
        size
      };

      // Add new backup
      backups.unshift(backup);

      // Keep only MAX_BACKUPS
      while (backups.length > MAX_BACKUPS) {
        backups.pop();
      }

      // Save
      this.saveBackups(backups);

      // Update config
      this.config.lastBackupAt = Date.now();
      this.config.nextBackupAt = Date.now() + (this.config.intervalMinutes * 60 * 1000);
      this.saveConfig();

      console.log(`[SettingsBackupService] Created backup v${backup.version}`);
      return backup;
    } catch (e) {
      console.error('[SettingsBackupService] Error creating backup:', e);
      return null;
    }
  }

  // Restore backup
  restoreBackup(backupId: string): boolean {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        console.error('[SettingsBackupService] Backup not found:', backupId);
        return false;
      }

      // Restore each setting
      if (backup.data.notificationPreferences) {
        localStorage.setItem(
          'notification_preferences',
          JSON.stringify(backup.data.notificationPreferences)
        );
      }

      if (backup.data.alertSoundPreferences) {
        localStorage.setItem(
          'cpk_spc_alert_sound_prefs',
          JSON.stringify(backup.data.alertSoundPreferences)
        );
      }

      if (backup.data.ssePreferences) {
        localStorage.setItem(
          'sse_notification_prefs',
          JSON.stringify(backup.data.ssePreferences)
        );
      }

      if (backup.data.syncPreferences) {
        localStorage.setItem(
          'sync_preferences',
          JSON.stringify(backup.data.syncPreferences)
        );
      }

      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('settings-restored', {
        detail: { backupId, version: backup.version }
      }));

      console.log(`[SettingsBackupService] Restored backup v${backup.version}`);
      return true;
    } catch (e) {
      console.error('[SettingsBackupService] Error restoring backup:', e);
      return false;
    }
  }

  // Delete backup
  deleteBackup(backupId: string): boolean {
    try {
      const backups = this.getBackups();
      const index = backups.findIndex(b => b.id === backupId);

      if (index === -1) {
        return false;
      }

      backups.splice(index, 1);
      this.saveBackups(backups);

      console.log('[SettingsBackupService] Deleted backup:', backupId);
      return true;
    } catch (e) {
      console.error('[SettingsBackupService] Error deleting backup:', e);
      return false;
    }
  }

  // Delete all backups
  deleteAllBackups(): void {
    this.saveBackups([]);
    console.log('[SettingsBackupService] Deleted all backups');
  }

  // Export backup to file
  exportBackup(backupId: string): void {
    const backups = this.getBackups();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      console.error('[SettingsBackupService] Backup not found for export');
      return;
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-backup-v${backup.version}-${new Date(backup.createdAt).toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import backup from file
  async importBackup(file: File): Promise<SettingsBackup | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate
      if (!data.data || !data.createdAt) {
        throw new Error('Invalid backup file format');
      }

      // Create new backup from imported data
      const backups = this.getBackups();
      const maxVersion = backups.reduce((max, b) => Math.max(max, b.version), 0);

      const backup: SettingsBackup = {
        id: this.generateId(),
        version: maxVersion + 1,
        createdAt: Date.now(),
        trigger: 'manual',
        description: `Imported from backup v${data.version || 'unknown'}`,
        data: data.data,
        size: new Blob([JSON.stringify(data.data)]).size
      };

      backups.unshift(backup);

      while (backups.length > MAX_BACKUPS) {
        backups.pop();
      }

      this.saveBackups(backups);

      console.log('[SettingsBackupService] Imported backup');
      return backup;
    } catch (e) {
      console.error('[SettingsBackupService] Error importing backup:', e);
      return null;
    }
  }

  // Get backup statistics
  getStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: number | null;
    newestBackup: number | null;
  } {
    const backups = this.getBackups();
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
      newestBackup: backups.length > 0 ? backups[0].createdAt : null
    };
  }

  // Format size
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Singleton instance
export const settingsBackupService = new SettingsBackupService();

export default settingsBackupService;
