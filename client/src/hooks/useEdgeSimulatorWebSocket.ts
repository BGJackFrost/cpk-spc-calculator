/**
 * Hook for Edge Simulator WebSocket connection
 * Provides realtime updates for Edge Simulator Dashboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SimulatorData {
  deviceId: string;
  timestamp: number;
  metrics: Record<string, number>;
  status: 'online' | 'offline' | 'warning' | 'error';
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
  channel?: string;
  data?: any;
}

interface UseEdgeSimulatorWebSocketOptions {
  enabled?: boolean;
  onData?: (data: SimulatorData) => void;
  onAlert?: (alert: any) => void;
  onStatusChange?: (status: any) => void;
}

export function useEdgeSimulatorWebSocket(options: UseEdgeSimulatorWebSocketOptions = {}) {
  const { enabled = true, onData, onAlert, onStatusChange } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled) return;
    
    try {
      // Get WebSocket URL from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[EdgeSimulatorWS] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to edge-simulator channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'edge-simulator'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          setMessageCount(prev => prev + 1);

          // Handle different message types
          if (message.type === 'data' && message.channel === 'edge-simulator') {
            const data = message.data;
            if (data?.type === 'simulator_data' && onData) {
              onData(data.payload);
            } else if (data?.type === 'simulator_status' && onStatusChange) {
              onStatusChange(data.payload);
            }
          } else if (message.type === 'alert') {
            if (onAlert) {
              onAlert(message.data);
            }
          }
        } catch (err) {
          console.error('[EdgeSimulatorWS] Parse error:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[EdgeSimulatorWS] Error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('[EdgeSimulatorWS] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (err: any) {
      console.error('[EdgeSimulatorWS] Connection error:', err);
      setError(err.message);
    }
  }, [enabled, onData, onAlert, onStatusChange]);

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
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (enabled) {
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
    lastMessage,
    error,
    messageCount,
    connect,
    disconnect,
    sendMessage,
  };
}

export default useEdgeSimulatorWebSocket;
