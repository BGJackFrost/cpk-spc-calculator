import { Response } from "express";

// Store connected SSE clients
const clients: Map<string, Response> = new Map();

// Event types
export type SseEventType = 
  | "spc_analysis_complete"
  | "cpk_alert"
  | "plan_status_change"
  | "heartbeat"
  | "oee_update"
  | "machine_status_change"
  | "maintenance_alert"
  | "realtime_alert";

export interface SseEvent {
  type: SseEventType;
  data: any;
  timestamp: Date;
}

// Add a new SSE client
export function addSseClient(clientId: string, res: Response) {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Store client
  clients.set(clientId, res);
  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${clients.size}`);

  // Send initial connection event
  sendEventToClient(clientId, {
    type: "heartbeat",
    data: { message: "Connected to SSE" },
    timestamp: new Date(),
  });

  // Handle client disconnect
  res.on("close", () => {
    clients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${clients.size}`);
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
  const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client, clientId) => {
    try {
      client.write(eventData);
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  });
  console.log(`[SSE] Broadcasted ${event.type} to ${clients.size} clients`);
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

export function startHeartbeat(intervalMs: number = 30000) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (clients.size > 0) {
      broadcastEvent({
        type: "heartbeat",
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date(),
      });
    }
  }, intervalMs);
  
  console.log(`[SSE] Heartbeat started with interval ${intervalMs}ms`);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
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
