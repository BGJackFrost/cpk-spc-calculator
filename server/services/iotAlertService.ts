/**
 * IoT Alert Service
 * Kiểm tra ngưỡng và gửi cảnh báo khi dữ liệu IoT vượt ngưỡng
 */

import { EventEmitter } from 'events';
import { getDb } from '../db';
import { 
  iotAlertThresholds, 
  iotAlertHistory, 
  iotDevices,
  type IotAlertThreshold,
  type InsertIotAlertHistory 
} from '../../drizzle/schema';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

// Types
export interface DeviceReading {
  deviceId: number;
  metric: string;
  value: number;
  timestamp: Date;
}

export interface AlertEvent {
  thresholdId: number;
  deviceId: number;
  deviceName?: string;
  metric: string;
  alertType: 'upper_limit' | 'lower_limit' | 'upper_warning' | 'lower_warning';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

// Alert cooldown tracking (in-memory)
const alertCooldowns = new Map<string, Date>();

class IoTAlertService extends EventEmitter {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private thresholdCache: Map<string, IotAlertThreshold> = new Map();
  private cacheExpiry: Date | null = null;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor() {
    super();
  }

  /**
   * Khởi động service
   */
  start(intervalMs = 5000): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[IoT Alert Service] Started');
    this.emit('started');
  }

  /**
   * Dừng service
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[IoT Alert Service] Stopped');
    this.emit('stopped');
  }

  /**
   * Kiểm tra một reading có vượt ngưỡng không
   */
  async checkReading(reading: DeviceReading): Promise<AlertEvent | null> {
    const threshold = await this.getThreshold(reading.deviceId, reading.metric);
    if (!threshold || !threshold.isActive) return null;

    const alertType = this.determineAlertType(reading.value, threshold);
    if (!alertType) return null;

    // Check cooldown
    const cooldownKey = `${reading.deviceId}-${reading.metric}-${alertType}`;
    const lastAlert = alertCooldowns.get(cooldownKey);
    const cooldownMs = (threshold.cooldownMinutes || 5) * 60 * 1000;
    
    if (lastAlert && (Date.now() - lastAlert.getTime()) < cooldownMs) {
      return null; // Still in cooldown
    }

    // Get device name
    const device = await this.getDevice(reading.deviceId);
    const deviceName = device?.deviceName || `Device ${reading.deviceId}`;

    // Determine threshold value
    let thresholdValue = 0;
    switch (alertType) {
      case 'upper_limit': thresholdValue = Number(threshold.upperLimit); break;
      case 'lower_limit': thresholdValue = Number(threshold.lowerLimit); break;
      case 'upper_warning': thresholdValue = Number(threshold.upperWarning); break;
      case 'lower_warning': thresholdValue = Number(threshold.lowerWarning); break;
    }

    const alert: AlertEvent = {
      thresholdId: threshold.id,
      deviceId: reading.deviceId,
      deviceName,
      metric: reading.metric,
      alertType,
      value: reading.value,
      threshold: thresholdValue,
      message: this.formatAlertMessage(alertType, deviceName, reading.metric, reading.value, thresholdValue, threshold.unit || ''),
      timestamp: reading.timestamp,
    };

    // Update cooldown
    alertCooldowns.set(cooldownKey, new Date());

    // Save to history
    await this.saveAlertHistory(alert, threshold);

    // Send notifications
    await this.sendNotifications(alert, threshold);

    // Emit event
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Kiểm tra nhiều readings cùng lúc
   */
  async checkReadings(readings: DeviceReading[]): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    
    for (const reading of readings) {
      const alert = await this.checkReading(reading);
      if (alert) {
        alerts.push(alert);
      }
    }
    
    return alerts;
  }

  /**
   * Xác định loại cảnh báo
   */
  private determineAlertType(
    value: number, 
    threshold: IotAlertThreshold
  ): AlertEvent['alertType'] | null {
    const upperLimit = threshold.upperLimit ? Number(threshold.upperLimit) : null;
    const lowerLimit = threshold.lowerLimit ? Number(threshold.lowerLimit) : null;
    const upperWarning = threshold.upperWarning ? Number(threshold.upperWarning) : null;
    const lowerWarning = threshold.lowerWarning ? Number(threshold.lowerWarning) : null;

    // Check limits first (higher priority)
    if (upperLimit !== null && value >= upperLimit) return 'upper_limit';
    if (lowerLimit !== null && value <= lowerLimit) return 'lower_limit';
    
    // Then check warnings
    if (upperWarning !== null && value >= upperWarning) return 'upper_warning';
    if (lowerWarning !== null && value <= lowerWarning) return 'lower_warning';
    
    return null;
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(
    alertType: string,
    deviceName: string,
    metric: string,
    value: number,
    threshold: number,
    unit: string
  ): string {
    const typeLabels: Record<string, string> = {
      'upper_limit': 'VƯỢT NGƯỠNG TRÊN',
      'lower_limit': 'DƯỚI NGƯỠNG DƯỚI',
      'upper_warning': 'Cảnh báo ngưỡng trên',
      'lower_warning': 'Cảnh báo ngưỡng dưới',
    };

    const label = typeLabels[alertType] || alertType;
    return `[${label}] ${deviceName} - ${metric}: ${value.toFixed(2)}${unit} (Ngưỡng: ${threshold.toFixed(2)}${unit})`;
  }

  /**
   * Lưu cảnh báo vào database
   */
  private async saveAlertHistory(alert: AlertEvent, threshold: IotAlertThreshold): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const channels: string[] = [];
      if (threshold.notifyEmail) channels.push('email');
      if (threshold.notifyPush) channels.push('push');
      if (threshold.notifySms) channels.push('sms');

      const record: InsertIotAlertHistory = {
        thresholdId: alert.thresholdId,
        deviceId: alert.deviceId,
        metric: alert.metric,
        alertType: alert.alertType,
        value: String(alert.value),
        threshold: String(alert.threshold),
        message: alert.message,
        notificationSent: 1,
        notificationChannels: JSON.stringify(channels),
      };

      await db.insert(iotAlertHistory).values(record);
    } catch (error) {
      console.error('[IoT Alert Service] Failed to save alert history:', error);
    }
  }

  /**
   * Gửi thông báo
   */
  private async sendNotifications(alert: AlertEvent, threshold: IotAlertThreshold): Promise<void> {
    try {
      // Push notification (via notifyOwner)
      if (threshold.notifyPush) {
        const severity = alert.alertType.includes('limit') ? '🚨' : '⚠️';
        await notifyOwner({
          title: `${severity} IoT Alert: ${alert.deviceName}`,
          content: alert.message,
        });
      }

      // Email notification (if configured)
      if (threshold.notifyEmail) {
        // TODO: Implement email notification via SMTP service
        console.log('[IoT Alert Service] Email notification:', alert.message);
      }

      // SMS notification (if configured)
      if (threshold.notifySms) {
        // TODO: Implement SMS notification
        console.log('[IoT Alert Service] SMS notification:', alert.message);
      }
    } catch (error) {
      console.error('[IoT Alert Service] Failed to send notifications:', error);
    }
  }

  /**
   * Lấy threshold từ cache hoặc database
   */
  private async getThreshold(deviceId: number, metric: string): Promise<IotAlertThreshold | null> {
    const cacheKey = `${deviceId}-${metric}`;
    
    // Check cache
    if (this.cacheExpiry && this.cacheExpiry > new Date()) {
      const cached = this.thresholdCache.get(cacheKey);
      if (cached) return cached;
    }

    // Fetch from database
    try {
      const db = await getDb();
      if (!db) return null;

      const [threshold] = await db
        .select()
        .from(iotAlertThresholds)
        .where(
          and(
            eq(iotAlertThresholds.deviceId, deviceId),
            eq(iotAlertThresholds.metric, metric),
            eq(iotAlertThresholds.isActive, 1)
          )
        )
        .limit(1);

      if (threshold) {
        this.thresholdCache.set(cacheKey, threshold);
        this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL);
      }

      return threshold || null;
    } catch (error) {
      console.error('[IoT Alert Service] Failed to get threshold:', error);
      return null;
    }
  }

  /**
   * Lấy thông tin device
   */
  private async getDevice(deviceId: number) {
    try {
      const db = await getDb();
      if (!db) return null;

      const [device] = await db
        .select()
        .from(iotDevices)
        .where(eq(iotDevices.id, deviceId))
        .limit(1);

      return device || null;
    } catch (error) {
      console.error('[IoT Alert Service] Failed to get device:', error);
      return null;
    }
  }

  /**
   * Xóa cache
   */
  clearCache(): void {
    this.thresholdCache.clear();
    this.cacheExpiry = null;
  }

  /**
   * Lấy trạng thái service
   */
  getStatus(): { isRunning: boolean; cacheSize: number; cooldownCount: number } {
    return {
      isRunning: this.isRunning,
      cacheSize: this.thresholdCache.size,
      cooldownCount: alertCooldowns.size,
    };
  }

  /**
   * Acknowledge một alert
   */
  async acknowledgeAlert(alertId: number, userId: number): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(iotAlertHistory)
        .set({
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
        })
        .where(eq(iotAlertHistory.id, alertId));

      return true;
    } catch (error) {
      console.error('[IoT Alert Service] Failed to acknowledge alert:', error);
      return false;
    }
  }

  /**
   * Resolve một alert
   */
  async resolveAlert(alertId: number): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(iotAlertHistory)
        .set({
          resolvedAt: new Date(),
        })
        .where(eq(iotAlertHistory.id, alertId));

      return true;
    } catch (error) {
      console.error('[IoT Alert Service] Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách alerts chưa resolved
   */
  async getActiveAlerts(limit = 50): Promise<any[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const alerts = await db
        .select()
        .from(iotAlertHistory)
        .where(isNull(iotAlertHistory.resolvedAt))
        .orderBy(iotAlertHistory.createdAt)
        .limit(limit);

      return alerts;
    } catch (error) {
      console.error('[IoT Alert Service] Failed to get active alerts:', error);
      return [];
    }
  }
}

// Singleton instance
let alertServiceInstance: IoTAlertService | null = null;

export function getIoTAlertService(): IoTAlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new IoTAlertService();
  }
  return alertServiceInstance;
}

export { IoTAlertService };
