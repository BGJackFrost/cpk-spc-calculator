/**
 * LazyPageLoader - Wrapper component for lazy loaded pages
 * Provides loading state and error boundary for code-split pages
 */

import { Suspense, ComponentType, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

// Error fallback component
function PageError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-xl">!</span>
        </div>
        <h3 className="font-semibold">Không thể tải trang</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}

// Lazy load wrapper with retry logic
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[LazyLoad] Retry ${i + 1}/${retries} failed:`, error);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

// Suspense wrapper component
interface LazyPageProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyPage({ children, fallback }: LazyPageProps) {
  return (
    <Suspense fallback={fallback || <PageLoader />}>
      {children}
    </Suspense>
  );
}

// Pre-defined lazy loaded pages for heavy components
export const LazyAdvancedAnalytics = lazyWithRetry(
  () => import('@/pages/AdvancedAnalytics')
);

export const LazyAdvancedAnalyticsDashboard = lazyWithRetry(
  () => import('@/pages/AdvancedAnalyticsDashboard')
);

export const LazyCustomReportBuilder = lazyWithRetry(
  () => import('@/pages/CustomReportBuilder')
);

export const LazyDatabaseUnified = lazyWithRetry(
  () => import('@/pages/DatabaseUnified')
);

export const LazyDataMigrationToolEnhanced = lazyWithRetry(
  () => import('@/pages/DataMigrationToolEnhanced')
);

export const LazyOEEDashboard = lazyWithRetry(
  () => import('@/pages/OEEDashboard')
);

export const LazySystemHealthDashboard = lazyWithRetry(
  () => import('@/pages/SystemHealthDashboard')
);

export const LazySecurityDashboard = lazyWithRetry(
  () => import('@/pages/SecurityDashboard')
);

export const LazyIoTDashboard = lazyWithRetry(
  () => import('@/pages/IoTDashboard')
);

export const LazyAiMlDashboard = lazyWithRetry(
  () => import('@/pages/AiMlDashboard')
);

export const LazyNtfCeoDashboard = lazyWithRetry(
  () => import('@/pages/NtfCeoDashboard')
);

export const LazyPlantKPIDashboard = lazyWithRetry(
  () => import('@/pages/PlantKPIDashboard')
);

export const LazyUnifiedDashboard = lazyWithRetry(
  () => import('@/pages/UnifiedDashboard')
);

export const LazyMachineIntegrationDashboard = lazyWithRetry(
  () => import('@/pages/MachineIntegrationDashboard')
);

export const LazyPredictiveMaintenance = lazyWithRetry(
  () => import('@/pages/PredictiveMaintenance')
);

export const LazyAnomalyDetection = lazyWithRetry(
  () => import('@/pages/AnomalyDetection')
);

export default LazyPage;
