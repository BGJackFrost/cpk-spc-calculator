import { api, ApiResponse } from './api';

// Types for chart data
export interface CpkDataPoint {
  date: string;
  cpk: number;
  cp?: number;
  mean?: number;
  stdDev?: number;
}

export interface OeeDataPoint {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface SpcDataPoint {
  index: number;
  value: number;
  timestamp: string;
  isOutOfControl?: boolean;
  violatedRule?: string;
}

export interface HistogramData {
  bins: number[];
  frequencies: number[];
  mean: number;
  stdDev: number;
  usl?: number;
  lsl?: number;
  cp?: number;
  cpk?: number;
}

export interface ChartDataResponse<T> {
  data: T[];
  lastUpdated: string;
  productCode?: string;
  stationName?: string;
}

// CPK Chart API
export const getCpkHistory = async (
  productCode?: string,
  stationName?: string,
  days: number = 7
): Promise<ApiResponse<ChartDataResponse<CpkDataPoint>>> => {
  try {
    const params = new URLSearchParams();
    if (productCode) params.append('productCode', productCode);
    if (stationName) params.append('stationName', stationName);
    params.append('days', days.toString());

    const response = await api.get(`/charts/cpk-history?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch CPK history' };
  }
};

export const getLatestCpk = async (
  productCode?: string,
  stationName?: string
): Promise<ApiResponse<{ cpk: number; cp: number; mean: number; stdDev: number; timestamp: string }>> => {
  try {
    const params = new URLSearchParams();
    if (productCode) params.append('productCode', productCode);
    if (stationName) params.append('stationName', stationName);

    const response = await api.get(`/charts/latest-cpk?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch latest CPK' };
  }
};

// OEE Chart API
export const getOeeHistory = async (
  lineId?: string,
  days: number = 7
): Promise<ApiResponse<ChartDataResponse<OeeDataPoint>>> => {
  try {
    const params = new URLSearchParams();
    if (lineId) params.append('lineId', lineId);
    params.append('days', days.toString());

    const response = await api.get(`/charts/oee-history?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch OEE history' };
  }
};

export const getLatestOee = async (
  lineId?: string
): Promise<ApiResponse<OeeDataPoint>> => {
  try {
    const params = new URLSearchParams();
    if (lineId) params.append('lineId', lineId);

    const response = await api.get(`/charts/latest-oee?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch latest OEE' };
  }
};

// SPC Control Chart API
export const getSpcControlData = async (
  planId?: string,
  limit: number = 50
): Promise<ApiResponse<{
  data: SpcDataPoint[];
  ucl: number;
  lcl: number;
  cl: number;
  usl?: number;
  lsl?: number;
}>> => {
  try {
    const params = new URLSearchParams();
    if (planId) params.append('planId', planId);
    params.append('limit', limit.toString());

    const response = await api.get(`/charts/spc-control?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch SPC control data' };
  }
};

// Histogram API
export const getHistogramData = async (
  productCode?: string,
  stationName?: string,
  days: number = 7
): Promise<ApiResponse<HistogramData>> => {
  try {
    const params = new URLSearchParams();
    if (productCode) params.append('productCode', productCode);
    if (stationName) params.append('stationName', stationName);
    params.append('days', days.toString());

    const response = await api.get(`/charts/histogram?${params.toString()}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch histogram data' };
  }
};

// Products and Stations for filters
export const getProducts = async (): Promise<ApiResponse<{ id: string; code: string; name: string }[]>> => {
  try {
    const response = await api.get('/products');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch products' };
  }
};

export const getStations = async (): Promise<ApiResponse<{ id: string; name: string }[]>> => {
  try {
    const response = await api.get('/workstations');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch stations' };
  }
};

export const getProductionLines = async (): Promise<ApiResponse<{ id: string; name: string }[]>> => {
  try {
    const response = await api.get('/production-lines');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch production lines' };
  }
};

export const getSpcPlans = async (): Promise<ApiResponse<{ id: string; name: string; status: string }[]>> => {
  try {
    const response = await api.get('/spc-plans');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch SPC plans' };
  }
};
