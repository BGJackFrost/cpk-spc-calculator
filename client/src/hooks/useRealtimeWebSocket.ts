/**
 * Hook để kết nối WebSocket cho dữ liệu realtime
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

interface RealtimeMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'status' | 'alert' | 'ping' | 'pong';
  channel?: string;
  data?: any;
  timestamp?: number;
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
  const pingTimeRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsEnabled, setWsEnabled] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Check if WebSocket is enabled on server
  const { data: wsStatus } = trpc.system.getWebSocketStatus.useQuery(undefined, {
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (wsStatus) {
      setWsEnabled(wsStatus.enabled);
    }
  }, [wsStatus]);

  const connect = useCallback(() => {
    // Don't connect if WebSocket is disabled
    if (wsEnabled === false) {
      console.log('[WebSocket] Server WebSocket is disabled, skipping connection');
      return;
    }
    
    setIsReconnecting(true);
    
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
        setReconnectAttempts(0);
        setIsReconnecting(false);

        // Subscribe to channels
        channels.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
        
        // Send initial ping to measure latency
        sendPingInternal(ws);
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
            case 'pong':
              // Calculate latency from pong response
              if (pingTimeRef.current > 0) {
                const roundTripTime = Date.now() - pingTimeRef.current;
                setLatency(roundTripTime);
                pingTimeRef.current = 0;
              }
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        setLatency(null);
        wsRef.current = null;

        // Auto reconnect with exponential backoff
        if (autoReconnect) {
          const attempts = reconnectAttempts + 1;
          setReconnectAttempts(attempts);
          
          // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
          const delay = Math.min(reconnectInterval * Math.pow(2, attempts - 1), 60000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[WebSocket] Attempting to reconnect (attempt ${attempts})...`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('Không thể kết nối WebSocket');
        setIsReconnecting(false);
      };

    } catch (error: any) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(error.message);
      setIsReconnecting(false);
    }
  }, [channels, onData, onAlert, onStatus, autoReconnect, reconnectInterval, wsEnabled, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setLatency(null);
    setReconnectAttempts(0);
    setIsReconnecting(false);
  }, []);

  // Manual reconnect function for user-triggered reconnection
  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    // Small delay before reconnecting
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

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

  // Internal ping function that takes ws as parameter
  const sendPingInternal = (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) {
      pingTimeRef.current = Date.now();
      ws.send(JSON.stringify({ type: 'ping', timestamp: pingTimeRef.current }));
    }
  };

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      pingTimeRef.current = Date.now();
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: pingTimeRef.current }));
    }
  }, []);

  // Connect only when WebSocket is enabled
  useEffect(() => {
    if (wsEnabled === true) {
      connect();
    } else if (wsEnabled === false) {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [wsEnabled]);

  // Ping interval to keep connection alive and measure latency
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
    wsEnabled,
    latency,
    reconnectAttempts,
    isReconnecting,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    sendPing,
  };
}

export default useRealtimeWebSocket;
