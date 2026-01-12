/**
 * Hook để theo dõi Yield Rate và Defect Rate theo thời gian thực qua WebSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRealtimeWebSocket } from './useRealtimeWebSocket';

export interface YieldDefectData {
  timestamp: number;
  yieldRate: number;
  defectRate: number;
  totalInspected: number;
  totalPassed: number;
  totalDefects: number;
  productionLineId?: number;
  productionLineName?: string;
}

export interface YieldDefectAlert {
  type: 'yield_low' | 'defect_high' | 'yield_drop' | 'defect_spike';
  severity: 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  productionLineId?: number;
}

interface UseRealtimeYieldDefectOptions {
  productionLineId?: number;
  maxDataPoints?: number;
  onAlert?: (alert: YieldDefectAlert) => void;
}

export function useRealtimeYieldDefect(options: UseRealtimeYieldDefectOptions = {}) {
  const { productionLineId, maxDataPoints = 60, onAlert } = options;
  
  const [currentData, setCurrentData] = useState<YieldDefectData | null>(null);
  const [historicalData, setHistoricalData] = useState<YieldDefectData[]>([]);
  const [alerts, setAlerts] = useState<YieldDefectAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const alertCallbackRef = useRef(onAlert);
  alertCallbackRef.current = onAlert;

  const handleData = useCallback((data: any) => {
    if (data.type === 'yield_defect_update') {
      const yieldDefectData: YieldDefectData = {
        timestamp: data.timestamp || Date.now(),
        yieldRate: data.yieldRate ?? 0,
        defectRate: data.defectRate ?? 0,
        totalInspected: data.totalInspected ?? 0,
        totalPassed: data.totalPassed ?? 0,
        totalDefects: data.totalDefects ?? 0,
        productionLineId: data.productionLineId,
        productionLineName: data.productionLineName,
      };
      
      // Filter by production line if specified
      if (productionLineId && data.productionLineId !== productionLineId) {
        return;
      }
      
      setCurrentData(yieldDefectData);
      setLastUpdate(new Date());
      
      // Add to historical data with limit
      setHistoricalData(prev => {
        const newData = [...prev, yieldDefectData];
        if (newData.length > maxDataPoints) {
          return newData.slice(-maxDataPoints);
        }
        return newData;
      });
    }
  }, [productionLineId, maxDataPoints]);

  const handleAlert = useCallback((alertData: any) => {
    if (alertData.category === 'yield_defect') {
      const alert: YieldDefectAlert = {
        type: alertData.type,
        severity: alertData.severity,
        message: alertData.message,
        currentValue: alertData.currentValue,
        threshold: alertData.threshold,
        timestamp: alertData.timestamp || Date.now(),
        productionLineId: alertData.productionLineId,
      };
      
      // Filter by production line if specified
      if (productionLineId && alertData.productionLineId !== productionLineId) {
        return;
      }
      
      setAlerts(prev => [...prev.slice(-19), alert]); // Keep last 20 alerts
      alertCallbackRef.current?.(alert);
    }
  }, [productionLineId]);

  const channels = productionLineId 
    ? [`yield_defect_${productionLineId}`, 'yield_defect_alerts']
    : ['yield_defect', 'yield_defect_alerts'];

  const {
    isConnected,
    wsEnabled,
    latency,
    connectionError,
    reconnect,
  } = useRealtimeWebSocket({
    channels,
    onData: handleData,
    onAlert: handleAlert,
    autoReconnect: true,
  });

  // Clear historical data
  const clearHistory = useCallback(() => {
    setHistoricalData([]);
    setAlerts([]);
  }, []);

  // Get statistics from historical data
  const getStatistics = useCallback(() => {
    if (historicalData.length === 0) {
      return {
        avgYieldRate: 0,
        avgDefectRate: 0,
        minYieldRate: 0,
        maxYieldRate: 0,
        minDefectRate: 0,
        maxDefectRate: 0,
        trend: 'stable' as 'up' | 'down' | 'stable',
      };
    }

    const yieldRates = historicalData.map(d => d.yieldRate);
    const defectRates = historicalData.map(d => d.defectRate);

    const avgYieldRate = yieldRates.reduce((a, b) => a + b, 0) / yieldRates.length;
    const avgDefectRate = defectRates.reduce((a, b) => a + b, 0) / defectRates.length;

    // Calculate trend based on last 10 data points
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (historicalData.length >= 10) {
      const recent = historicalData.slice(-10);
      const firstHalf = recent.slice(0, 5).reduce((a, b) => a + b.yieldRate, 0) / 5;
      const secondHalf = recent.slice(5).reduce((a, b) => a + b.yieldRate, 0) / 5;
      
      if (secondHalf > firstHalf * 1.02) trend = 'up';
      else if (secondHalf < firstHalf * 0.98) trend = 'down';
    }

    return {
      avgYieldRate,
      avgDefectRate,
      minYieldRate: Math.min(...yieldRates),
      maxYieldRate: Math.max(...yieldRates),
      minDefectRate: Math.min(...defectRates),
      maxDefectRate: Math.max(...defectRates),
      trend,
    };
  }, [historicalData]);

  return {
    // Connection status
    isConnected,
    wsEnabled,
    latency,
    connectionError,
    
    // Data
    currentData,
    historicalData,
    alerts,
    lastUpdate,
    
    // Actions
    reconnect,
    clearHistory,
    getStatistics,
  };
}

export default useRealtimeYieldDefect;
