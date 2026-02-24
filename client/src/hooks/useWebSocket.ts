/**
 * WebSocket Hook for Real-time SPC Data
 * Provides low-latency real-time updates with automatic reconnection
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SpcUpdateData {
  planId: number;
  planName?: string;
  cpk: number | null;
  cp: number | null;
  ppk?: number | null;
  mean: number | null;
  stdDev: number | null;
  sampleCount: number;
  timestamp: string;
  status: string;
  violations?: string[];
  usl?: number | null;
  lsl?: number | null;
}

export interface CpkAlertData {
  planId: number;
  planName: string;
  cpk: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  productCode?: string;
  stationName?: string;
}

export interface FixtureUpdateData {
  fixtureId: number;
  fixtureName: string;
  machineId?: number;
  machineName?: string;
  cpk: number | null;
  oocRate: number;
  sampleCount: number;
  timestamp: string;
  status: string;
}

export interface MachineStatusData {
  machineId: number;
  machineName: string;
  status: 'running' | 'idle' | 'maintenance' | 'error' | 'offline';
  oee: number | null;
  availability?: number | null;
  performance?: number | null;
  quality?: number | null;
  timestamp: string;
}

export interface ShiftComparisonData {
  planId: number;
  shifts: Array<{
    shiftName: string;
    avgCpk: number | null;
    sampleCount: number;
  }>;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  // Additional fields for specific message types
  planId?: number;
  machineId?: number;
  fixtureId?: number;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  send: (message: WebSocketMessage) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  reconnect: () => void;
  disconnect: () => void;
  subscribePlan: (planId: number) => void;
  unsubscribePlan: (planId: number) => void;
  subscribeAllPlans: () => void;
  subscribeMachine: (machineId: number) => void;
  unsubscribeMachine: (machineId: number) => void;
  subscribeAllMachines: () => void;
  subscribeFixture: (fixtureId: number) => void;
  unsubscribeFixture: (fixtureId: number) => void;
  subscribeAllFixtures: () => void;
  latestSpcUpdate: SpcUpdateData | null;
  latestCpkAlert: CpkAlertData | null;
  latestFixtureUpdate: FixtureUpdateData | null;
  latestMachineStatus: MachineStatusData | null;
  latestShiftComparison: ShiftComparisonData | null;
  connectionStats: { reconnectCount: number; lastConnected: Date | null };
}

export function useWebSocket(channels: string[] = [], options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [latestSpcUpdate, setLatestSpcUpdate] = useState<SpcUpdateData | null>(null);
  const [latestCpkAlert, setLatestCpkAlert] = useState<CpkAlertData | null>(null);
  const [latestFixtureUpdate, setLatestFixtureUpdate] = useState<FixtureUpdateData | null>(null);
  const [latestMachineStatus, setLatestMachineStatus] = useState<MachineStatusData | null>(null);
  const [latestShiftComparison, setLatestShiftComparison] = useState<ShiftComparisonData | null>(null);
  const [connectionStats, setConnectionStats] = useState({
    reconnectCount: 0,
    lastConnected: null as Date | null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedChannelsRef = useRef<Set<string>>(new Set(channels));
  const subscribedPlansRef = useRef<Set<number>>(new Set());
  const subscribedMachinesRef = useRef<Set<number>>(new Set());
  const subscribedFixturesRef = useRef<Set<number>>(new Set());

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    autoConnect = true
  } = options;

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const resubscribe = useCallback(() => {
    // Resubscribe to all channels
    subscribedChannelsRef.current.forEach((channel) => {
      send({ type: 'subscribe', channel });
    });

    // Resubscribe to plans
    subscribedPlansRef.current.forEach((planId) => {
      if (planId === -1) {
        send({ type: 'subscribe_all_plans' });
      } else {
        send({ type: 'subscribe_plan', data: { planId } });
      }
    });

    // Resubscribe to machines
    subscribedMachinesRef.current.forEach((machineId) => {
      if (machineId === -1) {
        send({ type: 'subscribe_all_machines' });
      } else {
        send({ type: 'subscribe_machine', data: { machineId } });
      }
    });

    // Resubscribe to fixtures
    subscribedFixturesRef.current.forEach((fixtureId) => {
      if (fixtureId === -1) {
        send({ type: 'subscribe_all_fixtures' });
      } else {
        send({ type: 'subscribe_fixture', data: { fixtureId } });
      }
    });
  }, [send]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);
    onMessage?.(message);

    switch (message.type) {
      case 'connected':
        console.log('[WebSocket] Server acknowledged connection');
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'spc_update':
        if (message.data) {
          setLatestSpcUpdate(message.data);
        }
        break;

      case 'cpk_alert':
        if (message.data) {
          setLatestCpkAlert(message.data);
        }
        break;

      case 'fixture_update':
        if (message.data) {
          setLatestFixtureUpdate(message.data);
        }
        break;

      case 'machine_status':
        if (message.data) {
          setLatestMachineStatus(message.data);
        }
        break;

      case 'shift_comparison':
        if (message.data) {
          setLatestShiftComparison(message.data);
        }
        break;

      case 'update':
        // Channel-based update - also check for specific data types
        if (message.data) {
          if (message.channel?.startsWith('spc_')) {
            setLatestSpcUpdate(message.data);
          } else if (message.channel?.startsWith('fixture_')) {
            setLatestFixtureUpdate(message.data);
          } else if (message.channel?.startsWith('machine_')) {
            setLatestMachineStatus(message.data);
          }
        }
        break;

      case 'subscribed':
      case 'unsubscribed':
        console.log(`[WebSocket] ${message.type}:`, message.data || message.channel);
        break;
    }
  }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        setConnectionStats((prev) => ({
          reconnectCount: prev.reconnectCount,
          lastConnected: new Date(),
        }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          send({ type: 'ping' });
        }, 25000);

        // Resubscribe to previous subscriptions
        resubscribe();

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        onDisconnect?.();

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setConnectionStats((prev) => ({
            ...prev,
            reconnectCount: reconnectAttemptsRef.current,
          }));

          const delay = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setError('Connection failed after maximum reconnection attempts');
        }
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setError('WebSocket connection error');
        onError?.(err);
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      setIsConnecting(false);
      setError('Failed to establish WebSocket connection');
    }
  }, [isConnecting, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts, resubscribe, send, handleMessage]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnecting');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [maxReconnectAttempts]);

  const subscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.add(channel);
    send({ type: 'subscribe', channel });
  }, [send]);

  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel);
    send({ type: 'unsubscribe', channel });
  }, [send]);

  // SPC Plan subscriptions
  const subscribePlan = useCallback((planId: number) => {
    subscribedPlansRef.current.add(planId);
    send({ type: 'subscribe_plan', planId });
  }, [send]);

  const unsubscribePlan = useCallback((planId: number) => {
    subscribedPlansRef.current.delete(planId);
    send({ type: 'unsubscribe_plan', planId });
  }, [send]);

  const subscribeAllPlans = useCallback(() => {
    subscribedPlansRef.current.add(-1);
    send({ type: 'subscribe_all_plans' });
  }, [send]);

  // Machine subscriptions
  const subscribeMachine = useCallback((machineId: number) => {
    subscribedMachinesRef.current.add(machineId);
    send({ type: 'subscribe_machine', machineId });
  }, [send]);

  const unsubscribeMachine = useCallback((machineId: number) => {
    subscribedMachinesRef.current.delete(machineId);
    send({ type: 'unsubscribe_machine', machineId });
  }, [send]);

  const subscribeAllMachines = useCallback(() => {
    subscribedMachinesRef.current.add(-1);
    send({ type: 'subscribe_all_machines' });
  }, [send]);

  // Fixture subscriptions
  const subscribeFixture = useCallback((fixtureId: number) => {
    subscribedFixturesRef.current.add(fixtureId);
    send({ type: 'subscribe_fixture', fixtureId });
  }, [send]);

  const unsubscribeFixture = useCallback((fixtureId: number) => {
    subscribedFixturesRef.current.delete(fixtureId);
    send({ type: 'unsubscribe_fixture', fixtureId });
  }, [send]);

  const subscribeAllFixtures = useCallback(() => {
    subscribedFixturesRef.current.add(-1);
    send({ type: 'subscribe_all_fixtures' });
  }, [send]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
    reconnect: connect,
    disconnect,
    subscribePlan,
    unsubscribePlan,
    subscribeAllPlans,
    subscribeMachine,
    unsubscribeMachine,
    subscribeAllMachines,
    subscribeFixture,
    unsubscribeFixture,
    subscribeAllFixtures,
    latestSpcUpdate,
    latestCpkAlert,
    latestFixtureUpdate,
    latestMachineStatus,
    latestShiftComparison,
    connectionStats,
  };
}

// Hook for machine status updates
export function useMachineStatus(machineId?: number) {
  const [status, setStatus] = useState<MachineStatusData | null>(null);
  const channels = machineId ? [`machine_${machineId}`, 'machine_status'] : ['machine_status'];

  const ws = useWebSocket(channels, {
    onMessage: (message) => {
      if (message.type === 'update' && message.data) {
        if (!machineId || message.data.machineId === machineId) {
          setStatus(message.data);
        }
      }
      if (message.type === 'machine_status' && message.data) {
        if (!machineId || message.data.machineId === machineId) {
          setStatus(message.data);
        }
      }
    }
  });

  useEffect(() => {
    if (ws.latestMachineStatus) {
      if (!machineId || ws.latestMachineStatus.machineId === machineId) {
        setStatus(ws.latestMachineStatus);
      }
    }
  }, [ws.latestMachineStatus, machineId]);

  return { isConnected: ws.isConnected, status };
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
  const [alerts, setAlerts] = useState<CpkAlertData[]>([]);

  const ws = useWebSocket(['spc_alerts'], {
    onMessage: (message) => {
      if (message.type === 'spc_alert' && message.data) {
        setAlerts((prev) => [message.data, ...prev].slice(0, 50));
      }
      if (message.type === 'cpk_alert' && message.data) {
        setAlerts((prev) => [message.data, ...prev].slice(0, 50));
      }
    }
  });

  useEffect(() => {
    if (ws.latestCpkAlert) {
      setAlerts((prev) => [ws.latestCpkAlert!, ...prev].slice(0, 50));
    }
  }, [ws.latestCpkAlert]);

  return { isConnected: ws.isConnected, alerts, clearAlerts: () => setAlerts([]) };
}

/**
 * Hook for subscribing to specific SPC plan updates
 */
export function useSpcPlanUpdates(planIds: number[], options?: UseWebSocketOptions) {
  const ws = useWebSocket([], options);
  const [updates, setUpdates] = useState<Map<number, SpcUpdateData>>(new Map());

  useEffect(() => {
    if (ws.isConnected && planIds.length > 0) {
      planIds.forEach((planId) => {
        ws.subscribePlan(planId);
      });
    }

    return () => {
      planIds.forEach((planId) => {
        ws.unsubscribePlan(planId);
      });
    };
  }, [ws.isConnected, planIds, ws.subscribePlan, ws.unsubscribePlan]);

  useEffect(() => {
    if (ws.latestSpcUpdate && planIds.includes(ws.latestSpcUpdate.planId)) {
      setUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.set(ws.latestSpcUpdate!.planId, ws.latestSpcUpdate!);
        return newMap;
      });
    }
  }, [ws.latestSpcUpdate, planIds]);

  return {
    ...ws,
    updates,
  };
}

/**
 * Hook for subscribing to fixture updates
 */
export function useFixtureUpdates(fixtureIds: number[], options?: UseWebSocketOptions) {
  const ws = useWebSocket([], options);
  const [updates, setUpdates] = useState<Map<number, FixtureUpdateData>>(new Map());

  useEffect(() => {
    if (ws.isConnected && fixtureIds.length > 0) {
      fixtureIds.forEach((fixtureId) => {
        ws.subscribeFixture(fixtureId);
      });
    }

    return () => {
      fixtureIds.forEach((fixtureId) => {
        ws.unsubscribeFixture(fixtureId);
      });
    };
  }, [ws.isConnected, fixtureIds, ws.subscribeFixture, ws.unsubscribeFixture]);

  useEffect(() => {
    if (ws.latestFixtureUpdate && fixtureIds.includes(ws.latestFixtureUpdate.fixtureId)) {
      setUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.set(ws.latestFixtureUpdate!.fixtureId, ws.latestFixtureUpdate!);
        return newMap;
      });
    }
  }, [ws.latestFixtureUpdate, fixtureIds]);

  return {
    ...ws,
    updates,
  };
}

export default useWebSocket;
