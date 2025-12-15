/**
 * Hook để kết nối WebSocket cho dữ liệu realtime
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface RealtimeMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'status' | 'alert' | 'ping' | 'pong';
  channel?: string;
  data?: any;
}

interface UseRealtimeWebSocketOptions {
  channels?: string[];
  onData?: (data: any) => void;
  onAlert?: (alert: any) => void;
  onStatus?: (status: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useRealtimeWebSocket(options: UseRealtimeWebSocketOptions = {}) {
  const {
    channels = ['all'],
    onData,
    onAlert,
    onStatus,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(() => {
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to channels
        channels.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case 'data':
              onData?.(message.data);
              break;
            case 'alert':
              onAlert?.(message.data);
              break;
            case 'status':
              onStatus?.(message.data);
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Auto reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('Không thể kết nối WebSocket');
      };

    } catch (error: any) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(error.message);
    }
  }, [channels, onData, onAlert, onStatus, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // Ping interval to keep connection alive
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(sendPing, 25000);
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, sendPing]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}

export default useRealtimeWebSocket;
