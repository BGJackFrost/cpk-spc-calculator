import { useState, useEffect, useCallback, useRef } from 'react';

export interface MqttMessage { topic: string; payload: any; timestamp: number; }
export interface MqttSensorData { deviceId: string; sensorType: string; value: number; unit: string; timestamp: number; status: 'normal' | 'warning' | 'critical'; }
export interface UseMqttRealtimeOptions { brokerUrl?: string; topics?: string[]; onMessage?: (message: MqttMessage) => void; onConnect?: () => void; onDisconnect?: () => void; }
export interface UseMqttRealtimeReturn { isConnected: boolean; isConnecting: boolean; messages: MqttMessage[]; sensorData: Map<string, MqttSensorData>; lastMessage: MqttMessage | null; error: Error | null; connect: () => void; disconnect: () => void; subscribe: (topic: string) => void; unsubscribe: (topic: string) => void; clearMessages: () => void; }

const generateMockSensorData = (): MqttSensorData => {
  const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration', 'current', 'voltage'];
  const units: Record<string, string> = { temperature: '°C', humidity: '%', pressure: 'bar', vibration: 'mm/s', current: 'A', voltage: 'V' };
  const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
  const baseValues: Record<string, number> = { temperature: 25, humidity: 60, pressure: 1.5, vibration: 2.5, current: 15, voltage: 220 };
  const value = baseValues[sensorType] + (Math.random() - 0.5) * 10;
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  if (Math.random() > 0.9) status = 'critical'; else if (Math.random() > 0.8) status = 'warning';
  return { deviceId: `device-${Math.floor(Math.random() * 10) + 1}`, sensorType, value: parseFloat(value.toFixed(2)), unit: units[sensorType], timestamp: Date.now(), status };
};

export function useMqttRealtime(options: UseMqttRealtimeOptions = {}): UseMqttRealtimeReturn {
  const { topics = ['sensors/#'], onMessage, onConnect, onDisconnect } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [sensorData, setSensorData] = useState<Map<string, MqttSensorData>>(new Map());
  const [lastMessage, setLastMessage] = useState<MqttMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedTopics = useRef<Set<string>>(new Set(topics));

  const connect = useCallback(() => {
    if (isConnected || isConnecting) return;
    setIsConnecting(true); setError(null);
    setTimeout(() => {
      setIsConnected(true); setIsConnecting(false); onConnect?.();
      intervalRef.current = setInterval(() => {
        const mockData = generateMockSensorData();
        const message: MqttMessage = { topic: `sensors/${mockData.deviceId}/${mockData.sensorType}`, payload: mockData, timestamp: Date.now() };
        setMessages(prev => [...prev.slice(-99), message]); setLastMessage(message);
        setSensorData(prev => { const newMap = new Map(prev); newMap.set(`${mockData.deviceId}-${mockData.sensorType}`, mockData); return newMap; });
        onMessage?.(message);
      }, 2000);
    }, 1000);
  }, [isConnected, isConnecting, onConnect, onMessage]);

  const disconnect = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } setIsConnected(false); setIsConnecting(false); onDisconnect?.(); }, [onDisconnect]);
  const subscribe = useCallback((topic: string) => { subscribedTopics.current.add(topic); }, []);
  const unsubscribe = useCallback((topic: string) => { subscribedTopics.current.delete(topic); }, []);
  const clearMessages = useCallback(() => { setMessages([]); setLastMessage(null); }, []);
  useEffect(() => { connect(); return () => { disconnect(); }; }, []);
  return { isConnected, isConnecting, messages, sensorData, lastMessage, error, connect, disconnect, subscribe, unsubscribe, clearMessages };
}
export default useMqttRealtime;
