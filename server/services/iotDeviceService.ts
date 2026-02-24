/**
 * IoT Device Integration Service
 * 
 * Provides device registration, data ingestion, and monitoring for IoT devices.
 * Supports MQTT, HTTP, and CoAP protocols.
 */

// Device status
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'error' | 'maintenance';

// Device protocol
export type DeviceProtocol = 'mqtt' | 'http' | 'coap';

// IoT Device interface
export interface IoTDevice {
  id: string;
  name: string;
  type: string;
  protocol: DeviceProtocol;
  machineId?: number;
  fixtureId?: number;
  status: DeviceStatus;
  lastSeen: Date;
  registeredAt: Date;
  metadata: Record<string, any>;
  config: {
    reportInterval: number; // seconds
    dataFields: string[];
    alertThresholds?: Record<string, { min?: number; max?: number }>;
  };
}

// Sensor data point
export interface SensorDataPoint {
  deviceId: string;
  timestamp: Date;
  values: Record<string, number>;
  quality: 'good' | 'uncertain' | 'bad';
  metadata?: Record<string, any>;
}

// Device alert
export interface DeviceAlert {
  id: string;
  deviceId: string;
  type: 'offline' | 'threshold_exceeded' | 'data_quality' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Device statistics
export interface DeviceStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  dataPointsToday: number;
  alertsToday: number;
  avgReportInterval: number;
}

class IoTDeviceService {
  private devices: Map<string, IoTDevice> = new Map();
  private dataBuffer: SensorDataPoint[] = [];
  private alerts: DeviceAlert[] = [];
  private maxDataPoints: number = 10000;
  private maxAlerts: number = 1000;
  private offlineThreshold: number = 300000; // 5 minutes

  /**
   * Register a new device
   */
  registerDevice(device: Omit<IoTDevice, 'id' | 'status' | 'lastSeen' | 'registeredAt'>): IoTDevice {
    const newDevice: IoTDevice = {
      ...device,
      id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'offline',
      lastSeen: new Date(),
      registeredAt: new Date(),
    };

    this.devices.set(newDevice.id, newDevice);
    return newDevice;
  }

  /**
   * Update device
   */
  updateDevice(id: string, updates: Partial<Omit<IoTDevice, 'id' | 'registeredAt'>>): IoTDevice | null {
    const device = this.devices.get(id);
    if (!device) return null;

    Object.assign(device, updates);
    return device;
  }

  /**
   * Delete device
   */
  deleteDevice(id: string): boolean {
    return this.devices.delete(id);
  }

  /**
   * Get device by ID
   */
  getDevice(id: string): IoTDevice | null {
    return this.devices.get(id) || null;
  }

  /**
   * Get all devices
   */
  getAllDevices(options?: {
    status?: DeviceStatus;
    protocol?: DeviceProtocol;
    machineId?: number;
  }): IoTDevice[] {
    let devices = Array.from(this.devices.values());

    if (options?.status) {
      devices = devices.filter(d => d.status === options.status);
    }

    if (options?.protocol) {
      devices = devices.filter(d => d.protocol === options.protocol);
    }

    if (options?.machineId) {
      devices = devices.filter(d => d.machineId === options.machineId);
    }

    return devices;
  }

  /**
   * Ingest sensor data
   */
  ingestData(data: Omit<SensorDataPoint, 'timestamp'> & { timestamp?: Date }): SensorDataPoint {
    const device = this.devices.get(data.deviceId);
    if (!device) {
      throw new Error(`Device ${data.deviceId} not found`);
    }

    const dataPoint: SensorDataPoint = {
      ...data,
      timestamp: data.timestamp || new Date(),
    };

    // Update device status
    device.lastSeen = dataPoint.timestamp;
    device.status = 'online';

    // Check thresholds
    if (device.config.alertThresholds) {
      this.checkThresholds(device, dataPoint);
    }

    // Add to buffer
    this.dataBuffer.push(dataPoint);
    if (this.dataBuffer.length > this.maxDataPoints) {
      this.dataBuffer.shift();
    }

    return dataPoint;
  }

  /**
   * Check threshold alerts
   */
  private checkThresholds(device: IoTDevice, data: SensorDataPoint): void {
    if (!device.config.alertThresholds) return;

    for (const [field, thresholds] of Object.entries(device.config.alertThresholds)) {
      const value = data.values[field];
      if (value === undefined) continue;

      if (thresholds.min !== undefined && value < thresholds.min) {
        this.createAlert({
          deviceId: device.id,
          type: 'threshold_exceeded',
          severity: 'warning',
          message: `${field} value ${value} below minimum ${thresholds.min}`,
        });
      }

      if (thresholds.max !== undefined && value > thresholds.max) {
        this.createAlert({
          deviceId: device.id,
          type: 'threshold_exceeded',
          severity: 'warning',
          message: `${field} value ${value} above maximum ${thresholds.max}`,
        });
      }
    }
  }

  /**
   * Create device alert
   */
  createAlert(alert: Omit<DeviceAlert, 'id' | 'timestamp' | 'acknowledged'>): DeviceAlert {
    const newAlert: DeviceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(newAlert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    return newAlert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): DeviceAlert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    return alert;
  }

  /**
   * Get alerts
   */
  getAlerts(options?: {
    deviceId?: string;
    type?: DeviceAlert['type'];
    severity?: DeviceAlert['severity'];
    acknowledged?: boolean;
    limit?: number;
  }): DeviceAlert[] {
    let alerts = [...this.alerts];

    if (options?.deviceId) {
      alerts = alerts.filter(a => a.deviceId === options.deviceId);
    }

    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Get device data
   */
  getDeviceData(deviceId: string, options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): SensorDataPoint[] {
    let data = this.dataBuffer.filter(d => d.deviceId === deviceId);

    if (options?.startTime) {
      data = data.filter(d => d.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      data = data.filter(d => d.timestamp <= options.endTime!);
    }

    data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      data = data.slice(0, options.limit);
    }

    return data;
  }

  /**
   * Get latest data for device
   */
  getLatestData(deviceId: string): SensorDataPoint | null {
    const data = this.dataBuffer
      .filter(d => d.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return data[0] || null;
  }

  /**
   * Check device status (run periodically)
   */
  checkDeviceStatus(): void {
    const now = Date.now();

    this.devices.forEach((device) => {
      if (device.status === 'maintenance') return;

      const timeSinceLastSeen = now - device.lastSeen.getTime();

      if (timeSinceLastSeen > this.offlineThreshold && device.status !== 'offline') {
        device.status = 'offline';
        this.createAlert({
          deviceId: device.id,
          type: 'offline',
          severity: 'warning',
          message: `Device ${device.name} went offline`,
        });
      }
    });
  }

  /**
   * Get device statistics
   */
  getStats(): DeviceStats {
    const stats: DeviceStats = {
      totalDevices: this.devices.size,
      onlineDevices: 0,
      offlineDevices: 0,
      warningDevices: 0,
      dataPointsToday: 0,
      alertsToday: 0,
      avgReportInterval: 0,
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    this.devices.forEach((device) => {
      switch (device.status) {
        case 'online':
          stats.onlineDevices++;
          break;
        case 'offline':
          stats.offlineDevices++;
          break;
        case 'warning':
        case 'error':
          stats.warningDevices++;
          break;
      }
    });

    stats.dataPointsToday = this.dataBuffer.filter(d => d.timestamp >= todayStart).length;
    stats.alertsToday = this.alerts.filter(a => a.timestamp >= todayStart).length;

    // Calculate average report interval
    let totalInterval = 0;
    let intervalCount = 0;
    this.devices.forEach((device) => {
      totalInterval += device.config.reportInterval;
      intervalCount++;
    });
    stats.avgReportInterval = intervalCount > 0 ? Math.round(totalInterval / intervalCount) : 0;

    return stats;
  }

  /**
   * Get device dashboard data
   */
  getDashboardData(): {
    stats: DeviceStats;
    recentAlerts: DeviceAlert[];
    devicesByStatus: Record<DeviceStatus, number>;
    devicesByProtocol: Record<DeviceProtocol, number>;
  } {
    const stats = this.getStats();
    const recentAlerts = this.getAlerts({ limit: 10 });

    const devicesByStatus: Record<DeviceStatus, number> = {
      online: 0,
      offline: 0,
      warning: 0,
      error: 0,
      maintenance: 0,
    };

    const devicesByProtocol: Record<DeviceProtocol, number> = {
      mqtt: 0,
      http: 0,
      coap: 0,
    };

    this.devices.forEach((device) => {
      devicesByStatus[device.status]++;
      devicesByProtocol[device.protocol]++;
    });

    return {
      stats,
      recentAlerts,
      devicesByStatus,
      devicesByProtocol,
    };
  }

  /**
   * Simulate device data (for testing)
   */
  simulateDeviceData(deviceId: string): SensorDataPoint | null {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const values: Record<string, number> = {};
    device.config.dataFields.forEach((field) => {
      values[field] = Math.random() * 100;
    });

    return this.ingestData({
      deviceId,
      values,
      quality: 'good',
    });
  }
}

// Singleton instance
export const iotDeviceService = new IoTDeviceService();

// Export functions
export const registerIoTDevice = iotDeviceService.registerDevice.bind(iotDeviceService);
export const updateIoTDevice = iotDeviceService.updateDevice.bind(iotDeviceService);
export const deleteIoTDevice = iotDeviceService.deleteDevice.bind(iotDeviceService);
export const getIoTDevice = iotDeviceService.getDevice.bind(iotDeviceService);
export const getAllIoTDevices = iotDeviceService.getAllDevices.bind(iotDeviceService);
export const ingestIoTData = iotDeviceService.ingestData.bind(iotDeviceService);
export const getIoTDeviceData = iotDeviceService.getDeviceData.bind(iotDeviceService);
export const getLatestIoTData = iotDeviceService.getLatestData.bind(iotDeviceService);
export const getIoTAlerts = iotDeviceService.getAlerts.bind(iotDeviceService);
export const acknowledgeIoTAlert = iotDeviceService.acknowledgeAlert.bind(iotDeviceService);
export const createIoTAlert = iotDeviceService.createAlert.bind(iotDeviceService);
export const checkIoTDeviceStatus = iotDeviceService.checkDeviceStatus.bind(iotDeviceService);
export const getIoTStats = iotDeviceService.getStats.bind(iotDeviceService);
export const getIoTDashboard = iotDeviceService.getDashboardData.bind(iotDeviceService);
export const simulateIoTData = iotDeviceService.simulateDeviceData.bind(iotDeviceService);
