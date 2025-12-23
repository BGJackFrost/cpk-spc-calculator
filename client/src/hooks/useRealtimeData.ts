/**
 * useRealtimeData - Custom hook cho real-time data updates
 * Phase 3.1 - Real-time Data Processing
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export interface RealtimeEvent {
  type: string;
  channel: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export interface RealtimeConfig {
  channels: string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onMessage?: (event: RealtimeEvent) => void;
}

export interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: RealtimeEvent | null;
  messages: RealtimeEvent[];
  error: string | null;
  reconnectAttempts: number;
}

// Constants
const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const MAX_MESSAGE_HISTORY = 100;
const SSE_ENDPOINT = '/api/sse';

/**
 * Hook for real-time data subscription via SSE
 */
export function useRealtimeData(config: RealtimeConfig) {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    messages: [],
    error: null,
    reconnectAttempts: 0
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Connect to SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const channels = configRef.current.channels.join(',');
      const url = `${SSE_ENDPOINT}?channels=${encodeURIComponent(channels)}`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          error: null
        }));
        configRef.current.onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const realtimeEvent: RealtimeEvent = {
            type: data.type || 'message',
            channel: data.channel || 'default',
            data: data.data || data,
            timestamp: new Date(data.timestamp || Date.now()),
            source: data.source
          };

          setState(prev => ({
            ...prev,
            lastMessage: realtimeEvent,
            messages: [...prev.messages.slice(-MAX_MESSAGE_HISTORY + 1), realtimeEvent]
          }));

          configRef.current.onMessage?.(realtimeEvent);
        } catch (e) {
          console.error('[useRealtimeData] Error parsing message:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[useRealtimeData] SSE error:', error);
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: 'Connection error'
        }));

        configRef.current.onError?.(error);
        eventSource.close();
        eventSourceRef.current = null;

        // Auto reconnect
        if (configRef.current.autoReconnect !== false) {
          scheduleReconnect();
        }
      };

      // Listen for specific event types
      const eventTypes = [
        'spc_data_update',
        'oee_data_update',
        'alert_notification',
        'system_health_update',
        'security_event',
        'iot_device_update',
        'ai_prediction_update',
        'heartbeat'
      ];

      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            const realtimeEvent: RealtimeEvent = {
              type: eventType,
              channel: data.channel || eventType,
              data: data.data || data,
              timestamp: new Date(data.timestamp || Date.now()),
              source: data.source
            };

            setState(prev => ({
              ...prev,
              lastMessage: realtimeEvent,
              messages: [...prev.messages.slice(-MAX_MESSAGE_HISTORY + 1), realtimeEvent]
            }));

            configRef.current.onMessage?.(realtimeEvent);
          } catch (e) {
            console.error(`[useRealtimeData] Error parsing ${eventType}:`, e);
          }
        });
      });

    } catch (error) {
      console.error('[useRealtimeData] Error creating EventSource:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect'
      }));
      configRef.current.onError?.(error);
    }
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));

    configRef.current.onDisconnect?.();
  }, []);

  // Schedule reconnect
  const scheduleReconnect = useCallback(() => {
    const maxAttempts = configRef.current.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
    
    setState(prev => {
      if (prev.reconnectAttempts >= maxAttempts) {
        return {
          ...prev,
          error: 'Max reconnect attempts reached'
        };
      }

      const interval = configRef.current.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, interval);

      return {
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1
      };
    });
  }, [connect]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      lastMessage: null
    }));
  }, []);

  // Effect: Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    clearMessages
  };
}

/**
 * Hook for specific channel subscription
 */
export function useRealtimeChannel(channel: string, onMessage?: (data: any) => void) {
  const [data, setData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected, lastMessage, error } = useRealtimeData({
    channels: [channel],
    onMessage: (event) => {
      if (event.channel === channel || event.type.includes(channel)) {
        setData(event.data);
        setLastUpdate(event.timestamp);
        onMessage?.(event.data);
      }
    }
  });

  return {
    data,
    lastUpdate,
    isConnected,
    error
  };
}

/**
 * Hook for SPC real-time updates
 */
export function useSpcRealtimeData(onUpdate?: (data: any) => void) {
  return useRealtimeChannel('spc:realtime', onUpdate);
}

/**
 * Hook for OEE real-time updates
 */
export function useOeeRealtimeData(onUpdate?: (data: any) => void) {
  return useRealtimeChannel('oee:realtime', onUpdate);
}

/**
 * Hook for alert notifications
 */
export function useAlertNotifications(onAlert?: (alert: any) => void) {
  const [alerts, setAlerts] = useState<any[]>([]);

  const { isConnected, error } = useRealtimeData({
    channels: ['alerts:all'],
    onMessage: (event) => {
      if (event.type === 'alert_notification') {
        setAlerts(prev => [...prev.slice(-99), event.data]);
        onAlert?.(event.data);
      }
    }
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    isConnected,
    error,
    clearAlerts
  };
}

/**
 * Hook for system health updates
 */
export function useSystemHealthData(onUpdate?: (data: any) => void) {
  return useRealtimeChannel('system:health', onUpdate);
}

/**
 * Hook for security events
 */
export function useSecurityEvents(onEvent?: (event: any) => void) {
  const [events, setEvents] = useState<any[]>([]);

  const { isConnected, error } = useRealtimeData({
    channels: ['security:events'],
    onMessage: (event) => {
      if (event.type === 'security_event') {
        setEvents(prev => [...prev.slice(-99), event.data]);
        onEvent?.(event.data);
      }
    }
  });

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isConnected,
    error,
    clearEvents
  };
}

/**
 * Hook for IoT device updates
 */
export function useIotDeviceData(deviceId?: string, onUpdate?: (data: any) => void) {
  const [devices, setDevices] = useState<Map<string, any>>(new Map());

  const { isConnected, error } = useRealtimeData({
    channels: ['iot:devices'],
    onMessage: (event) => {
      if (event.type === 'iot_device_update') {
        const data = event.data;
        if (!deviceId || data.deviceId === deviceId) {
          setDevices(prev => new Map(prev).set(data.deviceId, data));
          onUpdate?.(data);
        }
      }
    }
  });

  return {
    devices: Array.from(devices.values()),
    getDevice: (id: string) => devices.get(id),
    isConnected,
    error
  };
}

/**
 * Hook for AI prediction updates
 */
export function useAiPredictionData(modelId?: string, onUpdate?: (data: any) => void) {
  const [predictions, setPredictions] = useState<any[]>([]);

  const { isConnected, error } = useRealtimeData({
    channels: ['ai:predictions'],
    onMessage: (event) => {
      if (event.type === 'ai_prediction_update') {
        const data = event.data;
        if (!modelId || data.modelId === modelId) {
          setPredictions(prev => [...prev.slice(-99), data]);
          onUpdate?.(data);
        }
      }
    }
  });

  return {
    predictions,
    latestPrediction: predictions[predictions.length - 1],
    isConnected,
    error
  };
}

/**
 * Hook for multiple channel subscriptions
 */
export function useMultiChannelData(channels: string[]) {
  const [channelData, setChannelData] = useState<Record<string, any>>({});

  const { isConnected, messages, error } = useRealtimeData({
    channels,
    onMessage: (event) => {
      setChannelData(prev => ({
        ...prev,
        [event.channel]: event.data
      }));
    }
  });

  return {
    channelData,
    messages,
    isConnected,
    error
  };
}

export default useRealtimeData;
