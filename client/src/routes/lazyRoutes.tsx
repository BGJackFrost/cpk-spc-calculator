/**
 * Lazy Routes - Code splitting for all pages
 * Sử dụng React.lazy để lazy load các trang, giảm bundle size ban đầu
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component cho lazy routes
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải trang...</p>
      </div>
    </div>
  );
}

// Lazy load wrapper with retry logic
function lazyWithRetry<T extends ComponentType<any>>(
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

// Suspense wrapper HOC
export function withSuspense<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================
// Core Pages - Load immediately (small bundles)
// ============================================
export { default as LandingPage } from '@/pages/LandingPage';
export { default as Home } from '@/pages/Home';
export { default as LocalLogin } from '@/pages/LocalLogin';
export { default as NotFound } from '@/pages/NotFound';

// ============================================
// Dashboard & Analytics - Lazy loaded
// ============================================
export const Dashboard = withSuspense(lazyWithRetry(() => import('@/pages/Dashboard')));
export const UnifiedDashboard = withSuspense(lazyWithRetry(() => import('@/pages/UnifiedDashboard')));
export const AdvancedAnalytics = withSuspense(lazyWithRetry(() => import('@/pages/AdvancedAnalytics')));
export const AdvancedAnalyticsDashboard = withSuspense(lazyWithRetry(() => import('@/pages/AdvancedAnalyticsDashboard')));
export const PlantKPIDashboard = withSuspense(lazyWithRetry(() => import('@/pages/PlantKPIDashboard')));
export const PlantKPIDashboardEnhanced = withSuspense(lazyWithRetry(() => import('@/pages/PlantKPIDashboardEnhanced')));
export const NtfCeoDashboard = withSuspense(lazyWithRetry(() => import('@/pages/NtfCeoDashboard')));
export const SupervisorDashboard = withSuspense(lazyWithRetry(() => import('@/pages/SupervisorDashboard')));
export const ShiftManagerDashboard = withSuspense(lazyWithRetry(() => import('@/pages/ShiftManagerDashboard')));

// ============================================
// SPC/CPK Analysis - Lazy loaded
// ============================================
export const Analyze = withSuspense(lazyWithRetry(() => import('@/pages/Analyze')));
export const MultiAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/MultiAnalysis')));
export const SpcReport = withSuspense(lazyWithRetry(() => import('@/pages/SpcReport')));
export const SpcSummaryReport = withSuspense(lazyWithRetry(() => import('@/pages/SpcSummaryReport')));
export const CpkComparisonDashboard = withSuspense(lazyWithRetry(() => import('@/pages/CpkComparisonDashboard')));
export const ShiftCpkComparison = withSuspense(lazyWithRetry(() => import('@/pages/ShiftCpkComparison')));
export const CpkForecastPage = withSuspense(lazyWithRetry(() => import('@/pages/CpkForecastPage')));
export const CpkHistoryComparison = withSuspense(lazyWithRetry(() => import('@/pages/CpkHistoryComparison')));

// ============================================
// Production Management - Lazy loaded
// ============================================
export const ProductionLinesDashboard = withSuspense(lazyWithRetry(() => import('@/pages/ProductionLinesDashboard')));
export const ProductionLineManagement = withSuspense(lazyWithRetry(() => import('@/pages/ProductionLineManagement')));
export const ProductionLineComparison = withSuspense(lazyWithRetry(() => import('@/pages/ProductionLineComparison')));
export const LineComparison = withSuspense(lazyWithRetry(() => import('@/pages/LineComparison')));
export const WorkstationManagement = withSuspense(lazyWithRetry(() => import('@/pages/WorkstationManagement')));
export const MachineManagement = withSuspense(lazyWithRetry(() => import('@/pages/MachineManagement')));
export const ProcessManagement = withSuspense(lazyWithRetry(() => import('@/pages/ProcessManagement')));

// ============================================
// OEE - Lazy loaded
// ============================================
export const OEEDashboard = withSuspense(lazyWithRetry(() => import('@/pages/OEEDashboard')));
export const OEEAnalysisDashboard = withSuspense(lazyWithRetry(() => import('@/pages/OEEAnalysisDashboard')));
export const OEEComparisonDashboard = withSuspense(lazyWithRetry(() => import('@/pages/OEEComparisonDashboard')));
export const OeeWidget = withSuspense(lazyWithRetry(() => import('@/pages/OeeWidget')));
export const OeeWidgetConfig = withSuspense(lazyWithRetry(() => import('@/pages/OeeWidgetConfig')));

// ============================================
// IoT - Lazy loaded (Heavy components)
// ============================================
export const IoTDashboard = withSuspense(lazyWithRetry(() => import('@/pages/IoTDashboard')));
export const IotOverviewDashboard = withSuspense(lazyWithRetry(() => import('@/pages/IotOverviewDashboard')));
export const IotRealtimeDashboard = withSuspense(lazyWithRetry(() => import('@/pages/IotRealtimeDashboard')));
export const IoTUnifiedDashboard = withSuspense(lazyWithRetry(() => import('@/pages/IoTUnifiedDashboard')));
export const IoTEnhancedDashboard = withSuspense(lazyWithRetry(() => import('@/pages/IoTEnhancedDashboard')));
export const IoTFloorPlan = withSuspense(lazyWithRetry(() => import('@/pages/IoTFloorPlan')));
export const IoT3DFloorPlan = withSuspense(lazyWithRetry(() => import('@/pages/IoT3DFloorPlan')));
export const FloorPlanDesignerPage = withSuspense(lazyWithRetry(() => import('@/pages/FloorPlanDesignerPage')));
export const FloorPlanLive = withSuspense(lazyWithRetry(() => import('@/pages/FloorPlanLive')));
export const IoTDeviceManagement = withSuspense(lazyWithRetry(() => import('@/pages/IoTDeviceManagement')));
export const IoTProtocolManagement = withSuspense(lazyWithRetry(() => import('@/pages/IoTProtocolManagement')));
export const IoTAnalytics = withSuspense(lazyWithRetry(() => import('@/pages/IoTAnalytics')));
export const IoTGatewayConfig = withSuspense(lazyWithRetry(() => import('@/pages/IoTGatewayConfig')));
export const IoTPredictiveMaintenance = withSuspense(lazyWithRetry(() => import('@/pages/IoTPredictiveMaintenance')));
export const IoTWorkOrders = withSuspense(lazyWithRetry(() => import('@/pages/IoTWorkOrders')));
export const IotWorkOrderManagement = withSuspense(lazyWithRetry(() => import('@/pages/IotWorkOrderManagement')));
export const IotDeviceCrud = withSuspense(lazyWithRetry(() => import('@/pages/IotDeviceCrud')));
export const IotAlarmCrud = withSuspense(lazyWithRetry(() => import('@/pages/IotAlarmCrud')));
export const IoTUserGuide = withSuspense(lazyWithRetry(() => import('@/pages/IoTUserGuide')));

// ============================================
// AI/ML - Lazy loaded (Heavy components)
// ============================================
export const AiMlDashboard = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiMlDashboard')));
export const AiDashboard = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiDashboard')));
export const AiSpcAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/AiSpcAnalysis')));
export const AiRootCause = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiRootCause')));
export const AiNaturalLanguage = withSuspense(lazyWithRetry(() => import('@/pages/AiNaturalLanguage')));
export const AiPredictive = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiPredictive')));
export const AiModelTraining = withSuspense(lazyWithRetry(() => import('@/pages/AiModelTraining')));
export const AiAnalyticsDashboard = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiAnalyticsDashboard')));
export const AiCorrelationAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiCorrelationAnalysis')));
export const AiTrendAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiTrendAnalysis')));
export const AiOeeForecast = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiOeeForecast')));
export const AiDefectPrediction = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiDefectPrediction')));
export const AiVisionDefectDetection = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiVisionDefectDetection')));
export const AiYieldOptimization = withSuspense(lazyWithRetry(() => import('@/pages/ai/AiYieldOptimization')));
export const AiVisionDashboard = withSuspense(lazyWithRetry(() => import('@/pages/AiVisionDashboard')));
export const AiVisionAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/AiVisionAnalysis')));

// ============================================
// Maintenance - Lazy loaded
// ============================================
export const MaintenanceDashboard = withSuspense(lazyWithRetry(() => import('@/pages/MaintenanceDashboard')));
export const MaintenanceSchedule = withSuspense(lazyWithRetry(() => import('@/pages/MaintenanceSchedule')));
export const PredictiveMaintenance = withSuspense(lazyWithRetry(() => import('@/pages/PredictiveMaintenance')));
export const SparePartsManagement = withSuspense(lazyWithRetry(() => import('@/pages/SparePartsManagement')));
export const MttrMtbfReport = withSuspense(lazyWithRetry(() => import('@/pages/MttrMtbfReport')));
export const MttrMtbfComparison = withSuspense(lazyWithRetry(() => import('@/pages/MttrMtbfComparison')));
export const MttrMtbfPrediction = withSuspense(lazyWithRetry(() => import('@/pages/MttrMtbfPrediction')));

// ============================================
// Reports & Export - Lazy loaded
// ============================================
export const CustomReportBuilder = withSuspense(lazyWithRetry(() => import('@/pages/CustomReportBuilder')));
export const ReportsExport = withSuspense(lazyWithRetry(() => import('@/pages/ReportsExport')));
export const ReportsExportEnhanced = withSuspense(lazyWithRetry(() => import('@/pages/ReportsExportEnhanced')));
export const ExportReports = withSuspense(lazyWithRetry(() => import('@/pages/ExportReports')));
export const ExportHistory = withSuspense(lazyWithRetry(() => import('@/pages/ExportHistory')));
export const QualityTrendReport = withSuspense(lazyWithRetry(() => import('@/pages/QualityTrendReport')));

// ============================================
// Database & System - Lazy loaded
// ============================================
export const DatabaseUnified = withSuspense(lazyWithRetry(() => import('@/pages/DatabaseUnified')));
export const DatabaseSettings = withSuspense(lazyWithRetry(() => import('@/pages/DatabaseSettings')));
export const DatabaseHealthDashboard = withSuspense(lazyWithRetry(() => import('@/pages/DatabaseHealthDashboard')));
export const DatabaseConnectionsSettings = withSuspense(lazyWithRetry(() => import('@/pages/DatabaseConnectionsSettings')));
export const DatabaseConnectionWizard = withSuspense(lazyWithRetry(() => import('@/pages/DatabaseConnectionWizard')));
export const DataMigrationTool = withSuspense(lazyWithRetry(() => import('@/pages/DataMigrationTool')));
export const DataMigrationToolEnhanced = withSuspense(lazyWithRetry(() => import('@/pages/DataMigrationToolEnhanced')));
export const SchemaComparison = withSuspense(lazyWithRetry(() => import('@/pages/SchemaComparison')));
export const BackupRestore = withSuspense(lazyWithRetry(() => import('@/pages/BackupRestore')));
export const SystemHealthDashboard = withSuspense(lazyWithRetry(() => import('@/pages/SystemHealthDashboard')));
export const SecurityDashboard = withSuspense(lazyWithRetry(() => import('@/pages/SecurityDashboard')));
export const AdminMonitoring = withSuspense(lazyWithRetry(() => import('@/pages/AdminMonitoring')));

// ============================================
// Anomaly Detection - Lazy loaded
// ============================================
export const AnomalyDetection = withSuspense(lazyWithRetry(() => import('@/pages/AnomalyDetection')));
export const AnomalyDetectionDashboard = withSuspense(lazyWithRetry(() => import('@/pages/AnomalyDetectionDashboard')));

// ============================================
// Machine Monitoring - Lazy loaded
// ============================================
export const MachineOverviewDashboard = withSuspense(lazyWithRetry(() => import('@/pages/MachineOverviewDashboard')));
export const MachineDetailLive = withSuspense(lazyWithRetry(() => import('@/pages/MachineDetailLive')));
export const MachineDetail = withSuspense(lazyWithRetry(() => import('@/pages/MachineDetail')));
export const MachineComparison = withSuspense(lazyWithRetry(() => import('@/pages/MachineComparison')));
export const MachineIntegrationDashboard = withSuspense(lazyWithRetry(() => import('@/pages/MachineIntegrationDashboard')));
export const MachineStatusReport = withSuspense(lazyWithRetry(() => import('@/pages/MachineStatusReport')));

// ============================================
// 3D Models - Lazy loaded (Heavy - Three.js)
// ============================================
export const Model3DManagement = withSuspense(lazyWithRetry(() => import('@/pages/Model3DManagement')));

// ============================================
// Realtime Dashboards - Lazy loaded
// ============================================
export const RealtimeLineDashboard = withSuspense(lazyWithRetry(() => import('@/pages/RealtimeLineDashboard')));
export const UnifiedRealtimeDashboard = withSuspense(lazyWithRetry(() => import('@/pages/UnifiedRealtimeDashboard')));

// ============================================
// Alert & Notification - Lazy loaded
// ============================================
export const AlertDashboard = withSuspense(lazyWithRetry(() => import('@/pages/AlertDashboard')));
export const AlertConfiguration = withSuspense(lazyWithRetry(() => import('@/pages/AlertConfiguration')));
export const AlertConfigurationEnhanced = withSuspense(lazyWithRetry(() => import('@/pages/AlertConfigurationEnhanced')));
export const AlertAnalytics = withSuspense(lazyWithRetry(() => import('@/pages/AlertAnalytics')));
export const NotificationCenter = withSuspense(lazyWithRetry(() => import('@/pages/NotificationCenter')));
export const EscalationDashboard = withSuspense(lazyWithRetry(() => import('@/pages/EscalationDashboard')));

// ============================================
// NTF Analysis - Lazy loaded
// ============================================
export const NtfDashboard = withSuspense(lazyWithRetry(() => import('@/pages/NtfDashboard')));
export const NtfComparison = withSuspense(lazyWithRetry(() => import('@/pages/NtfComparison')));
export const NtfShiftAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/NtfShiftAnalysis')));
export const NtfProductAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/NtfProductAnalysis')));
export const NtfDepartmentDashboard = withSuspense(lazyWithRetry(() => import('@/pages/NtfDepartmentDashboard')));
export const NtfSupplierAnalysis = withSuspense(lazyWithRetry(() => import('@/pages/NtfSupplierAnalysis')));
export const NtfEnvironmentCorrelation = withSuspense(lazyWithRetry(() => import('@/pages/NtfEnvironmentCorrelation')));

// ============================================
// Edge & Timeseries - Lazy loaded
// ============================================
export const EdgeGatewayDashboard = withSuspense(lazyWithRetry(() => import('@/pages/EdgeGatewayDashboard')));
export const EdgeSimulatorDashboard = withSuspense(lazyWithRetry(() => import('@/pages/EdgeSimulatorDashboard')));
export const TimeseriesDashboard = withSuspense(lazyWithRetry(() => import('@/pages/TimeseriesDashboard')));

// ============================================
// AVI/AOI - Lazy loaded
// ============================================
export const AviAoiDashboard = withSuspense(lazyWithRetry(() => import('@/pages/AviAoiDashboard')));
export const ImageComparison = withSuspense(lazyWithRetry(() => import('@/pages/ImageComparison')));
export const CameraCapture = withSuspense(lazyWithRetry(() => import('@/pages/CameraCapture')));
export const AutoCapture = withSuspense(lazyWithRetry(() => import('@/pages/AutoCapture')));

// ============================================
// License Management - Lazy loaded
// ============================================
export const LicenseManagement = withSuspense(lazyWithRetry(() => import('@/pages/LicenseManagement')));
export const LicenseDashboard = withSuspense(lazyWithRetry(() => import('@/pages/LicenseDashboard')));
export const LicenseServerDashboard = withSuspense(lazyWithRetry(() => import('@/pages/LicenseServerDashboard')));
export const LicenseCustomers = withSuspense(lazyWithRetry(() => import('@/pages/LicenseCustomers')));
export const LicenseRevenue = withSuspense(lazyWithRetry(() => import('@/pages/LicenseRevenue')));

// ============================================
// Sync & Cache - Lazy loaded
// ============================================
export const SyncDashboard = withSuspense(lazyWithRetry(() => import('@/pages/SyncDashboard')));
export const CacheMonitoringDashboard = withSuspense(lazyWithRetry(() => import('@/pages/CacheMonitoringDashboard')));
export const RateLimitDashboard = withSuspense(lazyWithRetry(() => import('@/pages/RateLimitDashboard')));
export const PerformanceTrendsDashboard = withSuspense(lazyWithRetry(() => import('@/pages/PerformanceTrendsDashboard')));

// ============================================
// KPI - Lazy loaded
// ============================================
export const UnifiedAlertKpiDashboard = withSuspense(lazyWithRetry(() => import('@/pages/UnifiedAlertKpiDashboard')));
export const KpiAlertStats = withSuspense(lazyWithRetry(() => import('@/pages/KpiAlertStats')));
export const WeeklyKpiTrend = withSuspense(lazyWithRetry(() => import('@/pages/WeeklyKpiTrend')));

// ============================================
// Sensor & MQTT - Lazy loaded
// ============================================
export const SensorDashboard = withSuspense(lazyWithRetry(() => import('@/pages/SensorDashboard')));
export const MqttConnectionManagement = withSuspense(lazyWithRetry(() => import('@/pages/MqttConnectionManagement')));
export const OpcuaConnectionManagement = withSuspense(lazyWithRetry(() => import('@/pages/OpcuaConnectionManagement')));

// Re-export RouteLoader for external use
export { RouteLoader };
