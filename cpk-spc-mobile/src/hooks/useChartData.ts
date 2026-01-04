import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCpkHistory,
  getLatestCpk,
  getOeeHistory,
  getLatestOee,
  getSpcControlData,
  getHistogramData,
  CpkDataPoint,
  OeeDataPoint,
  SpcDataPoint,
  HistogramData,
} from '../services/chartApi';

interface UseChartDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface ChartDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Hook for CPK History
export function useCpkHistory(
  productCode?: string,
  stationName?: string,
  days: number = 7,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = true, refreshInterval = 30000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<CpkDataPoint[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getCpkHistory(productCode, stationName, days);
    
    if (response.success && response.data) {
      setState({
        data: response.data.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [productCode, stationName, days, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}

// Hook for Latest CPK
export function useLatestCpk(
  productCode?: string,
  stationName?: string,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = true, refreshInterval = 10000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<{
    cpk: number;
    cp: number;
    mean: number;
    stdDev: number;
    timestamp: string;
  }>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getLatestCpk(productCode, stationName);
    
    if (response.success && response.data) {
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [productCode, stationName, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}

// Hook for OEE History
export function useOeeHistory(
  lineId?: string,
  days: number = 7,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = true, refreshInterval = 30000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<OeeDataPoint[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getOeeHistory(lineId, days);
    
    if (response.success && response.data) {
      setState({
        data: response.data.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [lineId, days, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}

// Hook for Latest OEE
export function useLatestOee(
  lineId?: string,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = true, refreshInterval = 10000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<OeeDataPoint>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getLatestOee(lineId);
    
    if (response.success && response.data) {
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [lineId, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}

// Hook for SPC Control Chart
export function useSpcControlData(
  planId?: string,
  limit: number = 50,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = true, refreshInterval = 15000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<{
    data: SpcDataPoint[];
    ucl: number;
    lcl: number;
    cl: number;
    usl?: number;
    lsl?: number;
  }>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getSpcControlData(planId, limit);
    
    if (response.success && response.data) {
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [planId, limit, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}

// Hook for Histogram Data
export function useHistogramData(
  productCode?: string,
  stationName?: string,
  days: number = 7,
  options: UseChartDataOptions = {}
) {
  const { autoRefresh = false, refreshInterval = 60000, enabled = true } = options;
  const [state, setState] = useState<ChartDataState<HistogramData>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const response = await getHistogramData(productCode, stationName, days);
    
    if (response.success && response.data) {
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: response.error || 'Failed to fetch data',
      }));
    }
  }, [productCode, stationName, days, enabled]);

  useEffect(() => {
    fetchData();

    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval, enabled]);

  return { ...state, refetch: fetchData };
}
