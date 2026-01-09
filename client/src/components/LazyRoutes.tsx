import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// HOC to wrap lazy components with Suspense
export function withSuspense<P extends object>(
  LazyComponent: React.LazyExoticComponent<ComponentType<P>>
): ComponentType<P> {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ==========================================
// AI/ML Pages (heavy, less frequently accessed)
// ==========================================
export const LazyAiMlDashboard = withSuspense(lazy(() => import('@/pages/ai/AiMlDashboard')));
export const LazyAiDashboard = withSuspense(lazy(() => import('@/pages/ai/AiDashboard')));
export const LazyAiRootCause = withSuspense(lazy(() => import('@/pages/ai/AiRootCause')));
export const LazyAiPredictive = withSuspense(lazy(() => import('@/pages/ai/AiPredictive')));
export const LazyAiAnalyticsDashboard = withSuspense(lazy(() => import('@/pages/ai/AiAnalyticsDashboard')));
export const LazyABTestingManagement = withSuspense(lazy(() => import('@/pages/ai/ABTestingManagement')));
export const LazyModelVersioningPage = withSuspense(lazy(() => import('@/pages/ai/ModelVersioningPage')));
export const LazyDataDriftMonitoring = withSuspense(lazy(() => import('@/pages/ai/DataDriftMonitoring')));
export const LazyAiMlHealth = withSuspense(lazy(() => import('@/pages/ai/AiMlHealth')));
export const LazyAiCorrelationAnalysis = withSuspense(lazy(() => import('@/pages/ai/AiCorrelationAnalysis')));
export const LazyAiTrendAnalysis = withSuspense(lazy(() => import('@/pages/ai/AiTrendAnalysis')));
export const LazyAiOeeForecast = withSuspense(lazy(() => import('@/pages/ai/AiOeeForecast')));
export const LazyAiDefectPrediction = withSuspense(lazy(() => import('@/pages/ai/AiDefectPrediction')));
export const LazyAiVisionDefectDetection = withSuspense(lazy(() => import('@/pages/ai/AiVisionDefectDetection')));
export const LazyAiYieldOptimization = withSuspense(lazy(() => import('@/pages/ai/AiYieldOptimization')));
export const LazyAiReports = withSuspense(lazy(() => import('@/pages/ai/AiReports')));
export const LazyAiInsights = withSuspense(lazy(() => import('@/pages/ai/AiInsights')));
export const LazyAiTrainingJobs = withSuspense(lazy(() => import('@/pages/ai/AiTrainingJobs')));
export const LazyModelTraining = withSuspense(lazy(() => import('@/pages/ai/ModelTraining')));
export const LazyAiConfig = withSuspense(lazy(() => import('@/pages/ai/AiConfig')));
export const LazyAiThresholds = withSuspense(lazy(() => import('@/pages/ai/AiThresholds')));
export const LazyPredictiveAlertConfig = withSuspense(lazy(() => import('@/pages/ai/PredictiveAlertConfig')));
export const LazyPredictiveAlertDashboard = withSuspense(lazy(() => import('@/pages/ai/PredictiveAlertDashboard')));
export const LazyForecastAccuracyDashboard = withSuspense(lazy(() => import('@/pages/ai/ForecastAccuracyDashboard')));
export const LazyAiDataSources = withSuspense(lazy(() => import('@/pages/ai/AiDataSources')));
export const LazyAiAuditLogs = withSuspense(lazy(() => import('@/pages/ai/AiAuditLogs')));
export const LazyAiAlerts = withSuspense(lazy(() => import('@/pages/ai/AiAlerts')));
export const LazyAiPredictions = withSuspense(lazy(() => import('@/pages/ai/AiPredictions')));
export const LazyAiPredictionThresholds = withSuspense(lazy(() => import('@/pages/ai/AiPredictionThresholds')));
export const LazyAiPredictionHistory = withSuspense(lazy(() => import('@/pages/ai/AiPredictionHistory')));
export const LazyCpkForecastingPage = withSuspense(lazy(() => import('@/pages/ai/CpkForecastingPage')));
export const LazyDefectDetectionPage = withSuspense(lazy(() => import('@/pages/ai/DefectDetectionPage')));
export const LazyFirebasePushSettingsPage = withSuspense(lazy(() => import('@/pages/ai/FirebasePushSettingsPage')));
export const LazyCpkComparisonPage = withSuspense(lazy(() => import('@/pages/ai/CpkComparisonPage')));
export const LazyAiModelPerformance = withSuspense(lazy(() => import('@/pages/ai/AiModelPerformance')));
export const LazyAiModelComparison = withSuspense(lazy(() => import('@/pages/ai/AiModelComparison')));

// ==========================================
// IoT Pages (heavy, specialized)
// ==========================================
export const LazyIoTDashboard = withSuspense(lazy(() => import('@/pages/IoTDashboard')));
export const LazyIotOverviewDashboard = withSuspense(lazy(() => import('@/pages/IotOverviewDashboard')));
export const LazyIotRealtimeDashboard = withSuspense(lazy(() => import('@/pages/IotRealtimeDashboard')));
export const LazyIoTFloorPlan = withSuspense(lazy(() => import('@/pages/IoTFloorPlan')));
export const LazyFloorPlanDesignerPage = withSuspense(lazy(() => import('@/pages/FloorPlanDesignerPage')));
export const LazyIoTUnifiedDashboard = withSuspense(lazy(() => import('@/pages/IoTUnifiedDashboard')));
export const LazyIoTEnhancedDashboard = withSuspense(lazy(() => import('@/pages/IoTEnhancedDashboard')));
export const LazyIoTDeviceManagement = withSuspense(lazy(() => import('@/pages/IoTDeviceManagement')));
export const LazyIoTProtocolManagement = withSuspense(lazy(() => import('@/pages/IoTProtocolManagement')));
export const LazyIoTAlertEscalation = withSuspense(lazy(() => import('@/pages/IoTAlertEscalation')));
export const LazyIoTAnalytics = withSuspense(lazy(() => import('@/pages/IoTAnalytics')));
export const LazyIoTFirmwareOTA = withSuspense(lazy(() => import('@/pages/IoTFirmwareOTA')));
export const LazyIoTFloorPlanIntegration = withSuspense(lazy(() => import('@/pages/IoTFloorPlanIntegration')));
export const LazyIoTPredictiveMaintenance = withSuspense(lazy(() => import('@/pages/IoTPredictiveMaintenance')));
export const LazyIoTScheduledOTA = withSuspense(lazy(() => import('@/pages/IoTScheduledOTA')));
export const LazyIoT3DFloorPlan = withSuspense(lazy(() => import('@/pages/IoT3DFloorPlan')));
export const LazyIoTWorkOrders = withSuspense(lazy(() => import('@/pages/IoTWorkOrders')));
export const LazyIotWorkOrderManagement = withSuspense(lazy(() => import('@/pages/IotWorkOrderManagement')));
export const LazyIotMonitoringRealtime = withSuspense(lazy(() => import('@/pages/iot/IotMonitoringRealtime')));
export const LazyIoTUserGuide = withSuspense(lazy(() => import('@/pages/IoTUserGuide')));

// ==========================================
// 3D/Visualization Pages (heavy)
// ==========================================
export const LazyModel3DManagement = withSuspense(lazy(() => import('@/pages/Model3DManagement')));
export const LazyFloorPlanLive = withSuspense(lazy(() => import('@/pages/FloorPlanLive')));

// ==========================================
// Reports & Analytics (less frequently accessed)
// ==========================================
export const LazyAdvancedAnalytics = withSuspense(lazy(() => import('@/pages/AdvancedAnalytics')));
export const LazyAdvancedAnalyticsDashboard = withSuspense(lazy(() => import('@/pages/AdvancedAnalyticsDashboard')));
export const LazyCustomReportBuilder = withSuspense(lazy(() => import('@/pages/CustomReportBuilder')));
export const LazyExportReports = withSuspense(lazy(() => import('@/pages/ExportReports')));
export const LazyReportsExport = withSuspense(lazy(() => import('@/pages/ReportsExport')));
export const LazyReportsExportEnhanced = withSuspense(lazy(() => import('@/pages/ReportsExportEnhanced')));

// ==========================================
// Admin/Settings Pages (less frequently accessed)
// ==========================================
export const LazyAuditLogs = withSuspense(lazy(() => import('@/pages/AuditLogs')));
export const LazyBackupHistory = withSuspense(lazy(() => import('@/pages/BackupHistory')));
export const LazyBackupRestore = withSuspense(lazy(() => import('@/pages/BackupRestore')));
export const LazyRateLimitDashboard = withSuspense(lazy(() => import('@/pages/RateLimitDashboard')));
export const LazyAdminMonitoring = withSuspense(lazy(() => import('@/pages/AdminMonitoring')));
export const LazySecurityDashboard = withSuspense(lazy(() => import('@/pages/SecurityDashboard')));
export const LazySystemHealthDashboard = withSuspense(lazy(() => import('@/pages/SystemHealthDashboard')));

// ==========================================
// License Pages (admin only)
// ==========================================
export const LazyLicenseManagement = withSuspense(lazy(() => import('@/pages/LicenseManagement')));
export const LazyLicenseNotificationReport = withSuspense(lazy(() => import('@/pages/LicenseNotificationReport')));
export const LazyLicenseDashboard = withSuspense(lazy(() => import('@/pages/LicenseDashboard')));
export const LazyLicenseCustomers = withSuspense(lazy(() => import('@/pages/LicenseCustomers')));
export const LazyLicenseRevenue = withSuspense(lazy(() => import('@/pages/LicenseRevenue')));
export const LazyLicenseServerSettings = withSuspense(lazy(() => import('@/pages/LicenseServerSettings')));
export const LazyLicenseServerDashboard = withSuspense(lazy(() => import('@/pages/LicenseServerDashboard')));
export const LazyLicenseActivation = withSuspense(lazy(() => import('@/pages/LicenseActivation')));
export const LazyLicenseAdmin = withSuspense(lazy(() => import('@/pages/LicenseAdmin')));

// ==========================================
// Maintenance Pages (specialized)
// ==========================================
export const LazyMaintenanceDashboard = withSuspense(lazy(() => import('@/pages/MaintenanceDashboard')));
export const LazyMaintenanceSchedule = withSuspense(lazy(() => import('@/pages/MaintenanceSchedule')));
export const LazyPredictiveMaintenance = withSuspense(lazy(() => import('@/pages/PredictiveMaintenance')));
export const LazySparePartsManagement = withSuspense(lazy(() => import('@/pages/SparePartsManagement')));
export const LazySparePartsGuide = withSuspense(lazy(() => import('@/pages/SparePartsGuide')));
export const LazySparePartsCostReport = withSuspense(lazy(() => import('@/pages/SparePartsCostReport')));
export const LazyStockMovements = withSuspense(lazy(() => import('@/pages/StockMovements')));
export const LazyInventoryCheck = withSuspense(lazy(() => import('@/pages/InventoryCheck')));
export const LazyStockReport = withSuspense(lazy(() => import('@/pages/StockReport')));

// ==========================================
// MTTR/MTBF Pages
// ==========================================
export const LazyMttrMtbfReport = withSuspense(lazy(() => import('@/pages/MttrMtbfReport')));
export const LazyScheduledMttrMtbfReports = withSuspense(lazy(() => import('@/pages/ScheduledMttrMtbfReports')));
export const LazyMttrMtbfComparison = withSuspense(lazy(() => import('@/pages/MttrMtbfComparison')));
export const LazyMttrMtbfThresholds = withSuspense(lazy(() => import('@/pages/MttrMtbfThresholds')));
export const LazyMttrMtbfPrediction = withSuspense(lazy(() => import('@/pages/MttrMtbfPrediction')));

// ==========================================
// Edge/Gateway Pages (specialized)
// ==========================================
export const LazyEdgeGatewayDashboard = withSuspense(lazy(() => import('@/pages/EdgeGatewayDashboard')));
export const LazyEdgeSimulatorDashboard = withSuspense(lazy(() => import('@/pages/EdgeSimulatorDashboard')));
export const LazyTimeseriesDashboard = withSuspense(lazy(() => import('@/pages/TimeseriesDashboard')));
export const LazyAnomalyDetectionDashboard = withSuspense(lazy(() => import('@/pages/AnomalyDetectionDashboard')));

// ==========================================
// NTF Pages (specialized)
// ==========================================
export const LazyNtfAlertConfig = withSuspense(lazy(() => import('@/pages/NtfAlertConfig')));
export const LazyNtfComparison = withSuspense(lazy(() => import('@/pages/NtfComparison')));
export const LazyNtfDashboard = withSuspense(lazy(() => import('@/pages/NtfDashboard')));
export const LazyNtfLineDetail = withSuspense(lazy(() => import('@/pages/NtfLineDetail')));
export const LazyNtfShiftAnalysis = withSuspense(lazy(() => import('@/pages/NtfShiftAnalysis')));
export const LazyNtfProductAnalysis = withSuspense(lazy(() => import('@/pages/NtfProductAnalysis')));
export const LazyNtfDepartmentDashboard = withSuspense(lazy(() => import('@/pages/NtfDepartmentDashboard')));
export const LazyNtfSupplierAnalysis = withSuspense(lazy(() => import('@/pages/NtfSupplierAnalysis')));
export const LazyNtfEnvironmentCorrelation = withSuspense(lazy(() => import('@/pages/NtfEnvironmentCorrelation')));
export const LazyNtfCeoDashboard = withSuspense(lazy(() => import('@/pages/NtfCeoDashboard')));

// ==========================================
// Escalation Pages (specialized)
// ==========================================
export const LazyEscalationConfigPage = withSuspense(lazy(() => import('@/pages/EscalationConfigPage')));
export const LazyEscalationDashboard = withSuspense(lazy(() => import('@/pages/EscalationDashboard')));
export const LazyEscalationWebhookSettings = withSuspense(lazy(() => import('@/pages/EscalationWebhookSettings')));
export const LazyEscalationTemplates = withSuspense(lazy(() => import('@/pages/EscalationTemplates')));
export const LazyEscalationReports = withSuspense(lazy(() => import('@/pages/EscalationReports')));

// ==========================================
// API Documentation
// ==========================================
export const LazyApiDocumentation = withSuspense(lazy(() => import('@/pages/ApiDocumentation')));
export const LazyMachineApiDocumentation = withSuspense(lazy(() => import('@/pages/MachineApiDocumentation')));

// ==========================================
// User Guide
// ==========================================
export const LazyUserGuide = withSuspense(lazy(() => import('@/pages/UserGuide')));
export const LazyVideoManagement = withSuspense(lazy(() => import('@/pages/VideoManagement')));

// ==========================================
// Seed Data (admin only)
// ==========================================
export const LazySeedDataPage = withSuspense(lazy(() => import('@/pages/SeedDataPage')));
export const LazyMMSDataInit = withSuspense(lazy(() => import('@/pages/MMSDataInit')));

// ==========================================
// Vision/Camera Pages (specialized)
// ==========================================
export const LazyImageComparison = withSuspense(lazy(() => import('@/pages/ImageComparison')));
export const LazyCameraCapture = withSuspense(lazy(() => import('@/pages/CameraCapture')));
export const LazyAutoCapture = withSuspense(lazy(() => import('@/pages/AutoCapture')));
export const LazyAviAoiDashboard = withSuspense(lazy(() => import('@/pages/AviAoiDashboard')));
export const LazyAiVisionAnalysis = withSuspense(lazy(() => import('@/pages/AiVisionAnalysis')));
export const LazyAiVisionDashboard = withSuspense(lazy(() => import('@/pages/AiVisionDashboard')));
