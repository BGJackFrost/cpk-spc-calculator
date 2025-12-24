import { Response } from "express";

// Store connected SSE clients
const clients: Map<string, Response> = new Map();

// SSE Server enabled state - disabled by default to prevent loop issues
let sseServerEnabled = false;

// Event types
export type SseEventType = 
  | "spc_analysis_complete"
  | "cpk_alert"
  | "plan_status_change"
  | "heartbeat"
  | "oee_update"
  | "machine_status_change"
  | "maintenance_alert"
  | "realtime_alert"
  | "iot_device_status"
  | "iot_metric_update"
  | "iot_alarm"
  | "iot_alarm_ack"
  | "iot_batch_metrics";

export interface SseEvent {
  type: SseEventType;
  data: any;
  timestamp: Date;
}

// Event log for history
interface SseEventLogEntry {
  id: number;
  type: SseEventType;
  data: any;
  timestamp: Date;
  clientCount: number;
}

const eventLog: SseEventLogEntry[] = [];
let eventLogIdCounter = 0;
const MAX_EVENT_LOG_SIZE = 500;

// Add event to log
function logEvent(event: SseEvent, clientCount: number) {
  eventLogIdCounter++;
  eventLog.push({
    id: eventLogIdCounter,
    type: event.type,
    data: event.data,
    timestamp: event.timestamp,
    clientCount,
  });
  
  // Trim log if too large
  if (eventLog.length > MAX_EVENT_LOG_SIZE) {
    eventLog.splice(0, eventLog.length - MAX_EVENT_LOG_SIZE);
  }
}

// Get event log
export function getSseEventLog(limit: number = 100): SseEventLogEntry[] {
  return eventLog.slice(-limit).reverse();
}

// Clear event log
export function clearSseEventLog() {
  eventLog.length = 0;
  eventLogIdCounter = 0;
}

// SSE Server toggle functions
export function isSseServerEnabled(): boolean {
  return sseServerEnabled;
}

export function setSseServerEnabled(enabled: boolean) {
  sseServerEnabled = enabled;
  console.log(`[SSE] Server ${enabled ? 'enabled' : 'disabled'}`);
  
  if (!enabled) {
    // Disconnect all clients when disabled
    clients.forEach((client, clientId) => {
      try {
        client.end();
      } catch (e) {
        // Ignore errors
      }
    });
    clients.clear();
    stopHeartbeat();
  } else {
    startHeartbeat(30000);
  }
}

// Maximum SSE clients to prevent resource exhaustion
const MAX_SSE_CLIENTS = 100;

// Add a new SSE client
export function addSseClient(clientId: string, res: Response) {
  // Check if SSE server is enabled
  if (!sseServerEnabled) {
    res.status(503).json({ error: "SSE server is disabled" });
    return;
  }
  
  // Check max clients limit
  if (clients.size >= MAX_SSE_CLIENTS) {
    res.status(503).json({ error: "Too many SSE connections" });
    return;
  }
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Store client
  clients.set(clientId, res);
  // Only log when client count changes significantly
  if (clients.size === 1 || clients.size % 10 === 0) {
    console.log(`[SSE] Clients: ${clients.size}`);
  }

  // Send initial connection event
  sendEventToClient(clientId, {
    type: "heartbeat",
    data: { message: "Connected to SSE" },
    timestamp: new Date(),
  });

  // Handle client disconnect
  res.on("close", () => {
    clients.delete(clientId);
    // Only log when client count changes significantly
    if (clients.size === 0 || clients.size % 10 === 0) {
      console.log(`[SSE] Clients: ${clients.size}`);
    }
  });
}

// Remove SSE client
export function removeSseClient(clientId: string) {
  const client = clients.get(clientId);
  if (client) {
    client.end();
    clients.delete(clientId);
  }
}

// Send event to specific client
export function sendEventToClient(clientId: string, event: SseEvent) {
  const client = clients.get(clientId);
  if (client) {
    const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    client.write(eventData);
  }
}

// Broadcast event to all clients
export function broadcastEvent(event: SseEvent) {
  if (!sseServerEnabled) {
    return;
  }
  
  // Log event (except heartbeat)
  if (event.type !== "heartbeat") {
    logEvent(event, clients.size);
  }
  
  const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client, clientId) => {
    try {
      client.write(eventData);
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  });
  
  // Only log non-heartbeat events
  if (event.type !== "heartbeat") {
    console.log(`[SSE] Broadcasted ${event.type} to ${clients.size} clients`);
  }
}

// Send SPC analysis complete event
export function notifySpcAnalysisComplete(data: {
  planId?: number;
  mappingId?: number;
  productCode: string;
  stationName: string;
  cpk: number;
  mean: number;
  alertTriggered: boolean;
}) {
  broadcastEvent({
    type: "spc_analysis_complete",
    data,
    timestamp: new Date(),
  });
}

// Send CPK alert event
export function notifyCpkAlert(data: {
  planId?: number;
  productCode: string;
  stationName: string;
  cpk: number;
  threshold: number;
  severity: "warning" | "critical";
}) {
  broadcastEvent({
    type: "cpk_alert",
    data,
    timestamp: new Date(),
  });
}

// Send plan status change event
export function notifyPlanStatusChange(data: {
  planId: number;
  planName: string;
  oldStatus: string;
  newStatus: string;
}) {
  broadcastEvent({
    type: "plan_status_change",
    data,
    timestamp: new Date(),
  });
}

// Start heartbeat interval (keep connections alive)
let heartbeatInterval: NodeJS.Timeout | null = null;
let heartbeatStarted = false;

export function startHeartbeat(intervalMs: number = 30000) {
  // Only start once and if enabled
  if (heartbeatStarted || !sseServerEnabled) {
    return;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (clients.size > 0 && sseServerEnabled) {
      // Silent heartbeat - don't log every heartbeat
      const eventData = `event: heartbeat\ndata: ${JSON.stringify({ type: "heartbeat", data: { timestamp: new Date().toISOString() }, timestamp: new Date() })}\n\n`;
      clients.forEach((client, clientId) => {
        try {
          client.write(eventData);
        } catch (error) {
          clients.delete(clientId);
        }
      });
    }
  }, intervalMs);
  
  heartbeatStarted = true;
  console.log(`[SSE] Heartbeat started with interval ${intervalMs}ms`);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    heartbeatStarted = false;
    console.log("[SSE] Heartbeat stopped");
  }
}

// Get connected clients count
export function getConnectedClientsCount(): number {
  return clients.size;
}

// Send OEE update event
export function notifyOeeUpdate(data: {
  machineId: number;
  machineName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  shift?: string;
}) {
  broadcastEvent({
    type: "oee_update",
    data,
    timestamp: new Date(),
  });
}

// Send machine status change event
export function notifyMachineStatusChange(data: {
  machineId: number;
  machineName: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}) {
  broadcastEvent({
    type: "machine_status_change",
    data,
    timestamp: new Date(),
  });
}

// Send maintenance alert event
export function notifyMaintenanceAlert(data: {
  machineId: number;
  machineName: string;
  alertType: "scheduled" | "overdue" | "predictive";
  message: string;
  priority: "low" | "medium" | "high" | "critical";
}) {
  broadcastEvent({
    type: "maintenance_alert",
    data,
    timestamp: new Date(),
  });
}

// Send realtime alert event
export function notifyRealtimeAlert(data: {
  alertId: number;
  machineId?: number;
  machineName?: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  acknowledged: boolean;
}) {
  broadcastEvent({
    type: "realtime_alert",
    data,
    timestamp: new Date(),
  });
}

// ============ IoT Events ============

// Send IoT device status change event
export function notifyIotDeviceStatus(data: {
  deviceId: string;
  deviceName: string;
  oldStatus?: string;
  newStatus: string;
  deviceType: string;
  lastSeen: Date;
}) {
  broadcastEvent({
    type: "iot_device_status",
    data,
    timestamp: new Date(),
  });
}

// Send IoT metric update event
export function notifyIotMetricUpdate(data: {
  deviceId: string;
  metricName: string;
  value: number;
  unit: string;
  quality: "good" | "uncertain" | "bad";
}) {
  broadcastEvent({
    type: "iot_metric_update",
    data,
    timestamp: new Date(),
  });
}

// Send IoT alarm event
export function notifyIotAlarm(data: {
  alarmId: string;
  deviceId: string;
  deviceName?: string;
  type: "threshold" | "connection" | "quality" | "system";
  severity: "info" | "warning" | "critical" | "emergency";
  message: string;
}) {
  broadcastEvent({
    type: "iot_alarm",
    data,
    timestamp: new Date(),
  });
}

// Send IoT alarm acknowledgment event
export function notifyIotAlarmAck(data: {
  alarmId: string;
  acknowledgedBy: string;
  acknowledgedAt: Date;
}) {
  broadcastEvent({
    type: "iot_alarm_ack",
    data,
    timestamp: new Date(),
  });
}

// Send IoT batch metrics event
export function notifyIotBatchMetrics(data: {
  metrics: Array<{
    deviceId: string;
    metricName: string;
    value: number;
    unit: string;
  }>;
  count: number;
}) {
  broadcastEvent({
    type: "iot_batch_metrics",
    data,
    timestamp: new Date(),
  });
}
