import { useEffect, useRef, useState, useCallback } from "react";

export type SseEventType = 
  | "spc_analysis_complete"
  | "cpk_alert"
  | "plan_status_change"
  | "kpi_alert"
  | "heartbeat"
  | "iot_alarm"
  | "iot_alarm_new"
  | "iot_alarm_update"
  | "iot_alarm_ack"
  | "iot_alarm_resolved"
  | "iot_device_status"
  | "iot_metric_update";

export interface SseEvent {
  type: SseEventType;
  data: any;
  timestamp: string;
}

interface UseSSEOptions {
  onSpcAnalysisComplete?: (data: any) => void;
  onCpkAlert?: (data: any) => void;
  onPlanStatusChange?: (data: any) => void;
  onKpiAlert?: (data: any) => void;
  onHeartbeat?: (data: any) => void;
  onOeeUpdate?: (data: any) => void;
  onMachineStatus?: (data: any) => void;
  onSpcRuleViolation?: (data: any) => void;
  onIotAlarm?: (data: any) => void;
  onIotDeviceStatus?: (data: any) => void;
  onEvent?: (event: SseEvent) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

// Global SSE connection singleton to prevent multiple connections
let globalEventSource: EventSource | null = null;
let globalListeners: Map<string, Set<(event: SseEvent) => void>> = new Map();
let globalConnected = false;
let globalReconnectTimeout: NodeJS.Timeout | null = null;
let globalReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BACKOFF_BASE = 5000; // Start with 5 seconds

function getReconnectDelay(): number {
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s
  return Math.min(RECONNECT_BACKOFF_BASE * Math.pow(2, globalReconnectAttempts), 80000);
}

function initGlobalSSE() {
  if (globalEventSource) {
    return;
  }

  // Don't reconnect if max attempts reached
  if (globalReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log("[SSE] Max reconnect attempts reached, stopping");
    return;
  }

  try {
    console.log("[SSE] Initializing global connection...");
    globalEventSource = new EventSource("/api/sse");

    globalEventSource.onopen = () => {
      globalConnected = true;
      globalReconnectAttempts = 0; // Reset on successful connection
      console.log("[SSE] Global connection established");
      
      // Notify all listeners
      globalListeners.forEach((listeners) => {
        listeners.forEach((listener) => {
          listener({ type: "heartbeat", data: { connected: true }, timestamp: new Date().toISOString() });
        });
      });
    };

    globalEventSource.onerror = () => {
      globalConnected = false;
      console.error("[SSE] Global connection error");
      
      // Clean up
      if (globalEventSource) {
        globalEventSource.close();
        globalEventSource = null;
      }

      // Schedule reconnect with backoff
      if (globalReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = getReconnectDelay();
        console.log(`[SSE] Scheduling reconnect in ${delay}ms (attempt ${globalReconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        if (globalReconnectTimeout) {
          clearTimeout(globalReconnectTimeout);
        }
        
        globalReconnectTimeout = setTimeout(() => {
          globalReconnectAttempts++;
          initGlobalSSE();
        }, delay);
      }
    };

    // Setup event listeners
    const eventTypes = [
      "spc_analysis_complete", "cpk_alert", "plan_status_change", "kpi_alert", "heartbeat",
      "iot_alarm", "iot_alarm_new", "iot_alarm_update", "iot_alarm_ack", "iot_alarm_resolved",
      "iot_device_status", "iot_metric_update"
    ];
    eventTypes.forEach((eventType) => {
      globalEventSource!.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SseEvent = {
            type: eventType as SseEventType,
            data: data.data,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          
          // Notify listeners for this event type
          const listeners = globalListeners.get(eventType);
          if (listeners) {
            listeners.forEach((listener) => listener(sseEvent));
          }
          
          // Also notify "all" listeners
          const allListeners = globalListeners.get("all");
          if (allListeners) {
            allListeners.forEach((listener) => listener(sseEvent));
          }
        } catch (error) {
          console.error(`[SSE] Error parsing ${eventType} event:`, error);
        }
      });
    });

  } catch (error) {
    console.error("[SSE] Failed to create EventSource:", error);
  }
}

function closeGlobalSSE() {
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout);
    globalReconnectTimeout = null;
  }
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  globalConnected = false;
  globalReconnectAttempts = 0;
}

function addGlobalListener(eventType: string, listener: (event: SseEvent) => void) {
  if (!globalListeners.has(eventType)) {
    globalListeners.set(eventType, new Set());
  }
  globalListeners.get(eventType)!.add(listener);
  
  // Initialize connection if first listener
  if (!globalEventSource) {
    initGlobalSSE();
  }
}

function removeGlobalListener(eventType: string, listener: (event: SseEvent) => void) {
  const listeners = globalListeners.get(eventType);
  if (listeners) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      globalListeners.delete(eventType);
    }
  }
  
  // Close connection if no more listeners
  let totalListeners = 0;
  globalListeners.forEach((set) => totalListeners += set.size);
  if (totalListeners === 0) {
    closeGlobalSSE();
  }
}

export function useSSE(options: UseSSEOptions = {}) {
  const {
    onSpcAnalysisComplete,
    onCpkAlert,
    onPlanStatusChange,
    onKpiAlert,
    onHeartbeat,
    onIotAlarm,
    onIotDeviceStatus,
    onEvent,
    onConnect,
    onDisconnect,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(globalConnected);
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const callbacksRef = useRef({ onSpcAnalysisComplete, onCpkAlert, onPlanStatusChange, onKpiAlert, onHeartbeat, onIotAlarm, onIotDeviceStatus, onEvent, onConnect, onDisconnect });

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = { onSpcAnalysisComplete, onCpkAlert, onPlanStatusChange, onKpiAlert, onHeartbeat, onIotAlarm, onIotDeviceStatus, onEvent, onConnect, onDisconnect };
  }, [onSpcAnalysisComplete, onCpkAlert, onPlanStatusChange, onKpiAlert, onHeartbeat, onIotAlarm, onIotDeviceStatus, onEvent, onConnect, onDisconnect]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleEvent = (event: SseEvent) => {
      setLastEvent(event);
      setIsConnected(globalConnected);
      setConnectionError(globalConnected ? null : "Disconnected");
      
      // Call generic event handler
      callbacksRef.current.onEvent?.(event);
      
      switch (event.type) {
        case "spc_analysis_complete":
          callbacksRef.current.onSpcAnalysisComplete?.(event.data);
          break;
        case "cpk_alert":
          callbacksRef.current.onCpkAlert?.(event.data);
          break;
        case "plan_status_change":
          callbacksRef.current.onPlanStatusChange?.(event.data);
          break;
        case "kpi_alert":
          callbacksRef.current.onKpiAlert?.(event.data);
          break;
        case "heartbeat":
          if (event.data?.connected) {
            callbacksRef.current.onConnect?.();
          }
          callbacksRef.current.onHeartbeat?.(event.data);
          break;
        case "iot_alarm":
        case "iot_alarm_new":
        case "iot_alarm_update":
        case "iot_alarm_ack":
        case "iot_alarm_resolved":
          callbacksRef.current.onIotAlarm?.(event.data);
          break;
        case "iot_device_status":
          callbacksRef.current.onIotDeviceStatus?.(event.data);
          break;
      }
    };

    // Add listener for all events
    addGlobalListener("all", handleEvent);

    // Initial connection state
    setIsConnected(globalConnected);

    return () => {
      removeGlobalListener("all", handleEvent);
    };
  }, [enabled]);

  const connect = useCallback(() => {
    globalReconnectAttempts = 0;
    initGlobalSSE();
  }, []);

  const disconnect = useCallback(() => {
    closeGlobalSSE();
    setIsConnected(false);
    callbacksRef.current.onDisconnect?.();
  }, []);

  return {
    isConnected,
    lastEvent,
    connectionError,
    connect,
    disconnect,
  };
}

// Simplified hook for just listening to events
export function useSseEvents(enabled: boolean = true) {
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addEvent = useCallback((event: SseEvent) => {
    // Don't add heartbeat events to the list
    if (event.type === "heartbeat") {
      return;
    }
    setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
  }, []);

  useSSE({
    enabled,
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
