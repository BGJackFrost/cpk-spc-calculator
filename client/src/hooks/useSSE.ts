import { useEffect, useRef, useState, useCallback } from "react";

export type SseEventType = 
  | "spc_analysis_complete"
  | "cpk_alert"
  | "plan_status_change"
  | "heartbeat";

export interface SseEvent {
  type: SseEventType;
  data: any;
  timestamp: string;
}

interface UseSSEOptions {
  onSpcAnalysisComplete?: (data: any) => void;
  onCpkAlert?: (data: any) => void;
  onPlanStatusChange?: (data: any) => void;
  onHeartbeat?: (data: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    onSpcAnalysisComplete,
    onCpkAlert,
    onPlanStatusChange,
    onHeartbeat,
    onError,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource("/api/sse");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        onConnect?.();
        console.log("[SSE] Connected");
      };

      eventSource.onerror = (error) => {
        setIsConnected(false);
        setConnectionError("Connection error");
        onError?.(error);
        onDisconnect?.();
        console.error("[SSE] Connection error:", error);

        // Auto reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[SSE] Attempting to reconnect...");
            connect();
          }, reconnectInterval);
        }
      };

      // Listen for specific event types
      eventSource.addEventListener("spc_analysis_complete", (event) => {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onSpcAnalysisComplete?.(data.data);
      });

      eventSource.addEventListener("cpk_alert", (event) => {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onCpkAlert?.(data.data);
      });

      eventSource.addEventListener("plan_status_change", (event) => {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onPlanStatusChange?.(data.data);
      });

      eventSource.addEventListener("heartbeat", (event) => {
        const data = JSON.parse(event.data);
        setLastEvent(data);
        onHeartbeat?.(data.data);
      });

    } catch (error) {
      console.error("[SSE] Failed to create EventSource:", error);
      setConnectionError("Failed to connect");
    }
  }, [
    onSpcAnalysisComplete,
    onCpkAlert,
    onPlanStatusChange,
    onHeartbeat,
    onError,
    onConnect,
    onDisconnect,
    autoReconnect,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    onDisconnect?.();
    console.log("[SSE] Disconnected");
  }, [onDisconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    connectionError,
    connect,
    disconnect,
  };
}

// Simplified hook for just listening to events
export function useSseEvents() {
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addEvent = useCallback((event: SseEvent) => {
    setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
  }, []);

  useSSE({
    onSpcAnalysisComplete: (data) => addEvent({ type: "spc_analysis_complete", data, timestamp: new Date().toISOString() }),
    onCpkAlert: (data) => addEvent({ type: "cpk_alert", data, timestamp: new Date().toISOString() }),
    onPlanStatusChange: (data) => addEvent({ type: "plan_status_change", data, timestamp: new Date().toISOString() }),
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false),
  });

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    clearEvents,
  };
}
