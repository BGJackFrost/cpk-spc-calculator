/**
 * IoT WebSocket Service
 * Manages real-time IoT device data and events via SSE
 */

import { EventEmitter } from "events";

// Types
export interface IotDevice {
  id: string;
  name: string;
  type: "sensor" | "plc" | "gateway" | "controller";
  status: "online" | "offline" | "warning" | "error";
  lastSeen: Date;
  metrics: Record<string, number>;
  metadata?: Record<string, string>;
}

export interface IotMetricData {
  deviceId: string;
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: "good" | "uncertain" | "bad";
}

export interface IotAlarm {
  id: string;
  deviceId: string;
  type: "threshold" | "connection" | "quality" | "system";
  severity: "info" | "warning" | "critical" | "emergency";
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface IotEvent {
  type: "device_status" | "metric_update" | "alarm" | "alarm_ack" | "device_config" | "batch_metrics";
  payload: any;
  timestamp: Date;
}

// Event types for SSE
export const IOT_EVENT_TYPES = {
  DEVICE_STATUS: "iot:device_status",
  METRIC_UPDATE: "iot:metric_update",
  ALARM: "iot:alarm",
  ALARM_ACK: "iot:alarm_ack",
  DEVICE_CONFIG: "iot:device_config",
  BATCH_METRICS: "iot:batch_metrics",
} as const;

// In-memory state (in production, use Redis or similar)
class IotStateManager {
  private devices: Map<string, IotDevice> = new Map();
  private alarms: Map<string, IotAlarm> = new Map();
  private metricHistory: Map<string, IotMetricData[]> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  // Device Management
  registerDevice(device: IotDevice): void {
    this.devices.set(device.id, device);
    this.emit(IOT_EVENT_TYPES.DEVICE_STATUS, {
      deviceId: device.id,
      status: device.status,
      device,
    });
  }

  updateDeviceStatus(deviceId: string, status: IotDevice["status"]): void {
    const device = this.devices.get(deviceId);
    if (device) {
      const oldStatus = device.status;
      device.status = status;
      device.lastSeen = new Date();
      this.devices.set(deviceId, device);

      this.emit(IOT_EVENT_TYPES.DEVICE_STATUS, {
        deviceId,
        oldStatus,
        newStatus: status,
        device,
      });

      // Auto-generate alarm for status changes
      if (status === "error" || status === "offline") {
        this.createAlarm({
          id: `alarm-${deviceId}-${Date.now()}`,
          deviceId,
          type: status === "offline" ? "connection" : "system",
          severity: status === "offline" ? "warning" : "critical",
          message: status === "offline"
            ? `Thiết bị ${device.name} mất kết nối`
            : `Thiết bị ${device.name} gặp lỗi`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }
  }

  getDevice(deviceId: string): IotDevice | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): IotDevice[] {
    return Array.from(this.devices.values());
  }

  getOnlineDevices(): IotDevice[] {
    return this.getAllDevices().filter((d) => d.status === "online");
  }

  // Metric Management
  updateMetric(data: IotMetricData): void {
    const key = `${data.deviceId}:${data.metricName}`;
    const history = this.metricHistory.get(key) || [];

    // Keep last 1000 data points
    if (history.length >= 1000) {
      history.shift();
    }
    history.push(data);
    this.metricHistory.set(key, history);

    // Update device metrics
    const device = this.devices.get(data.deviceId);
    if (device) {
      device.metrics[data.metricName] = data.value;
      device.lastSeen = new Date();
      this.devices.set(data.deviceId, device);
    }

    this.emit(IOT_EVENT_TYPES.METRIC_UPDATE, data);

    // Check thresholds (example)
    this.checkMetricThresholds(data);
  }

  updateBatchMetrics(metrics: IotMetricData[]): void {
    metrics.forEach((m) => {
      const key = `${m.deviceId}:${m.metricName}`;
      const history = this.metricHistory.get(key) || [];
      if (history.length >= 1000) history.shift();
      history.push(m);
      this.metricHistory.set(key, history);

      const device = this.devices.get(m.deviceId);
      if (device) {
        device.metrics[m.metricName] = m.value;
        device.lastSeen = new Date();
      }
    });

    this.emit(IOT_EVENT_TYPES.BATCH_METRICS, { metrics, count: metrics.length });
  }

  getMetricHistory(deviceId: string, metricName: string, limit = 100): IotMetricData[] {
    const key = `${deviceId}:${metricName}`;
    const history = this.metricHistory.get(key) || [];
    return history.slice(-limit);
  }

  private checkMetricThresholds(data: IotMetricData): void {
    // Example threshold checks
    const thresholds: Record<string, { warning: number; critical: number }> = {
      temperature: { warning: 80, critical: 95 },
      pressure: { warning: 150, critical: 180 },
      vibration: { warning: 5, critical: 8 },
      humidity: { warning: 85, critical: 95 },
    };

    const threshold = thresholds[data.metricName];
    if (threshold) {
      if (data.value >= threshold.critical) {
        this.createAlarm({
          id: `alarm-${data.deviceId}-${data.metricName}-${Date.now()}`,
          deviceId: data.deviceId,
          type: "threshold",
          severity: "critical",
          message: `${data.metricName} vượt ngưỡng nghiêm trọng: ${data.value} ${data.unit}`,
          timestamp: new Date(),
          acknowledged: false,
        });
      } else if (data.value >= threshold.warning) {
        this.createAlarm({
          id: `alarm-${data.deviceId}-${data.metricName}-${Date.now()}`,
          deviceId: data.deviceId,
          type: "threshold",
          severity: "warning",
          message: `${data.metricName} vượt ngưỡng cảnh báo: ${data.value} ${data.unit}`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }
  }

  // Alarm Management
  createAlarm(alarm: IotAlarm): void {
    this.alarms.set(alarm.id, alarm);
    this.emit(IOT_EVENT_TYPES.ALARM, alarm);
  }

  acknowledgeAlarm(alarmId: string, userId: string): boolean {
    const alarm = this.alarms.get(alarmId);
    if (alarm && !alarm.acknowledged) {
      alarm.acknowledged = true;
      alarm.acknowledgedBy = userId;
      alarm.acknowledgedAt = new Date();
      this.alarms.set(alarmId, alarm);

      this.emit(IOT_EVENT_TYPES.ALARM_ACK, {
        alarmId,
        acknowledgedBy: userId,
        acknowledgedAt: alarm.acknowledgedAt,
      });
      return true;
    }
    return false;
  }

  getActiveAlarms(): IotAlarm[] {
    return Array.from(this.alarms.values()).filter((a) => !a.acknowledged);
  }

  getAllAlarms(limit = 100): IotAlarm[] {
    return Array.from(this.alarms.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlarmsByDevice(deviceId: string): IotAlarm[] {
    return Array.from(this.alarms.values()).filter((a) => a.deviceId === deviceId);
  }

  // Event Emitter
  private emit(type: string, payload: any): void {
    this.eventEmitter.emit("iot_event", {
      type,
      payload,
      timestamp: new Date(),
    } as IotEvent);
  }

  onEvent(callback: (event: IotEvent) => void): () => void {
    this.eventEmitter.on("iot_event", callback);
    return () => {
      this.eventEmitter.off("iot_event", callback);
    };
  }

  // Statistics
  getStats(): {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    warningDevices: number;
    errorDevices: number;
    activeAlarms: number;
    criticalAlarms: number;
  } {
    const devices = this.getAllDevices();
    const alarms = this.getActiveAlarms();

    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => d.status === "online").length,
      offlineDevices: devices.filter((d) => d.status === "offline").length,
      warningDevices: devices.filter((d) => d.status === "warning").length,
      errorDevices: devices.filter((d) => d.status === "error").length,
      activeAlarms: alarms.length,
      criticalAlarms: alarms.filter((a) => a.severity === "critical" || a.severity === "emergency").length,
    };
  }

  // Cleanup old data
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Cleanup old acknowledged alarms
    for (const [id, alarm] of this.alarms.entries()) {
      if (alarm.acknowledged && alarm.acknowledgedAt) {
        if (now - alarm.acknowledgedAt.getTime() > maxAge) {
          this.alarms.delete(id);
        }
      }
    }

    // Cleanup old metric history
    for (const [key, history] of this.metricHistory.entries()) {
      const filtered = history.filter((m) => now - m.timestamp.getTime() < maxAge);
      if (filtered.length === 0) {
        this.metricHistory.delete(key);
      } else {
        this.metricHistory.set(key, filtered);
      }
    }
  }
}

// Singleton instance
export const iotStateManager = new IotStateManager();

// Initialize with demo devices
export function initializeDemoDevices(): void {
  const demoDevices: IotDevice[] = [
    {
      id: "sensor-001",
      name: "Cảm biến nhiệt độ #1",
      type: "sensor",
      status: "online",
      lastSeen: new Date(),
      metrics: { temperature: 72.5, humidity: 45 },
    },
    {
      id: "sensor-002",
      name: "Cảm biến áp suất #1",
      type: "sensor",
      status: "online",
      lastSeen: new Date(),
      metrics: { pressure: 120, flow: 85 },
    },
    {
      id: "plc-001",
      name: "PLC Dây chuyền 1",
      type: "plc",
      status: "online",
      lastSeen: new Date(),
      metrics: { cycleTime: 12.5, output: 150 },
    },
    {
      id: "gateway-001",
      name: "Gateway Khu vực A",
      type: "gateway",
      status: "online",
      lastSeen: new Date(),
      metrics: { connectedDevices: 12, dataRate: 1024 },
    },
  ];

  demoDevices.forEach((d) => iotStateManager.registerDevice(d));
}

// Simulate real-time data updates
let simulationInterval: NodeJS.Timeout | null = null;

export function startSimulation(): void {
  if (simulationInterval) return;

  simulationInterval = setInterval(() => {
    const devices = iotStateManager.getAllDevices();

    devices.forEach((device) => {
      // Simulate metric updates
      Object.keys(device.metrics).forEach((metricName) => {
        const currentValue = device.metrics[metricName];
        const variation = (Math.random() - 0.5) * 2; // ±1
        const newValue = Math.max(0, currentValue + variation);

        iotStateManager.updateMetric({
          deviceId: device.id,
          metricName,
          value: parseFloat(newValue.toFixed(2)),
          unit: getMetricUnit(metricName),
          timestamp: new Date(),
          quality: "good",
        });
      });

      // Random status changes (rare)
      if (Math.random() < 0.01) {
        const statuses: IotDevice["status"][] = ["online", "warning", "online", "online"];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        if (newStatus !== device.status) {
          iotStateManager.updateDeviceStatus(device.id, newStatus);
        }
      }
    });
  }, 2000); // Update every 2 seconds
}

export function stopSimulation(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function getMetricUnit(metricName: string): string {
  const units: Record<string, string> = {
    temperature: "°C",
    humidity: "%",
    pressure: "bar",
    flow: "L/min",
    cycleTime: "s",
    output: "pcs",
    connectedDevices: "",
    dataRate: "KB/s",
    vibration: "mm/s",
    power: "kW",
  };
  return units[metricName] || "";
}

export default {
  iotStateManager,
  initializeDemoDevices,
  startSimulation,
  stopSimulation,
  IOT_EVENT_TYPES,
};
