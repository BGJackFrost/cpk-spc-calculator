import { useState, useEffect, useCallback, useRef } from "react";

// Types
export interface IotDevice {
  id: string;
  name: string;
  type: "sensor" | "plc" | "gateway" | "controller";
  status: "online" | "offline" | "warning" | "error";
  lastSeen: Date;
  metrics: Record<string, number>;
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

export interface IotRealtimeState {
  devices: Map<string, IotDevice>;
  alarms: IotAlarm[];
  metricHistory: Map<string, IotMetricData[]>;
  isConnected: boolean;
  lastUpdate: Date | null;
}

export interface UseIotRealtimeOptions {
  enabled?: boolean;
  maxHistorySize?: number;
  onDeviceStatusChange?: (deviceId: string, oldStatus: string, newStatus: string) => void;
  onAlarm?: (alarm: IotAlarm) => void;
  onMetricUpdate?: (metric: IotMetricData) => void;
}

export function useIotRealtime(options: UseIotRealtimeOptions = {}) {
  const {
    enabled = true,
    maxHistorySize = 100,
    onDeviceStatusChange,
    onAlarm,
    onMetricUpdate,
  } = options;

  const [state, setState] = useState<IotRealtimeState>({
    devices: new Map(),
    alarms: [],
    metricHistory: new Map(),
    isConnected: false,
    lastUpdate: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const clientId = `iot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      console.log("[IoT Realtime] Connected to SSE");
    };

    eventSource.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      console.log("[IoT Realtime] SSE connection error, reconnecting...");

      // Reconnect after delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    // Handle IoT device status events
    eventSource.addEventListener("iot_device_status", (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data.data;

        setState((prev) => {
          const devices = new Map(prev.devices);
          const existingDevice = devices.get(payload.deviceId);
          
          devices.set(payload.deviceId, {
            id: payload.deviceId,
            name: payload.deviceName || existingDevice?.name || payload.deviceId,
            type: payload.deviceType || existingDevice?.type || "sensor",
            status: payload.newStatus,
            lastSeen: new Date(payload.lastSeen),
            metrics: existingDevice?.metrics || {},
          });

          return {
            ...prev,
            devices,
            lastUpdate: new Date(),
          };
        });

        if (onDeviceStatusChange && payload.oldStatus) {
          onDeviceStatusChange(payload.deviceId, payload.oldStatus, payload.newStatus);
        }
      } catch (error) {
        console.error("[IoT Realtime] Error parsing device status:", error);
      }
    });

    // Handle IoT metric update events
    eventSource.addEventListener("iot_metric_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data.data;

        const metric: IotMetricData = {
          deviceId: payload.deviceId,
          metricName: payload.metricName,
          value: payload.value,
          unit: payload.unit,
          timestamp: new Date(data.timestamp),
          quality: payload.quality || "good",
        };

        setState((prev) => {
          // Update metric history
          const metricHistory = new Map(prev.metricHistory);
          const key = `${metric.deviceId}:${metric.metricName}`;
          const history = metricHistory.get(key) || [];
          
          if (history.length >= maxHistorySize) {
            history.shift();
          }
          history.push(metric);
          metricHistory.set(key, history);

          // Update device metrics
          const devices = new Map(prev.devices);
          const device = devices.get(metric.deviceId);
          if (device) {
            device.metrics[metric.metricName] = metric.value;
            device.lastSeen = new Date();
            devices.set(metric.deviceId, { ...device });
          }

          return {
            ...prev,
            devices,
            metricHistory,
            lastUpdate: new Date(),
          };
        });

        if (onMetricUpdate) {
          onMetricUpdate(metric);
        }
      } catch (error) {
        console.error("[IoT Realtime] Error parsing metric update:", error);
      }
    });

    // Handle IoT alarm events
    eventSource.addEventListener("iot_alarm", (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data.data;

        const alarm: IotAlarm = {
          id: payload.alarmId,
          deviceId: payload.deviceId,
          type: payload.type,
          severity: payload.severity,
          message: payload.message,
          timestamp: new Date(data.timestamp),
          acknowledged: false,
        };

        setState((prev) => ({
          ...prev,
          alarms: [alarm, ...prev.alarms].slice(0, 100), // Keep last 100 alarms
          lastUpdate: new Date(),
        }));

        if (onAlarm) {
          onAlarm(alarm);
        }
      } catch (error) {
        console.error("[IoT Realtime] Error parsing alarm:", error);
      }
    });

    // Handle IoT alarm acknowledgment events
    eventSource.addEventListener("iot_alarm_ack", (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data.data;

        setState((prev) => ({
          ...prev,
          alarms: prev.alarms.map((alarm) =>
            alarm.id === payload.alarmId
              ? {
                  ...alarm,
                  acknowledged: true,
                  acknowledgedBy: payload.acknowledgedBy,
                  acknowledgedAt: new Date(payload.acknowledgedAt),
                }
              : alarm
          ),
          lastUpdate: new Date(),
        }));
      } catch (error) {
        console.error("[IoT Realtime] Error parsing alarm ack:", error);
      }
    });

    // Handle batch metrics events
    eventSource.addEventListener("iot_batch_metrics", (event) => {
      try {
        const data = JSON.parse(event.data);
        const payload = data.data;

        setState((prev) => {
          const metricHistory = new Map(prev.metricHistory);
          const devices = new Map(prev.devices);

          payload.metrics.forEach((m: any) => {
            const key = `${m.deviceId}:${m.metricName}`;
            const history = metricHistory.get(key) || [];
            
            if (history.length >= maxHistorySize) {
              history.shift();
            }
            history.push({
              deviceId: m.deviceId,
              metricName: m.metricName,
              value: m.value,
              unit: m.unit,
              timestamp: new Date(data.timestamp),
              quality: "good",
            });
            metricHistory.set(key, history);

            // Update device metrics
            const device = devices.get(m.deviceId);
            if (device) {
              device.metrics[m.metricName] = m.value;
              device.lastSeen = new Date();
              devices.set(m.deviceId, { ...device });
            }
          });

          return {
            ...prev,
            devices,
            metricHistory,
            lastUpdate: new Date(),
          };
        });
      } catch (error) {
        console.error("[IoT Realtime] Error parsing batch metrics:", error);
      }
    });
  }, [enabled, maxHistorySize, onDeviceStatusChange, onAlarm, onMetricUpdate]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Helper functions
  const getDevice = useCallback(
    (deviceId: string) => state.devices.get(deviceId),
    [state.devices]
  );

  const getDeviceMetrics = useCallback(
    (deviceId: string) => {
      const device = state.devices.get(deviceId);
      return device?.metrics || {};
    },
    [state.devices]
  );

  const getMetricHistory = useCallback(
    (deviceId: string, metricName: string) => {
      const key = `${deviceId}:${metricName}`;
      return state.metricHistory.get(key) || [];
    },
    [state.metricHistory]
  );

  const getActiveAlarms = useCallback(
    () => state.alarms.filter((a) => !a.acknowledged),
    [state.alarms]
  );

  const getAlarmsByDevice = useCallback(
    (deviceId: string) => state.alarms.filter((a) => a.deviceId === deviceId),
    [state.alarms]
  );

  const getDevicesByStatus = useCallback(
    (status: IotDevice["status"]) =>
      Array.from(state.devices.values()).filter((d) => d.status === status),
    [state.devices]
  );

  const getAllDevices = useCallback(
    () => Array.from(state.devices.values()),
    [state.devices]
  );

  const getStats = useCallback(() => {
    const devices = Array.from(state.devices.values());
    const activeAlarms = state.alarms.filter((a) => !a.acknowledged);

    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => d.status === "online").length,
      offlineDevices: devices.filter((d) => d.status === "offline").length,
      warningDevices: devices.filter((d) => d.status === "warning").length,
      errorDevices: devices.filter((d) => d.status === "error").length,
      activeAlarms: activeAlarms.length,
      criticalAlarms: activeAlarms.filter(
        (a) => a.severity === "critical" || a.severity === "emergency"
      ).length,
    };
  }, [state.devices, state.alarms]);

  return {
    // State
    devices: state.devices,
    alarms: state.alarms,
    metricHistory: state.metricHistory,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,

    // Actions
    connect,
    disconnect,

    // Helpers
    getDevice,
    getDeviceMetrics,
    getMetricHistory,
    getActiveAlarms,
    getAlarmsByDevice,
    getDevicesByStatus,
    getAllDevices,
    getStats,
  };
}

export default useIotRealtime;
