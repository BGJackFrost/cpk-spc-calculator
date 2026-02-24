import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Base API configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api/trpc'
  : 'https://your-production-url.com/api/trpc';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Get stored token
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

// Set token
export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Remove token
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      await removeToken();
      // You can emit an event here to trigger logout in the app
    }
    return Promise.reject(error);
  }
);

// tRPC-style API wrapper
export const trpcCall = async <T>(
  procedure: string,
  input?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await api.get(`/${procedure}`, {
      params: input ? { input: JSON.stringify(input) } : undefined,
    });
    return { success: true, data: response.data.result?.data };
  } catch (error: any) {
    const message = error.response?.data?.error?.message || error.message || 'Unknown error';
    return { success: false, error: message };
  }
};

export const trpcMutation = async <T>(
  procedure: string,
  input?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await api.post(`/${procedure}`, input);
    return { success: true, data: response.data.result?.data };
  } catch (error: any) {
    const message = error.response?.data?.error?.message || error.message || 'Unknown error';
    return { success: false, error: message };
  }
};

// API URL configuration
export const setApiBaseUrl = (url: string): void => {
  api.defaults.baseURL = url;
};

export const getApiBaseUrl = (): string => {
  return api.defaults.baseURL || API_BASE_URL;
};
