/**
 * useRealtimeSSE Hook
 * Hook để subscribe realtime updates qua Server-Sent Events
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// Event types
export type SSEEventType = 
  | 'floor_plan_machine_update'
  | 'floor_plan_stats_update'
  | 'avi_aoi_inspection_result'
  | 'avi_aoi_defect_detected'
  | 'avi_aoi_stats_update'
  | 'machine_status_change'
  | 'oee_update'
  | 'heartbeat';

export interface SSEEvent<T = any> {
  type: SSEEventType;
  data: T;
  timestamp: string;
}

// Machine update data
export interface MachineUpdateData {
  machineId: number;
  machineName: string;
  status: string;
  oee: number;
  cycleTime: number;
  defectRate: number;
  x?: number;
  y?: number;
  productionLineId?: number;
}

// Floor plan stats data
export interface FloorPlanStatsData {
  floorPlanId?: number;
  total: number;
  running: number;
  idle: number;
  error: number;
  maintenance: number;
  offline: number;
  avgOee: number;
}

// Inspection result data
export interface InspectionResultData {
  inspectionId: string;
  serialNumber: string;
  machineId: number;
  machineName: string;
  productId?: number;
  productName?: string;
  result: 'pass' | 'fail' | 'warning';
  defectCount: number;
  cycleTime: number;
  confidence: number;
  imageUrl?: string;
}

// Defect detected data
export interface DefectDetectedData {
  inspectionId: string;
  machineId: number;
  machineName: string;
  defectType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  location?: { x: number; y: number; width: number; height: number };
  imageUrl?: string;
}

// AVI/AOI stats data
export interface AviAoiStatsData {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  passRate: string;
  failRate: string;
  timeRange: string;
}

interface UseRealtimeSSEOptions {
  enabled?: boolean;
  eventTypes?: SSEEventType[];
  onMachineUpdate?: (data: MachineUpdateData) => void;
  onFloorPlanStatsUpdate?: (data: FloorPlanStatsData) => void;
  onInspectionResult?: (data: InspectionResultData) => void;
  onDefectDetected?: (data: DefectDetectedData) => void;
  onAviAoiStatsUpdate?: (data: AviAoiStatsData) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseRealtimeSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useRealtimeSSE(options: UseRealtimeSSEOptions = {}): UseRealtimeSSEReturn {
  const {
    enabled = true,
    eventTypes,
    onMachineUpdate,
    onFloorPlanStatsUpdate,
    onInspectionResult,
    onDefectDetected,
    onAviAoiStatsUpdate,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    cleanup();
    
    try {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const url = `/api/sse?clientId=${clientId}`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        
        const err = new Error('SSE connection error');
        setError(err);
        onError?.(err);
        onDisconnect?.();
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      const handleEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          
          if (eventTypes && !eventTypes.includes(data.type)) {
            return;
          }
          
          setLastEvent(data);
          
          switch (data.type) {
            case 'floor_plan_machine_update':
              onMachineUpdate?.(data.data as MachineUpdateData);
              break;
            case 'floor_plan_stats_update':
              onFloorPlanStatsUpdate?.(data.data as FloorPlanStatsData);
              break;
            case 'avi_aoi_inspection_result':
              onInspectionResult?.(data.data as InspectionResultData);
              break;
            case 'avi_aoi_defect_detected':
              onDefectDetected?.(data.data as DefectDetectedData);
              break;
            case 'avi_aoi_stats_update':
              onAviAoiStatsUpdate?.(data.data as AviAoiStatsData);
              break;
          }
        } catch (err) {
          console.error('[SSE] Error parsing event:', err);
        }
      };

      const allEventTypes: SSEEventType[] = [
        'floor_plan_machine_update',
        'floor_plan_stats_update',
        'avi_aoi_inspection_result',
        'avi_aoi_defect_detected',
        'avi_aoi_stats_update',
        'machine_status_change',
        'oee_update',
        'heartbeat',
      ];

      allEventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, handleEvent);
      });

      eventSource.onmessage = handleEvent;

    } catch (err) {
      setError(err as Error);
      onError?.(err as Error);
    }
  }, [enabled, eventTypes, onMachineUpdate, onFloorPlanStatsUpdate, onInspectionResult, onDefectDetected, onAviAoiStatsUpdate, onError, onConnect, onDisconnect, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    onDisconnect?.();
  }, [cleanup, onDisconnect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      cleanup();
    };
  }, [enabled, connect, disconnect, cleanup]);

  return {
    isConnected,
    lastEvent,
    error,
    reconnect,
    disconnect,
  };
}

// Specialized hook for Floor Plan Live
export function useFloorPlanSSE(options: {
  enabled?: boolean;
  onMachineUpdate?: (data: MachineUpdateData) => void;
  onStatsUpdate?: (data: FloorPlanStatsData) => void;
} = {}) {
  return useRealtimeSSE({
    enabled: options.enabled,
    eventTypes: ['floor_plan_machine_update', 'floor_plan_stats_update', 'machine_status_change', 'oee_update'],
    onMachineUpdate: options.onMachineUpdate,
    onFloorPlanStatsUpdate: options.onStatsUpdate,
  });
}

// Specialized hook for AVI/AOI Dashboard
export function useAviAoiSSE(options: {
  enabled?: boolean;
  onInspectionResult?: (data: InspectionResultData) => void;
  onDefectDetected?: (data: DefectDetectedData) => void;
  onStatsUpdate?: (data: AviAoiStatsData) => void;
} = {}) {
  return useRealtimeSSE({
    enabled: options.enabled,
    eventTypes: ['avi_aoi_inspection_result', 'avi_aoi_defect_detected', 'avi_aoi_stats_update'],
    onInspectionResult: options.onInspectionResult,
    onDefectDetected: options.onDefectDetected,
    onAviAoiStatsUpdate: options.onStatsUpdate,
  });
}

export default useRealtimeSSE;
