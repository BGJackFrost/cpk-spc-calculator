/**
 * LazyCharts - Lazy loaded wrappers for heavy chart components
 * Code splits recharts để giảm bundle size ban đầu
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for charts
function ChartLoader({ height = 300 }: { height?: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-muted/20 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Đang tải biểu đồ...</span>
      </div>
    </div>
  );
}

// Lazy load with retry logic
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 500
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

// HOC to wrap lazy components with Suspense
function withChartSuspense<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>,
  fallbackHeight = 300
) {
  return function ChartWithSuspense(props: P) {
    return (
      <Suspense fallback={<ChartLoader height={fallbackHeight} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================
// Lazy loaded chart components
// ============================================

// Advanced Charts - Heavy component with multiple chart types
export const LazyAdvancedCharts = withChartSuspense(
  lazyWithRetry(() => import('@/components/AdvancedCharts')),
  400
);

// CPK Forecast Chart
export const LazyCpkForecast = withChartSuspense(
  lazyWithRetry(() => import('@/components/CpkForecast')),
  350
);

// CPK Radar Comparison
export const LazyCpkRadarComparison = withChartSuspense(
  lazyWithRetry(() => import('@/components/CpkRadarComparison')),
  400
);

// Enhanced SPC Chart
export const LazyEnhancedSpcChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/EnhancedSpcChart')),
  400
);

// OEE Trend Chart
export const LazyOEETrendChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/OEETrendChart')),
  350
);

// Pareto Chart
export const LazyParetoChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/ParetoChart')),
  350
);

// Production Line Comparison Chart
export const LazyProductionLineComparisonChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/ProductionLineComparisonChart')),
  400
);

// Radar Chart History Comparison
export const LazyRadarChartHistoryComparison = withChartSuspense(
  lazyWithRetry(() => import('@/components/RadarChartHistoryComparison')),
  400
);

// IoT Realtime Chart
export const LazyIoTRealtimeChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/IoTRealtimeChart')),
  300
);

// IoT Sensor Realtime
export const LazyIoTSensorRealtime = withChartSuspense(
  lazyWithRetry(() => import('@/components/IoTSensorRealtime')),
  350
);

// Maintenance History Chart
export const LazyMaintenanceHistoryChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/MaintenanceHistoryChart')),
  350
);

// MTTR/MTBF Trend Widget
export const LazyMttrMtbfTrendWidget = withChartSuspense(
  lazyWithRetry(() => import('@/components/MttrMtbfTrendWidget')),
  300
);

// MTTR/MTBF Comparison Widget
export const LazyMttrMtbfComparisonWidget = withChartSuspense(
  lazyWithRetry(() => import('@/components/MttrMtbfComparisonWidget')),
  350
);

// Performance Dashboard Widget
export const LazyPerformanceDashboardWidget = withChartSuspense(
  lazyWithRetry(() => import('@/components/PerformanceDashboardWidget')),
  400
);

// AI Vision Trend Chart
export const LazyAiVisionTrendChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/AiVisionTrendChart')),
  350
);

// Connection Pool Widget
export const LazyConnectionPoolWidget = withChartSuspense(
  lazyWithRetry(() => import('@/components/ConnectionPoolWidget')),
  250
);

// Latency Monitor
export const LazyLatencyMonitor = withChartSuspense(
  lazyWithRetry(() => import('@/components/LatencyMonitor')),
  300
);

// Latency Trends Chart
export const LazyLatencyTrendsChart = withChartSuspense(
  lazyWithRetry(() => import('@/components/LatencyTrendsChart')),
  300
);

// NTF Prediction
export const LazyNtfPrediction = withChartSuspense(
  lazyWithRetry(() => import('@/components/NtfPrediction')),
  350
);

// OEE Line Comparison Realtime
export const LazyOeeLineComparisonRealtime = withChartSuspense(
  lazyWithRetry(() => import('@/components/OeeLineComparisonRealtime')),
  400
);

// Realtime Plan Card
export const LazyRealtimePlanCard = withChartSuspense(
  lazyWithRetry(() => import('@/components/RealtimePlanCard')),
  300
);

// Export ChartLoader for external use
export { ChartLoader };
