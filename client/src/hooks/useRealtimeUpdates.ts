import { useEffect, useRef, useState, useCallback } from "react";

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
  timestamp: string;
}

export interface OeeUpdateData {
  machineId: number;
  machineName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  shift?: string;
}

export interface MachineStatusData {
  machineId: number;
  machineName: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}

export interface MaintenanceAlertData {
  machineId: number;
  machineName: string;
  alertType: "scheduled" | "overdue" | "predictive";
  message: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface RealtimeAlertData {
  alertId: number;
  machineId?: number;
  machineName?: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  acknowledged: boolean;
}

interface UseRealtimeUpdatesOptions {
  onOeeUpdate?: (data: OeeUpdateData) => void;
  onMachineStatusChange?: (data: MachineStatusData) => void;
  onMaintenanceAlert?: (data: MaintenanceAlertData) => void;
  onRealtimeAlert?: (data: RealtimeAlertData) => void;
  onCpkAlert?: (data: any) => void;
  onSpcAnalysisComplete?: (data: any) => void;
  enabled?: boolean;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const {
    onOeeUpdate,
    onMachineStatusChange,
    onMaintenanceAlert,
    onRealtimeAlert,
    onCpkAlert,
    onSpcAnalysisComplete,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Store callbacks in refs to avoid infinite loop from dependency changes
  const onOeeUpdateRef = useRef(onOeeUpdate);
  const onMachineStatusChangeRef = useRef(onMachineStatusChange);
  const onMaintenanceAlertRef = useRef(onMaintenanceAlert);
  const onRealtimeAlertRef = useRef(onRealtimeAlert);
  const onCpkAlertRef = useRef(onCpkAlert);
  const onSpcAnalysisCompleteRef = useRef(onSpcAnalysisComplete);

  // Update refs when callbacks change
  useEffect(() => {
    onOeeUpdateRef.current = onOeeUpdate;
    onMachineStatusChangeRef.current = onMachineStatusChange;
    onMaintenanceAlertRef.current = onMaintenanceAlert;
    onRealtimeAlertRef.current = onRealtimeAlert;
    onCpkAlertRef.current = onCpkAlert;
    onSpcAnalysisCompleteRef.current = onSpcAnalysisComplete;
  }, [onOeeUpdate, onMachineStatusChange, onMaintenanceAlert, onRealtimeAlert, onCpkAlert, onSpcAnalysisComplete]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      console.log("[SSE] Connected to server");
    };

    eventSource.onerror = (error) => {
      console.error("[SSE] Connection error:", error);
      setIsConnected(false);
      setConnectionError("Connection lost");
      
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setConnectionError("Max reconnection attempts reached");
      }
    };

    // Listen for specific event types
    eventSource.addEventListener("heartbeat", (event) => {
      setLastHeartbeat(new Date());
    });

    eventSource.addEventListener("oee_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        onOeeUpdateRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing oee_update:", e);
      }
    });

    eventSource.addEventListener("machine_status_change", (event) => {
      try {
        const data = JSON.parse(event.data);
        onMachineStatusChangeRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing machine_status_change:", e);
      }
    });

    eventSource.addEventListener("maintenance_alert", (event) => {
      try {
        const data = JSON.parse(event.data);
        onMaintenanceAlertRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing maintenance_alert:", e);
      }
    });

    eventSource.addEventListener("realtime_alert", (event) => {
      try {
        const data = JSON.parse(event.data);
        onRealtimeAlertRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing realtime_alert:", e);
      }
    });

    eventSource.addEventListener("cpk_alert", (event) => {
      try {
        const data = JSON.parse(event.data);
        onCpkAlertRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing cpk_alert:", e);
      }
    });

    eventSource.addEventListener("spc_analysis_complete", (event) => {
      try {
        const data = JSON.parse(event.data);
        onSpcAnalysisCompleteRef.current?.(data.data);
      } catch (e) {
        console.error("[SSE] Error parsing spc_analysis_complete:", e);
      }
    });
  }, []); // Empty deps - connect only depends on refs which are stable

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
  }, []);

  useEffect(() => {
    // Check if SSE is enabled in localStorage
    const sseEnabled = localStorage.getItem('sseEnabled') !== 'false';
    
    if (enabled && sseEnabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastHeartbeat,
    connectionError,
    reconnect: connect,
    disconnect,
  };
}
