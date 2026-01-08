/**
 * Edge Simulator WebSocket Service
 * Cung cấp realtime updates cho Edge Simulator Dashboard thông qua WebSocket
 */

import { realtimeWebSocketServer } from '../websocketServer';

// Channel name for Edge Simulator
const EDGE_SIMULATOR_CHANNEL = 'edge-simulator';

// Broadcast interval reference
let broadcastInterval: NodeJS.Timeout | null = null;

/**
 * Broadcast simulator data to all connected clients
 */
export function broadcastSimulatorData(data: {
  deviceId: string;
  timestamp: number;
  metrics: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    vibration?: number;
    power?: number;
    speed?: number;
    [key: string]: number | undefined;
  };
  status: 'online' | 'offline' | 'warning' | 'error';
  alerts?: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }>;
}) {
  realtimeWebSocketServer.broadcastData(EDGE_SIMULATOR_CHANNEL, {
    type: 'simulator_data',
    payload: data,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast simulator status update
 */
export function broadcastSimulatorStatus(status: {
  simulatorId: number;
  name: string;
  isRunning: boolean;
  connectedDevices: number;
  messagesPerSecond: number;
  lastUpdate: number;
}) {
  realtimeWebSocketServer.broadcastData(EDGE_SIMULATOR_CHANNEL, {
    type: 'simulator_status',
    payload: status,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast batch data from multiple devices
 */
export function broadcastBatchData(devices: Array<{
  deviceId: string;
  metrics: Record<string, number>;
  status: string;
}>) {
  realtimeWebSocketServer.broadcastData(EDGE_SIMULATOR_CHANNEL, {
    type: 'batch_data',
    payload: {
      devices,
      count: devices.length,
    },
    timestamp: Date.now(),
  });
}

/**
 * Broadcast alert notification
 */
export function broadcastAlert(alert: {
  deviceId: string;
  alertType: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  value?: number;
  threshold?: number;
}) {
  realtimeWebSocketServer.broadcastAlert({
    type: 'edge_simulator_alert',
    payload: alert,
    timestamp: Date.now(),
  });
}

/**
 * Start automatic broadcasting at specified interval
 */
export function startSimulatorBroadcast(
  intervalMs: number,
  dataGenerator: () => {
    deviceId: string;
    metrics: Record<string, number>;
    status: 'online' | 'offline' | 'warning' | 'error';
  }
) {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
  }

  broadcastInterval = setInterval(() => {
    const data = dataGenerator();
    broadcastSimulatorData({
      ...data,
      timestamp: Date.now(),
    });
  }, intervalMs);

  console.log(`[EdgeSimulatorWS] Started broadcasting every ${intervalMs}ms`);
}

/**
 * Stop automatic broadcasting
 */
export function stopSimulatorBroadcast() {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
    console.log('[EdgeSimulatorWS] Stopped broadcasting');
  }
}

/**
 * Get WebSocket connection info for Edge Simulator
 */
export function getWebSocketInfo() {
  return {
    enabled: true,
    channel: EDGE_SIMULATOR_CHANNEL,
    path: '/ws/realtime',
    connectedClients: realtimeWebSocketServer.getClientCount(),
    broadcastActive: broadcastInterval !== null,
  };
}

/**
 * Notify clients about connection status change
 */
export function notifyConnectionChange(connected: boolean, deviceId?: string) {
  realtimeWebSocketServer.broadcastData(EDGE_SIMULATOR_CHANNEL, {
    type: 'connection_change',
    payload: {
      connected,
      deviceId,
    },
    timestamp: Date.now(),
  });
}
