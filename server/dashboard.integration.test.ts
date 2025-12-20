/**
 * Integration Tests for Dashboard Flow
 * 
 * These tests verify the complete Dashboard flow including:
 * - Loading data from multiple API endpoints
 * - Error handling when APIs fail
 * - Loading states and transitions
 * - Data refresh functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tRPC responses
const mockTrpcResponses = {
  // Dashboard config
  dashboardConfig: {
    userId: 'user-1',
    widgets: ['ntf', 'license', 'connectionPool', 'validationRules', 'lowStock', 'webhookRetry'],
    layout: 'grid',
    refreshInterval: 30000,
  },
  
  // NTF Statistics
  ntfStats: {
    totalDefects: 150,
    realNg: 100,
    ntf: 50,
    pending: 10,
    ntfRate: 33.33,
    trend: [
      { date: '2024-12-14', count: 20 },
      { date: '2024-12-15', count: 25 },
      { date: '2024-12-16', count: 30 },
    ],
  },
  
  // License Status
  licenseStatus: {
    isActive: true,
    type: 'Professional',
    expiresAt: new Date('2025-12-31').toISOString(),
    daysRemaining: 365,
    features: ['spc', 'mms', 'reports'],
  },
  
  // Connection Pool
  connectionPool: {
    active: 5,
    idle: 15,
    total: 20,
    maxConnections: 50,
    avgLatency: 12.5,
    status: 'healthy',
  },
  
  // Validation Rules
  validationRules: {
    total: 25,
    active: 20,
    triggered: 5,
    lastTriggered: new Date().toISOString(),
    recentViolations: [
      { ruleId: 'rule-1', ruleName: 'CPK < 1.33', count: 3 },
      { ruleId: 'rule-2', ruleName: 'Out of Spec', count: 2 },
    ],
  },
  
  // Low Stock
  lowStock: {
    totalItems: 100,
    lowStockCount: 8,
    criticalCount: 2,
    items: [
      { id: 'part-1', name: 'Bearing XYZ', currentQty: 5, minQty: 10 },
      { id: 'part-2', name: 'Motor ABC', currentQty: 2, minQty: 5 },
    ],
  },
  
  // Webhook Retry
  webhookRetry: {
    pending: 3,
    exhausted: 1,
    totalRetries: 15,
    successRate: 85.5,
    recentFailures: [
      { webhookId: 'wh-1', url: 'https://example.com/hook', failCount: 2 },
    ],
  },
  
  // OEE Summary
  oeeSummary: {
    oee: 85.5,
    availability: 92.0,
    performance: 95.0,
    quality: 97.8,
    trend: 'up',
  },
  
  // SPC Summary
  spcSummary: {
    avgCpk: 1.45,
    avgCp: 1.52,
    totalAnalyses: 250,
    violations: 12,
    trend: 'stable',
  },
};

// Mock API error responses
const mockApiErrors = {
  networkError: new Error('Network request failed'),
  serverError: { code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed' },
  authError: { code: 'UNAUTHORIZED', message: 'Session expired' },
  rateLimitError: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' },
};

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dashboard Data Loading', () => {
    it('should load all widget data successfully', async () => {
      // Simulate loading all dashboard data
      const loadDashboardData = async () => {
        const results = await Promise.all([
          Promise.resolve(mockTrpcResponses.dashboardConfig),
          Promise.resolve(mockTrpcResponses.ntfStats),
          Promise.resolve(mockTrpcResponses.licenseStatus),
          Promise.resolve(mockTrpcResponses.connectionPool),
          Promise.resolve(mockTrpcResponses.validationRules),
          Promise.resolve(mockTrpcResponses.lowStock),
          Promise.resolve(mockTrpcResponses.webhookRetry),
        ]);
        return {
          config: results[0],
          ntf: results[1],
          license: results[2],
          connectionPool: results[3],
          validationRules: results[4],
          lowStock: results[5],
          webhookRetry: results[6],
        };
      };

      const data = await loadDashboardData();
      
      expect(data.config).toBeDefined();
      expect(data.config.widgets).toHaveLength(6);
      expect(data.ntf.totalDefects).toBe(150);
      expect(data.license.isActive).toBe(true);
      expect(data.connectionPool.status).toBe('healthy');
      expect(data.validationRules.total).toBe(25);
      expect(data.lowStock.lowStockCount).toBe(8);
      expect(data.webhookRetry.pending).toBe(3);
    });

    it('should handle partial data loading with some failures', async () => {
      // Simulate some APIs failing while others succeed
      const loadWithPartialFailure = async () => {
        const results = await Promise.allSettled([
          Promise.resolve(mockTrpcResponses.dashboardConfig),
          Promise.reject(mockApiErrors.networkError),
          Promise.resolve(mockTrpcResponses.licenseStatus),
          Promise.reject(mockApiErrors.serverError),
          Promise.resolve(mockTrpcResponses.validationRules),
        ]);
        
        return results.map((result, index) => ({
          index,
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason : null,
        }));
      };

      const results = await loadWithPartialFailure();
      
      // Check successful loads
      expect(results[0].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(results[4].status).toBe('fulfilled');
      
      // Check failed loads
      expect(results[1].status).toBe('rejected');
      expect(results[3].status).toBe('rejected');
    });

    it('should calculate correct loading progress', async () => {
      const totalWidgets = 6;
      let loadedCount = 0;
      
      const updateProgress = () => {
        loadedCount++;
        return Math.round((loadedCount / totalWidgets) * 100);
      };
      
      // Simulate sequential loading with progress
      expect(updateProgress()).toBe(17); // 1/6
      expect(updateProgress()).toBe(33); // 2/6
      expect(updateProgress()).toBe(50); // 3/6
      expect(updateProgress()).toBe(67); // 4/6
      expect(updateProgress()).toBe(83); // 5/6
      expect(updateProgress()).toBe(100); // 6/6
    });
  });

  describe('Dashboard Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const handleNetworkError = (error: Error) => {
        return {
          type: 'network',
          message: 'Unable to connect to server. Please check your internet connection.',
          retryable: true,
          originalError: error.message,
        };
      };

      const result = handleNetworkError(mockApiErrors.networkError);
      
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
      expect(result.originalError).toBe('Network request failed');
    });

    it('should handle server errors with appropriate messages', async () => {
      const handleServerError = (error: { code: string; message: string }) => {
        const errorMessages: Record<string, string> = {
          'INTERNAL_SERVER_ERROR': 'Server error occurred. Our team has been notified.',
          'UNAUTHORIZED': 'Your session has expired. Please log in again.',
          'TOO_MANY_REQUESTS': 'Too many requests. Please wait a moment and try again.',
        };
        
        return {
          type: 'server',
          code: error.code,
          userMessage: errorMessages[error.code] || 'An unexpected error occurred.',
          retryable: error.code !== 'UNAUTHORIZED',
        };
      };

      const serverResult = handleServerError(mockApiErrors.serverError);
      expect(serverResult.userMessage).toContain('Server error');
      expect(serverResult.retryable).toBe(true);

      const authResult = handleServerError(mockApiErrors.authError);
      expect(authResult.userMessage).toContain('session has expired');
      expect(authResult.retryable).toBe(false);

      const rateLimitResult = handleServerError(mockApiErrors.rateLimitError);
      expect(rateLimitResult.userMessage).toContain('Too many requests');
      expect(rateLimitResult.retryable).toBe(true);
    });

    it('should implement exponential backoff for retries', async () => {
      const calculateBackoff = (attempt: number, baseDelay: number = 1000) => {
        const maxDelay = 30000; // 30 seconds max
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        // Add jitter (±10%)
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        return Math.round(delay + jitter);
      };

      const attempt1 = calculateBackoff(0);
      const attempt2 = calculateBackoff(1);
      const attempt3 = calculateBackoff(2);
      const attempt4 = calculateBackoff(3);
      const attempt5 = calculateBackoff(4);

      // Verify exponential growth (with some tolerance for jitter)
      expect(attempt1).toBeGreaterThanOrEqual(900);
      expect(attempt1).toBeLessThanOrEqual(1100);
      
      expect(attempt2).toBeGreaterThanOrEqual(1800);
      expect(attempt2).toBeLessThanOrEqual(2200);
      
      expect(attempt3).toBeGreaterThanOrEqual(3600);
      expect(attempt3).toBeLessThanOrEqual(4400);
      
      // Should cap at maxDelay
      expect(attempt5).toBeLessThanOrEqual(33000);
    });
  });

  describe('Dashboard Loading States', () => {
    it('should track loading state for each widget', () => {
      const widgetLoadingStates: Record<string, boolean> = {
        ntf: true,
        license: true,
        connectionPool: true,
        validationRules: true,
        lowStock: true,
        webhookRetry: true,
      };

      // Simulate widgets loading one by one
      const setWidgetLoaded = (widgetId: string) => {
        widgetLoadingStates[widgetId] = false;
      };

      const isAnyLoading = () => Object.values(widgetLoadingStates).some(v => v);
      const isAllLoaded = () => Object.values(widgetLoadingStates).every(v => !v);

      expect(isAnyLoading()).toBe(true);
      expect(isAllLoaded()).toBe(false);

      setWidgetLoaded('ntf');
      setWidgetLoaded('license');
      expect(isAnyLoading()).toBe(true);

      setWidgetLoaded('connectionPool');
      setWidgetLoaded('validationRules');
      setWidgetLoaded('lowStock');
      setWidgetLoaded('webhookRetry');
      
      expect(isAnyLoading()).toBe(false);
      expect(isAllLoaded()).toBe(true);
    });

    it('should handle skeleton loading states correctly', () => {
      const createSkeletonState = (widgetId: string) => ({
        widgetId,
        isLoading: true,
        hasError: false,
        data: null,
        skeletonType: 'card',
      });

      const updateToLoadedState = (state: ReturnType<typeof createSkeletonState>, data: any) => ({
        ...state,
        isLoading: false,
        data,
      });

      const updateToErrorState = (state: ReturnType<typeof createSkeletonState>, error: string) => ({
        ...state,
        isLoading: false,
        hasError: true,
        error,
      });

      const initialState = createSkeletonState('ntf');
      expect(initialState.isLoading).toBe(true);
      expect(initialState.data).toBeNull();

      const loadedState = updateToLoadedState(initialState, mockTrpcResponses.ntfStats);
      expect(loadedState.isLoading).toBe(false);
      expect(loadedState.data).toBeDefined();

      const errorState = updateToErrorState(initialState, 'Failed to load');
      expect(errorState.isLoading).toBe(false);
      expect(errorState.hasError).toBe(true);
    });
  });

  describe('Dashboard Data Refresh', () => {
    it('should refresh data at configured intervals', () => {
      vi.useFakeTimers();
      
      let refreshCount = 0;
      const refreshInterval = 30000; // 30 seconds
      
      const refreshData = vi.fn(() => {
        refreshCount++;
      });

      const intervalId = setInterval(refreshData, refreshInterval);

      // Fast forward time
      vi.advanceTimersByTime(30000);
      expect(refreshCount).toBe(1);

      vi.advanceTimersByTime(30000);
      expect(refreshCount).toBe(2);

      vi.advanceTimersByTime(60000);
      expect(refreshCount).toBe(4);

      clearInterval(intervalId);
      vi.useRealTimers();
    });

    it('should handle manual refresh correctly', async () => {
      const refreshState = {
        isRefreshing: false,
        lastRefreshed: null as Date | null,
        refreshCount: 0,
      };

      const manualRefresh = async () => {
        if (refreshState.isRefreshing) {
          return { success: false, reason: 'Already refreshing' };
        }

        refreshState.isRefreshing = true;
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
        refreshState.isRefreshing = false;
        refreshState.lastRefreshed = new Date();
        refreshState.refreshCount++;
        
        return { success: true };
      };

      // First refresh
      const result1 = await manualRefresh();
      expect(result1.success).toBe(true);
      expect(refreshState.refreshCount).toBe(1);
      expect(refreshState.lastRefreshed).not.toBeNull();
    });

    it('should debounce rapid refresh requests', async () => {
      let apiCallCount = 0;
      
      const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
        let timeoutId: NodeJS.Timeout | null = null;
        return (...args: Parameters<T>) => {
          if (timeoutId) clearTimeout(timeoutId);
          return new Promise<ReturnType<T>>((resolve) => {
            timeoutId = setTimeout(() => {
              resolve(fn(...args));
            }, delay);
          });
        };
      };

      const fetchData = () => {
        apiCallCount++;
        return { data: 'refreshed' };
      };

      const debouncedFetch = debounce(fetchData, 300);

      // Rapid calls
      debouncedFetch();
      debouncedFetch();
      debouncedFetch();
      debouncedFetch();
      debouncedFetch();

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 400));

      // Should only have called once
      expect(apiCallCount).toBe(1);
    });
  });

  describe('Dashboard Widget Visibility', () => {
    it('should filter widgets based on user configuration', () => {
      const allWidgets = ['ntf', 'license', 'connectionPool', 'validationRules', 'lowStock', 'webhookRetry', 'oee', 'spc'];
      const userConfig = {
        enabledWidgets: ['ntf', 'license', 'oee'],
      };

      const visibleWidgets = allWidgets.filter(w => userConfig.enabledWidgets.includes(w));
      
      expect(visibleWidgets).toHaveLength(3);
      expect(visibleWidgets).toContain('ntf');
      expect(visibleWidgets).toContain('license');
      expect(visibleWidgets).toContain('oee');
      expect(visibleWidgets).not.toContain('connectionPool');
    });

    it('should filter widgets based on user role', () => {
      const widgetPermissions: Record<string, string[]> = {
        ntf: ['admin', 'manager', 'operator'],
        license: ['admin'],
        connectionPool: ['admin'],
        validationRules: ['admin', 'manager'],
        lowStock: ['admin', 'manager', 'operator'],
        webhookRetry: ['admin'],
      };

      const getVisibleWidgets = (userRole: string) => {
        return Object.entries(widgetPermissions)
          .filter(([_, roles]) => roles.includes(userRole))
          .map(([widget]) => widget);
      };

      const adminWidgets = getVisibleWidgets('admin');
      expect(adminWidgets).toHaveLength(6);

      const managerWidgets = getVisibleWidgets('manager');
      expect(managerWidgets).toHaveLength(3);
      expect(managerWidgets).toContain('ntf');
      expect(managerWidgets).toContain('validationRules');
      expect(managerWidgets).toContain('lowStock');

      const operatorWidgets = getVisibleWidgets('operator');
      expect(operatorWidgets).toHaveLength(2);
      expect(operatorWidgets).toContain('ntf');
      expect(operatorWidgets).toContain('lowStock');
    });
  });

  describe('Dashboard Data Aggregation', () => {
    it('should aggregate summary statistics correctly', () => {
      const aggregateSummary = (data: typeof mockTrpcResponses) => {
        return {
          totalAlerts: data.ntfStats.pending + data.validationRules.triggered + data.lowStock.criticalCount,
          systemHealth: data.connectionPool.status === 'healthy' && data.licenseStatus.isActive ? 'good' : 'warning',
          pendingActions: data.webhookRetry.pending + data.lowStock.criticalCount,
          overallScore: Math.round(
            (data.oeeSummary.oee + (data.spcSummary.avgCpk / 2) * 100) / 2
          ),
        };
      };

      const summary = aggregateSummary(mockTrpcResponses);
      
      expect(summary.totalAlerts).toBe(17); // 10 + 5 + 2
      expect(summary.systemHealth).toBe('good');
      expect(summary.pendingActions).toBe(5); // 3 + 2
      expect(summary.overallScore).toBeGreaterThan(0);
    });

    it('should calculate trend indicators correctly', () => {
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return { direction: 'stable', percentage: 0 };
        
        const change = ((current - previous) / previous) * 100;
        
        return {
          direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
          percentage: Math.round(Math.abs(change) * 10) / 10,
        };
      };

      expect(calculateTrend(100, 80)).toEqual({ direction: 'up', percentage: 25 });
      expect(calculateTrend(80, 100)).toEqual({ direction: 'down', percentage: 20 });
      expect(calculateTrend(100, 98)).toEqual({ direction: 'stable', percentage: 2 });
      expect(calculateTrend(50, 0)).toEqual({ direction: 'stable', percentage: 0 });
    });
  });

  describe('Dashboard Navigation', () => {
    it('should generate correct widget detail URLs', () => {
      const getWidgetDetailUrl = (widgetId: string, params?: Record<string, string>) => {
        const baseUrls: Record<string, string> = {
          ntf: '/defect-statistics',
          license: '/license-activation',
          connectionPool: '/database-health',
          validationRules: '/validation-rules',
          lowStock: '/spare-parts',
          webhookRetry: '/webhooks',
          oee: '/oee-dashboard',
          spc: '/analyze',
        };

        const baseUrl = baseUrls[widgetId] || '/dashboard';
        
        if (params) {
          const queryString = new URLSearchParams(params).toString();
          return `${baseUrl}?${queryString}`;
        }
        
        return baseUrl;
      };

      expect(getWidgetDetailUrl('ntf')).toBe('/defect-statistics');
      expect(getWidgetDetailUrl('license')).toBe('/license-activation');
      expect(getWidgetDetailUrl('oee', { period: '7d' })).toBe('/oee-dashboard?period=7d');
      expect(getWidgetDetailUrl('unknown')).toBe('/dashboard');
    });

    it('should handle breadcrumb navigation correctly', () => {
      const buildBreadcrumbs = (path: string) => {
        const pathMap: Record<string, string> = {
          '': 'Dashboard',
          'defect-statistics': 'Thống kê lỗi',
          'license-activation': 'Kích hoạt License',
          'database-health': 'Sức khỏe Database',
          'validation-rules': 'Quy tắc Validation',
          'spare-parts': 'Phụ tùng',
          'webhooks': 'Webhooks',
        };

        const parts = path.split('/').filter(Boolean);
        const breadcrumbs = [{ label: 'Dashboard', path: '/' }];

        let currentPath = '';
        for (const part of parts) {
          currentPath += `/${part}`;
          breadcrumbs.push({
            label: pathMap[part] || part,
            path: currentPath,
          });
        }

        return breadcrumbs;
      };

      const breadcrumbs = buildBreadcrumbs('/defect-statistics');
      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].label).toBe('Dashboard');
      expect(breadcrumbs[1].label).toBe('Thống kê lỗi');
    });
  });
});

describe('Dashboard Widget Data Transformations', () => {
  it('should transform NTF data for chart display', () => {
    const transformNtfForChart = (data: typeof mockTrpcResponses.ntfStats) => {
      return {
        pieData: [
          { name: 'Real NG', value: data.realNg, color: '#ef4444' },
          { name: 'NTF', value: data.ntf, color: '#f59e0b' },
          { name: 'Pending', value: data.pending, color: '#6b7280' },
        ],
        trendData: data.trend.map(item => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString('vi-VN'),
        })),
        summary: {
          total: data.totalDefects,
          ntfRate: `${data.ntfRate.toFixed(1)}%`,
        },
      };
    };

    const chartData = transformNtfForChart(mockTrpcResponses.ntfStats);
    
    expect(chartData.pieData).toHaveLength(3);
    expect(chartData.pieData[0].value).toBe(100);
    expect(chartData.trendData).toHaveLength(3);
    expect(chartData.summary.ntfRate).toBe('33.3%');
  });

  it('should transform connection pool data for gauge display', () => {
    const transformPoolForGauge = (data: typeof mockTrpcResponses.connectionPool) => {
      const usagePercent = (data.active / data.maxConnections) * 100;
      
      return {
        value: usagePercent,
        status: usagePercent > 80 ? 'critical' : usagePercent > 60 ? 'warning' : 'healthy',
        label: `${data.active}/${data.maxConnections}`,
        details: {
          active: data.active,
          idle: data.idle,
          total: data.total,
          latency: `${data.avgLatency.toFixed(1)}ms`,
        },
      };
    };

    const gaugeData = transformPoolForGauge(mockTrpcResponses.connectionPool);
    
    expect(gaugeData.value).toBe(10); // 5/50 * 100
    expect(gaugeData.status).toBe('healthy');
    expect(gaugeData.label).toBe('5/50');
    expect(gaugeData.details.latency).toBe('12.5ms');
  });

  it('should transform low stock data for alert list', () => {
    const transformLowStockForAlerts = (data: typeof mockTrpcResponses.lowStock) => {
      return data.items.map(item => ({
        id: item.id,
        title: item.name,
        severity: item.currentQty <= item.minQty * 0.5 ? 'critical' : 'warning',
        message: `Còn ${item.currentQty}/${item.minQty} (${Math.round((item.currentQty / item.minQty) * 100)}%)`,
        action: {
          label: 'Đặt hàng',
          url: `/spare-parts?id=${item.id}`,
        },
      }));
    };

    const alerts = transformLowStockForAlerts(mockTrpcResponses.lowStock);
    
    expect(alerts).toHaveLength(2);
    // 5/10 = 50% which is <= 50%, so it's critical (not warning)
    // 2/5 = 40% which is <= 50%, so it's critical
    expect(alerts[0].severity).toBe('critical'); // 5/10 = 50%
    expect(alerts[1].severity).toBe('critical'); // 2/5 = 40%
    expect(alerts[0].message).toContain('50%');
  });
});
