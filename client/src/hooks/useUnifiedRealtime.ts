/**
 * Unified Realtime Hook - WebSocket + SSE Fallback
 * 
 * Provides a single hook for real-time communication that:
 * - Tries WebSocket first (bidirectional, lower latency)
 * - Falls back to SSE if WebSocket fails
 * - Supports room/channel subscriptions
 * - Auto-reconnect with exponential backoff
 * - Default: off (per user preference)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export type TransportType = "websocket" | "sse" | "none";

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
  transport: TransportType;
}

export interface UseUnifiedRealtimeOptions {
  /** Enable/disable the connection (default: false - off by default) */
  enabled?: boolean;
  /** Preferred transport (default: websocket) */
  preferredTransport?: "websocket" | "sse";
  /** Enable fallback to SSE if WebSocket fails (default: true) */
  enableFallback?: boolean;
  /** Rooms to join (WebSocket only) */
  rooms?: string[];
  /** Channels to subscribe (both WS and SSE) */
  channels?: string[];
  /** Event types to listen for */
  eventTypes?: string[];
  /** Max reconnect attempts before giving up (default: 10) */
  maxReconnectAttempts?: number;
  /** Callbacks */
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: (transport: TransportType) => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

interface ConnectionState {
  transport: TransportType;
  isConnected: boolean;
  reconnectAttempts: number;
  error: string | null;
  clientId: string | null;
  rooms: string[];
  latency: number | null;
}

export function useUnifiedRealtime(options: UseUnifiedRealtimeOptions = {}) {
  const {
    enabled = false, // Default: off
    preferredTransport = "websocket",
    enableFallback = true,
    rooms = [],
    channels = [],
    eventTypes = [],
    maxReconnectAttempts = 10,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [state, setState] = useState<ConnectionState>({
    transport: "none",
    isConnected: false,
    reconnectAttempts: 0,
    error: null,
    clientId: null,
    rooms: [],
    latency: null,
  });

  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeRef = useRef<number>(0);
  const callbacksRef = useRef({ onEvent, onConnect, onDisconnect, onError });
  const stableRooms = useMemo(() => rooms, [rooms.join(",")]);
  const stableChannels = useMemo(() => channels, [channels.join(",")]);
  const stableEventTypes = useMemo(() => eventTypes, [eventTypes.join(",")]);

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = { onEvent, onConnect, onDisconnect, onError };
  }, [onEvent, onConnect, onDisconnect, onError]);

  // Handle incoming event
  const handleEvent = useCallback((type: string, data: any, transport: TransportType) => {
    // Filter by event types if specified
    if (stableEventTypes.length > 0 && !stableEventTypes.includes(type)) return;
    if (type === "heartbeat" || type === "pong" || type === "connected" || type === "subscribed" || type === "room_joined" || type === "room_left" || type === "identified") return;

    const event: RealtimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      transport,
    };

    setEvents((prev) => [...prev.slice(-199), event]);
    callbacksRef.current.onEvent?.(event);
  }, [stableEventTypes]);

  // ─── WebSocket Connection ─────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const clientId = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const url = `${protocol}//${window.location.host}/ws?clientId=${clientId}`;
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({
          ...prev,
          transport: "websocket",
          isConnected: true,
          reconnectAttempts: 0,
          error: null,
          clientId,
        }));
        callbacksRef.current.onConnect?.("websocket");

        // Join rooms
        stableRooms.forEach((room) => {
          ws.send(JSON.stringify({ type: "join_room", data: { room } }));
        });

        // Subscribe channels
        stableChannels.forEach((channel) => {
          ws.send(JSON.stringify({ type: "subscribe", channel }));
        });

        // Start ping interval
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimeRef.current = Date.now();
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Handle pong for latency measurement
          if (msg.type === "pong" && pingTimeRef.current > 0) {
            const latency = Date.now() - pingTimeRef.current;
            pingTimeRef.current = 0;
            setState((prev) => ({ ...prev, latency }));
            return;
          }

          // Handle room updates
          if (msg.type === "room_joined" || msg.type === "room_left") {
            setState((prev) => ({ ...prev, rooms: msg.data?.rooms || [] }));
            return;
          }

          handleEvent(msg.type, msg.data, "websocket");
        } catch {}
      };

      ws.onclose = (event) => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        wsRef.current = null;
        
        setState((prev) => ({
          ...prev,
          isConnected: false,
          latency: null,
        }));
        callbacksRef.current.onDisconnect?.();

        // Try reconnect or fallback
        setState((prev) => {
          const newAttempts = prev.reconnectAttempts + 1;
          if (newAttempts <= maxReconnectAttempts) {
            const delay = Math.min(5000 * Math.pow(1.5, newAttempts - 1), 60000);
            reconnectTimerRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else if (enableFallback) {
            // Fallback to SSE
            connectSSE();
          }
          return { ...prev, reconnectAttempts: newAttempts };
        });
      };

      ws.onerror = () => {
        setState((prev) => ({ ...prev, error: "WebSocket connection error" }));
        callbacksRef.current.onError?.("WebSocket connection error");
      };
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
      if (enableFallback) connectSSE();
    }
  }, [stableRooms, stableChannels, handleEvent, maxReconnectAttempts, enableFallback]);

  // ─── SSE Connection (Fallback) ────────────────────────────────
  const connectSSE = useCallback(() => {
    if (esRef.current?.readyState === EventSource.OPEN) return;

    try {
      const es = new EventSource("/api/sse");
      esRef.current = es;

      es.onopen = () => {
        setState((prev) => ({
          ...prev,
          transport: "sse",
          isConnected: true,
          reconnectAttempts: 0,
          error: null,
        }));
        callbacksRef.current.onConnect?.("sse");
      };

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleEvent(msg.type, msg.data, "sse");
        } catch {}
      };

      es.onerror = () => {
        esRef.current?.close();
        esRef.current = null;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: "SSE connection error",
        }));
        callbacksRef.current.onDisconnect?.();
        callbacksRef.current.onError?.("SSE connection error");
      };
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message }));
    }
  }, [handleEvent]);

  // ─── Send Message (WebSocket only) ────────────────────────────
  const sendMessage = useCallback((type: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, []);

  // ─── Room Management ──────────────────────────────────────────
  const joinRoom = useCallback((room: string) => {
    return sendMessage("join_room", { room });
  }, [sendMessage]);

  const leaveRoom = useCallback((room: string) => {
    return sendMessage("leave_room", { room });
  }, [sendMessage]);

  // ─── Channel Management ───────────────────────────────────────
  const subscribe = useCallback((channel: string) => {
    return sendMessage("subscribe", undefined) || 
           (wsRef.current?.readyState === WebSocket.OPEN && 
            (wsRef.current.send(JSON.stringify({ type: "subscribe", channel })), true));
  }, [sendMessage]);

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", channel }));
      return true;
    }
    return false;
  }, []);

  // ─── Identify User ────────────────────────────────────────────
  const identify = useCallback((userId: number, userName?: string) => {
    return sendMessage("identify", { userId, userName });
  }, [sendMessage]);

  // ─── Connect/Disconnect ───────────────────────────────────────
  const connect = useCallback(() => {
    if (preferredTransport === "websocket") {
      connectWebSocket();
    } else {
      connectSSE();
    }
  }, [preferredTransport, connectWebSocket, connectSSE]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState({
      transport: "none",
      isConnected: false,
      reconnectAttempts: 0,
      error: null,
      clientId: null,
      rooms: [],
      latency: null,
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // ─── Auto-connect/disconnect based on enabled ─────────────────
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [enabled]);

  return {
    ...state,
    events,
    sendMessage,
    joinRoom,
    leaveRoom,
    subscribe,
    unsubscribe,
    identify,
    connect,
    disconnect,
    reconnect,
    clearEvents,
  };
}

export default useUnifiedRealtime;
