/**
 * WebSocket Service - CPK/SPC Calculator System
 * 
 * Provides bidirectional real-time communication replacing SSE.
 * Features:
 * - Room/channel system for targeted broadcasts
 * - Client→Server message handling
 * - Auto-reconnect support via ping/pong
 * - Backward compatible with existing SSE event types
 * - Toggleable on/off (default: off per user preference)
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { IncomingMessage } from "http";

// ─── Types ──────────────────────────────────────────────────────

export interface WsClient {
  id: string;
  ws: WebSocket;
  userId?: number;
  userName?: string;
  rooms: Set<string>;
  connectedAt: Date;
  lastPing: Date;
  isAlive: boolean;
}

export interface WsMessage {
  type: string;
  data?: any;
  room?: string;
  timestamp?: string;
}

export interface WsIncomingMessage {
  action: string;
  room?: string;
  data?: any;
}

// ─── State ──────────────────────────────────────────────────────

const clients = new Map<string, WsClient>();
let wss: WebSocketServer | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let wsEnabled = false; // Default: off per user preference
let messageHandlers = new Map<string, (client: WsClient, data: any) => void>();

// Event log for debugging
interface WsEventLog {
  id: number;
  type: string;
  data: any;
  timestamp: Date;
  clientCount: number;
}
const eventLog: WsEventLog[] = [];
let eventLogCounter = 0;
const MAX_EVENT_LOG = 200;

// ─── Core Functions ─────────────────────────────────────────────

export function isWsEnabled(): boolean {
  return wsEnabled;
}

export function setWsEnabled(enabled: boolean): void {
  wsEnabled = enabled;
  console.log(`[WebSocket] Server ${enabled ? 'enabled' : 'disabled'}`);
  
  if (!enabled && wss) {
    // Disconnect all clients when disabled
    clients.forEach((client) => {
      sendToClient(client.id, { type: "server_disabled", data: { message: "WebSocket server has been disabled" } });
      client.ws.close(1000, "Server disabled");
    });
  }
}

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ 
    server, 
    path: "/ws",
    maxPayload: 1024 * 64, // 64KB max message size
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    if (!wsEnabled) {
      ws.close(1013, "WebSocket server is disabled");
      return;
    }

    // Generate client ID
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const clientId = url.searchParams.get("clientId") || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Check max clients
    if (clients.size >= 200) {
      ws.close(1013, "Too many connections");
      return;
    }

    const client: WsClient = {
      id: clientId,
      ws,
      rooms: new Set(["global"]), // All clients join global room
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
    };

    clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId} (total: ${clients.size})`);

    // Send welcome message
    sendToClient(clientId, {
      type: "connected",
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        rooms: Array.from(client.rooms),
      },
    });

    // Handle incoming messages
    ws.on("message", (raw: Buffer) => {
      try {
        const msg: WsIncomingMessage = JSON.parse(raw.toString());
        handleClientMessage(client, msg);
      } catch (err) {
        sendToClient(clientId, { type: "error", data: { message: "Invalid message format" } });
      }
    });

    // Handle pong
    ws.on("pong", () => {
      client.isAlive = true;
      client.lastPing = new Date();
    });

    // Handle close
    ws.on("close", (code, reason) => {
      clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId} (code: ${code}, total: ${clients.size})`);
    });

    // Handle error
    ws.on("error", (err) => {
      console.error(`[WebSocket] Client error: ${clientId}`, err.message);
      clients.delete(clientId);
    });
  });

  // Start ping interval (every 30s)
  startPingInterval();

  console.log("[WebSocket] Server initialized on /ws");
  return wss;
}

// ─── Client Message Handling ────────────────────────────────────

function handleClientMessage(client: WsClient, msg: WsIncomingMessage): void {
  switch (msg.action) {
    case "join_room":
      if (msg.room) {
        client.rooms.add(msg.room);
        sendToClient(client.id, { 
          type: "room_joined", 
          data: { room: msg.room, rooms: Array.from(client.rooms) } 
        });
      }
      break;

    case "leave_room":
      if (msg.room && msg.room !== "global") {
        client.rooms.delete(msg.room);
        sendToClient(client.id, { 
          type: "room_left", 
          data: { room: msg.room, rooms: Array.from(client.rooms) } 
        });
      }
      break;

    case "identify":
      if (msg.data?.userId) {
        client.userId = msg.data.userId;
        client.userName = msg.data.userName;
        // Auto-join user-specific room
        client.rooms.add(`user:${msg.data.userId}`);
        sendToClient(client.id, { 
          type: "identified", 
          data: { userId: msg.data.userId, rooms: Array.from(client.rooms) } 
        });
      }
      break;

    case "ping":
      sendToClient(client.id, { type: "pong", data: { serverTime: new Date().toISOString() } });
      break;

    default:
      // Check custom handlers
      const handler = messageHandlers.get(msg.action);
      if (handler) {
        handler(client, msg.data);
      }
      break;
  }
}

// ─── Send Functions ─────────────────────────────────────────────

export function sendToClient(clientId: string, message: WsMessage): boolean {
  const client = clients.get(clientId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) return false;

  try {
    client.ws.send(JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    }));
    return true;
  } catch (err) {
    console.error(`[WebSocket] Send error to ${clientId}:`, (err as Error).message);
    return false;
  }
}

export function broadcastWs(message: WsMessage, room?: string): number {
  if (!wsEnabled) return 0;

  let sent = 0;
  const payload = JSON.stringify({
    ...message,
    timestamp: message.timestamp || new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    
    // If room specified, only send to clients in that room
    if (room && !client.rooms.has(room)) return;

    try {
      client.ws.send(payload);
      sent++;
    } catch (err) {
      // Client will be cleaned up by ping
    }
  });

  // Log event
  logEvent(message.type, message.data, sent);

  return sent;
}

export function broadcastToUser(userId: number, message: WsMessage): number {
  return broadcastWs(message, `user:${userId}`);
}

// ─── SSE-Compatible Broadcast ───────────────────────────────────
// These functions mirror the SSE broadcast pattern for backward compatibility

export function wsBroadcastEvent(type: string, data: any): number {
  return broadcastWs({ type, data });
}

// ─── Room Management ────────────────────────────────────────────

export function getRooms(): Map<string, number> {
  const rooms = new Map<string, number>();
  clients.forEach((client) => {
    client.rooms.forEach((room) => {
      rooms.set(room, (rooms.get(room) || 0) + 1);
    });
  });
  return rooms;
}

export function getClientsInRoom(room: string): string[] {
  const result: string[] = [];
  clients.forEach((client) => {
    if (client.rooms.has(room)) {
      result.push(client.id);
    }
  });
  return result;
}

// ─── Message Handler Registration ───────────────────────────────

export function registerMessageHandler(action: string, handler: (client: WsClient, data: any) => void): void {
  messageHandlers.set(action, handler);
}

export function unregisterMessageHandler(action: string): void {
  messageHandlers.delete(action);
}

// ─── Ping/Pong Heartbeat ────────────────────────────────────────

function startPingInterval(): void {
  if (pingInterval) clearInterval(pingInterval);
  
  pingInterval = setInterval(() => {
    clients.forEach((client, id) => {
      if (!client.isAlive) {
        console.log(`[WebSocket] Client ${id} timed out`);
        client.ws.terminate();
        clients.delete(id);
        return;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        clients.delete(id);
      }
    });
  }, 30000);
}

export function stopPingInterval(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

// ─── Status & Monitoring ────────────────────────────────────────

export function getWsStatus() {
  const clientList = Array.from(clients.values()).map((c) => ({
    id: c.id,
    userId: c.userId,
    userName: c.userName,
    rooms: Array.from(c.rooms),
    connectedAt: c.connectedAt.toISOString(),
    isAlive: c.isAlive,
  }));

  return {
    enabled: wsEnabled,
    totalClients: clients.size,
    clients: clientList,
    rooms: Object.fromEntries(getRooms()),
    uptime: wss ? "running" : "stopped",
  };
}

export function getConnectedWsCount(): number {
  return clients.size;
}

// ─── Event Log ──────────────────────────────────────────────────

function logEvent(type: string, data: any, clientCount: number): void {
  eventLog.push({
    id: ++eventLogCounter,
    type,
    data,
    timestamp: new Date(),
    clientCount,
  });
  if (eventLog.length > MAX_EVENT_LOG) {
    eventLog.splice(0, eventLog.length - MAX_EVENT_LOG);
  }
}

export function getWsEventLog(limit: number = 50): WsEventLog[] {
  return eventLog.slice(-limit);
}

export function clearWsEventLog(): void {
  eventLog.length = 0;
}

// ─── Cleanup ────────────────────────────────────────────────────

export function shutdownWebSocket(): void {
  stopPingInterval();
  
  clients.forEach((client) => {
    try {
      client.ws.close(1001, "Server shutting down");
    } catch {}
  });
  clients.clear();

  if (wss) {
    wss.close();
    wss = null;
  }

  console.log("[WebSocket] Server shut down");
}
