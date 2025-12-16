import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(channels: string[] = [], options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Subscribe to channels
        channels.forEach((channel) => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }, [channels, onConnect, onDisconnect, onError, onMessage, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', channel });
  }, [send]);

  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', channel });
  }, [send]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
    reconnect: connect
  };
}

// Hook for machine status updates
export function useMachineStatus(machineId?: number) {
  const [status, setStatus] = useState<any>(null);
  const channels = machineId ? [`machine_${machineId}`, 'machine_status'] : ['machine_status'];

  const { isConnected, lastMessage } = useWebSocket(channels, {
    onMessage: (message) => {
      if (message.type === 'update' && message.data) {
        if (!machineId || message.data.machineId === machineId) {
          setStatus(message.data);
        }
      }
    }
  });

  return { isConnected, status };
}

// Hook for OEE updates
export function useOEEUpdates(machineId?: number) {
  const [oeeData, setOEEData] = useState<any>(null);
  const channels = machineId ? [`oee_${machineId}`, 'oee_updates'] : ['oee_updates'];

  const { isConnected, lastMessage } = useWebSocket(channels, {
    onMessage: (message) => {
      if (message.type === 'update' && message.data) {
        if (!machineId || message.data.machineId === machineId) {
          setOEEData(message.data);
        }
      }
    }
  });

  return { isConnected, data: oeeData };
}

// Hook for SPC alerts
export function useSPCAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  const { isConnected } = useWebSocket(['spc_alerts'], {
    onMessage: (message) => {
      if (message.type === 'spc_alert' && message.data) {
        setAlerts((prev) => [message.data, ...prev].slice(0, 50));
      }
    }
  });

  return { isConnected, alerts, clearAlerts: () => setAlerts([]) };
}
