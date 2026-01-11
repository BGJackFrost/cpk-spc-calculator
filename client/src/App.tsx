import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// import RolePermissionManagement from "./pages/RolePermissionManagement"; // Merged into ModulePermissionManagement
import SseNotificationProvider from "./components/SseNotificationProvider";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts";


// Direct page imports (not in lazyRoutes)
import History from "./pages/History";
import Mappings from "./pages/Mappings";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import ProductManagement from "./pages/ProductManagement";
import SpecificationManagement from "./pages/SpecificationManagement";
import SamplingMethodManagement from "./pages/SamplingMethodManagement";
import SpcPlanManagement from "./pages/SpcPlanManagement";
import EmailNotificationSettings from "./pages/EmailNotificationSettings";
import SmtpSettings from "./pages/SmtpSettings";
import SeedDataPage from "./pages/SeedDataPage";
import AuditLogs from "./pages/AuditLogs";
import DefectManagement from "./pages/DefectManagement";
import DefectStatistics from "./pages/DefectStatistics";
import MachineTypeManagement from "./pages/MachineTypeManagement";
import FixtureManagement from "./pages/FixtureManagement";
import JigManagement from "./pages/JigManagement";
import About from "./pages/About";
import ApiDocumentation from "@/pages/ApiDocumentation";
import Profile from "./pages/Profile";
import RulesManagement from "./pages/RulesManagement";
import SpcPlanVisualization from "./pages/SpcPlanVisualization";
import SpcVisualizationDetail from "./pages/SpcVisualizationDetail";
import WebhookManagement from "./pages/WebhookManagement";
import ReportTemplateManagement from "./pages/ReportTemplateManagement";
import LocalUserManagement from "./pages/LocalUserManagement";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorSetup from "./pages/TwoFactorSetup";
import LoginCustomization from "./pages/LoginCustomization";
import LicenseActivation from "./pages/LicenseActivation";
import LicenseAdmin from "./pages/LicenseAdmin";
import LoginHistoryPage from "./pages/LoginHistoryPage";
import AuthAuditLogs from "./pages/AuthAuditLogs";
import SystemSetup from "./pages/SystemSetup";
import CompanyInfo from "./pages/CompanyInfo";
import BackupHistory from "./pages/BackupHistory";
import ConnectionManager from "./pages/ConnectionManager";
import MeasurementStandards from "./pages/MeasurementStandards";
import MeasurementStandardsDashboard from "./pages/MeasurementStandardsDashboard";
import QuickSpcPlan from "./pages/QuickSpcPlan";
import ValidationRulesManagement from "./pages/ValidationRulesManagement";
import LicenseNotificationReport from "./pages/LicenseNotificationReport";
import LicenseServerSettings from "./pages/LicenseServerSettings";
import RealtimeMachineConfig from "./pages/RealtimeMachineConfig";
import RealtimeHistory from "./pages/RealtimeHistory";
import AlarmThresholdConfig from "./pages/AlarmThresholdConfig";
import MachineAreaManagement from "./pages/MachineAreaManagement";
import ExportRealtimeData from "./pages/ExportRealtimeData";
import OrganizationManagement from "./pages/OrganizationManagement";
import ApprovalWorkflowManagement from "./pages/ApprovalWorkflowManagement";
import ModulePermissionManagement from "./pages/ModulePermissionManagement";
import PendingApprovals from "./pages/PendingApprovals";
import ApprovalReport from "./pages/ApprovalReport";
import SparePartsGuide from "./pages/SparePartsGuide";
import SparePartsCostReport from "./pages/SparePartsCostReport";
import StockMovements from "./pages/StockMovements";
import InventoryCheck from "./pages/InventoryCheck";
import StockReport from "./pages/StockReport";
import MMSDataInit from "./pages/MMSDataInit";
import AlertThresholdConfig from "./pages/AlertThresholdConfig";
import EquipmentQRLookup from "./pages/EquipmentQRLookup";
import MMSDashboard from "./pages/MMSDashboard";
import ScheduledReports from "./pages/ScheduledReports";
import ShiftReportHistory from "./pages/ShiftReportHistory";
import ScheduledJobsManagement from "./pages/ScheduledJobsManagement";
import WebSocketEventLog from "./pages/WebSocketEventLog";
import SseEventLog from "./pages/SseEventLog";
import NtfAlertConfig from "./pages/NtfAlertConfig";
import NotificationSettings from "./pages/NotificationSettings";
import NtfLineDetail from "./pages/NtfLineDetail";
import EnvironmentAlertConfig from "./pages/EnvironmentAlertConfig";
import OeeAlertThresholdSettings from "./pages/OeeAlertThresholdSettings";
import ScheduledReportManagement from "./pages/ScheduledReportManagement";
import AppSettings from "./pages/AppSettings";
import QuickAccessManagement from "./pages/QuickAccessManagement";
import ScheduledOeeReports from "./pages/ScheduledOeeReports";
import ABTestingManagement from "./pages/ai/ABTestingManagement";
import ModelVersioningPage from "./pages/ai/ModelVersioningPage";
import DataDriftMonitoring from "./pages/ai/DataDriftMonitoring";
import AiMlHealth from "./pages/ai/AiMlHealth";
import AiReports from "./pages/ai/AiReports";
import AiInsights from "./pages/ai/AiInsights";
import AiTrainingJobs from "./pages/ai/AiTrainingJobs";
import ModelTraining from "./pages/ai/ModelTraining";
import AiModelComparison from "./pages/ai/AiModelComparison";
import AiModelAccuracyDashboard from "./pages/AiModelAccuracyDashboard";
import AiConfig from "./pages/ai/AiConfig";
import AiThresholds from "./pages/ai/AiThresholds";
import PredictiveAlertConfig from "./pages/ai/PredictiveAlertConfig";
import PredictiveAlertDashboard from "./pages/ai/PredictiveAlertDashboard";
import ForecastAccuracyDashboard from "./pages/ai/ForecastAccuracyDashboard";
import AiDataSources from "./pages/ai/AiDataSources";
import AiAuditLogs from "./pages/ai/AiAuditLogs";
import AiAlerts from "./pages/ai/AiAlerts";
import AiPredictions from "./pages/ai/AiPredictions";
import AiPredictionThresholds from "./pages/ai/AiPredictionThresholds";
import AiPredictionHistory from "./pages/ai/AiPredictionHistory";
import ModelVersionComparison from "./pages/ModelVersionComparison";
import CpkForecastingPage from "./pages/ai/CpkForecastingPage";
import DefectDetectionPage from "./pages/ai/DefectDetectionPage";
import FirebasePushSettingsPage from "./pages/ai/FirebasePushSettingsPage";
import CpkComparisonPage from "./pages/ai/CpkComparisonPage";
import NotificationPreferences from "./pages/NotificationPreferences";
import KpiAlertThresholds from "./pages/KpiAlertThresholds";
import ScheduledKpiReports from "./pages/ScheduledKpiReports";
import KpiThresholdSettings from "./pages/KpiThresholdSettings";
import ScheduledKpiReportsPage from "./pages/ScheduledKpiReportsPage";
import AlertHistory from "./pages/AlertHistory";
import AlertNotificationConfig from "./pages/AlertNotificationConfig";
import TwilioSettings from "./pages/TwilioSettings";
import SmsConfigSettings from "./pages/SmsConfigSettings";
import PerformanceDropAlertConfig from "./pages/PerformanceDropAlertConfig";
import WebhookSettings from "./pages/WebhookSettings";
import WebhookHistoryManagement from "./pages/WebhookHistoryManagement";
import UserGuide from "./pages/UserGuide";
import VideoManagement from "./pages/VideoManagement";
import IotMonitoringRealtime from "./pages/iot/IotMonitoringRealtime";
import AiModelPerformance from "./pages/ai/AiModelPerformance";
import TelegramSettings from "./pages/TelegramSettings";
import WebhookTemplates from "./pages/WebhookTemplates";
import AlertWebhookSettings from "./pages/AlertWebhookSettings";
import IoTAlertEscalation from "./pages/IoTAlertEscalation";
import IoTFirmwareOTA from "./pages/IoTFirmwareOTA";
import IoTFloorPlanIntegration from "./pages/IoTFloorPlanIntegration";
import IoTScheduledOTA from "./pages/IoTScheduledOTA";
import IotOeeAlertConfig from "./pages/IotOeeAlertConfig";
import OeeThresholdsByLine from "./pages/OeeThresholdsByLine";
import OeeAlertIntegrations from "./pages/OeeAlertIntegrations";
import WebhookEscalationPage from "./pages/WebhookEscalationPage";
import LatencyMonitoringPage from "./pages/LatencyMonitoringPage";
import EscalationConfigPage from "./pages/EscalationConfigPage";
import SmsSettings from "./pages/SmsSettings";
import AutoResolveSettings from "./pages/AutoResolveSettings";
import EscalationWebhookSettings from "./pages/EscalationWebhookSettings";
import EscalationTemplates from "./pages/EscalationTemplates";
import EscalationReports from "./pages/EscalationReports";
import WidgetConfigScreen from "./pages/WidgetConfigScreen";
import WidgetPreview from "./pages/WidgetPreview";
import FCMTestPage from "./pages/FCMTestPage";
import ConflictResolutionScreen from "./pages/ConflictResolutionScreen";
import PushNotificationSettings from "./pages/PushNotificationSettings";
import WorkOrderNotificationConfig from "./pages/WorkOrderNotificationConfig";
import ScheduledMttrMtbfReports from "./pages/ScheduledMttrMtbfReports";
import MttrMtbfThresholds from "./pages/MttrMtbfThresholds";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";
import AlertConfigManagement from "./pages/AlertConfigManagement";
import ModelRetrainingDashboard from "./pages/ModelRetrainingDashboard";
import CpkAlertManagement from "./pages/CpkAlertManagement";
import ScheduledCpkJobs from "./pages/ScheduledCpkJobs";
import AlertEmailConfig from "./pages/AlertEmailConfig";
import UnifiedWebhooks from "./pages/UnifiedWebhooks";
import AdvancedHistory from "./pages/AdvancedHistory";
import MachineApiDocumentation from "./pages/MachineApiDocumentation";
import SpcScheduledReports from "./pages/SpcScheduledReports";
import ScheduledEmailReports from "./pages/ScheduledEmailReports";

// ============================================
// Lazy loaded pages from lazyRoutes
// ============================================
import {
  AdminMonitoring,
  AdvancedAnalytics,
  AdvancedAnalyticsDashboard,
  AiAnalyticsDashboard,
  AiCorrelationAnalysis,
  AiDashboard,
  AiDefectPrediction,
  AiMlDashboard,
  AiModelTraining,
  AiNaturalLanguage,
  AiOeeForecast,
  AiPredictive,
  AiRootCause,
  AiSpcAnalysis,
  AiTrendAnalysis,
  AiVisionAnalysis,
  AiVisionDashboard,
  AiVisionDefectDetection,
  AiYieldOptimization,
  AlertAnalytics,
  AlertConfiguration,
  AlertConfigurationEnhanced,
  AlertDashboard,
  Analyze,
  AnomalyDetection,
  AnomalyDetectionDashboard,
  AutoCapture,
  AviAoiDashboard,
  BackupRestore,
  CacheMonitoringDashboard,
  CameraCapture,
  CpkComparisonDashboard,
  CpkForecastPage,
  CpkHistoryComparison,
  CustomReportBuilder,
  Dashboard,
  DataMigrationTool,
  DataMigrationToolEnhanced,
  DatabaseConnectionWizard,
  DatabaseConnectionsSettings,
  DatabaseHealthDashboard,
  DatabaseSettings,
  DatabaseUnified,
  EdgeGatewayDashboard,
  EdgeSimulatorDashboard,
  EscalationDashboard,
  ExportHistory,
  ExportReports,
  FloorPlanDesignerPage,
  FloorPlanLive,
  Home,
  ImageComparison,
  IoT3DFloorPlan,
  IoTAnalytics,
  IoTDashboard,
  IoTDeviceManagement,
  IoTEnhancedDashboard,
  IoTFloorPlan,
  IoTGatewayConfig,
  IoTPredictiveMaintenance,
  IoTProtocolManagement,
  IoTUnifiedDashboard,
  IoTUserGuide,
  IoTWorkOrders,
  IotAlarmCrud,
  IotDeviceCrud,
  IotOverviewDashboard,
  IotRealtimeDashboard,
  IotWorkOrderManagement,
  KpiAlertStats,
  LandingPage,
  LicenseCustomers,
  LicenseDashboard,
  LicenseManagement,
  LicenseRevenue,
  LicenseServerDashboard,
  LineComparison,
  LocalLogin,
  MachineComparison,
  MachineDetail,
  MachineDetailLive,
  MachineIntegrationDashboard,
  MachineManagement,
  MachineOverviewDashboard,
  MachineStatusReport,
  MaintenanceDashboard,
  MaintenanceSchedule,
  Model3DManagement,
  MqttConnectionManagement,
  MttrMtbfComparison,
  MttrMtbfPrediction,
  MttrMtbfReport,
  MultiAnalysis,
  NotFound,
  NotificationCenter,
  NtfCeoDashboard,
  NtfComparison,
  NtfDashboard,
  NtfDepartmentDashboard,
  NtfEnvironmentCorrelation,
  NtfProductAnalysis,
  NtfShiftAnalysis,
  NtfSupplierAnalysis,
  OEEAnalysisDashboard,
  OEEComparisonDashboard,
  OEEDashboard,
  OeeWidget,
  OeeWidgetConfig,
  OpcuaConnectionManagement,
  PerformanceTrendsDashboard,
  PlantKPIDashboard,
  PlantKPIDashboardEnhanced,
  PredictiveMaintenance,
  FactoryManagement,
  ProcessManagement,
  ProductionLineComparison,
  ProductionLineManagement,
  WorkshopManagement,
  ProductionLinesDashboard,
  QualityTrendReport,
  RateLimitDashboard,
  RealtimeLineDashboard,
  ReportsExport,
  ReportsExportEnhanced,
  SchemaComparison,
  SecurityDashboard,
  SensorDashboard,
  ShiftCpkComparison,
  ShiftManagerDashboard,
  SparePartsManagement,
  SpcReport,
  SpcSummaryReport,
  SupervisorDashboard,
  SyncDashboard,
  SystemHealthDashboard,
  TimeseriesDashboard,
  UnifiedAlertKpiDashboard,
  UnifiedDashboard,
  UnifiedRealtimeDashboard,
  WeeklyKpiTrend,
  WorkstationManagement
} from "./routes/lazyRoutes";

// Preload utilities
import { preloadCriticalRoutes, preloadRelatedRoutes } from "./routes/preloadRoutes";
import { useEffect } from "react";
import { useLocation } from "wouter";


// Route preloading hook
function useRoutePreloading() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Preload critical routes sau khi app mount
    preloadCriticalRoutes();
  }, []);
  
  useEffect(() => {
    // Preload related routes khi user navigate
    preloadRelatedRoutes(location);
  }, [location]);
}

function Router() {
  useRoutePreloading();
  
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={Home} />
      <Route path="/setup" component={SystemSetup} />
      <Route path="/database-unified" component={DatabaseUnified} />
      <Route path="/database-settings" component={DatabaseSettings} />
      <Route path="/database-health" component={DatabaseHealthDashboard} />
      <Route path="/database-connections" component={DatabaseConnectionsSettings} />
      <Route path="/database-wizard" component={DatabaseConnectionWizard} />
      <Route path="/data-migration" component={DataMigrationTool} />
      <Route path="/data-migration-enhanced" component={DataMigrationToolEnhanced} />
      <Route path="/schema-comparison" component={SchemaComparison} />
      <Route path="/database-setting" component={DatabaseSettings} />
      <Route path="/connection-manager" component={ConnectionManager} />
      <Route path="/company-info" component={CompanyInfo} />
      <Route path="/local-login" component={LocalLogin} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/2fa-setup" component={TwoFactorSetup} />
      <Route path="/login-customization" component={LoginCustomization} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/anomaly-detection" component={AnomalyDetection} />
      <Route path="/production-lines" component={ProductionLinesDashboard} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/history" component={History} />
      <Route path="/mappings" component={Mappings} />
      <Route path="/settings" component={Settings} />
      <Route path="/app-settings" component={AppSettings} />
      <Route path="/quick-access" component={QuickAccessManagement} />
      <Route path="/users" component={UserManagement} />
      <Route path="/local-users" component={LocalUserManagement} />
      <Route path="/products" component={ProductManagement} />
      <Route path="/specifications" component={SpecificationManagement} />
      <Route path="/production-line-management" component={ProductionLineManagement} />
      <Route path="/factories" component={FactoryManagement} />
      <Route path="/workshops" component={WorkshopManagement} />
      <Route path="/sampling-methods" component={SamplingMethodManagement} />
      <Route path="/spc-plans" component={SpcPlanManagement} />
      <Route path="/quick-spc-plan" component={QuickSpcPlan} />
      <Route path="/validation-rules" component={ValidationRulesManagement} />
      <Route path="/cpk-comparison" component={CpkComparisonDashboard} />
      <Route path="/shift-cpk-comparison" component={ShiftCpkComparison} />
      <Route path="/cpk-forecast" component={CpkForecastPage} />
      <Route path="/shift-manager" component={ShiftManagerDashboard} />
      <Route path="/kpi-alert-thresholds" component={KpiAlertThresholds} />
      <Route path="/weekly-kpi-trend" component={WeeklyKpiTrend} />
      <Route path="/scheduled-kpi-reports" component={ScheduledKpiReports} />
      <Route path="/kpi-threshold-settings" component={KpiThresholdSettings} />
      <Route path="/scheduled-kpi-reports-management" component={ScheduledKpiReportsPage} />
      <Route path="/kpi-alert-stats" component={KpiAlertStats} />
      <Route path="/alert-history" component={AlertHistory} />
      <Route path="/alert-dashboard" component={AlertDashboard} />
      <Route path="/alert-notification-config" component={AlertNotificationConfig} />
      <Route path="/spc-summary-report" component={SpcSummaryReport} />
      <Route path="/realtime-line" component={RealtimeLineDashboard} />
      <Route path="/realtime-machine-config" component={RealtimeMachineConfig} />
      <Route path="/realtime-history" component={RealtimeHistory} />
      <Route path="/alarm-threshold-config" component={AlarmThresholdConfig} />
      <Route path="/machine-overview" component={MachineOverviewDashboard} />
      <Route path="/machine-detail/:id" component={MachineDetailLive} />
      <Route path="/machine-areas" component={MachineAreaManagement} />
      <Route path="/machine-status-report" component={MachineStatusReport} />
      <Route path="/oee-dashboard" component={OEEDashboard} />
      <Route path="/oee-comparison" component={OEEComparisonDashboard} />
      <Route path="/oee-analysis" component={OEEAnalysisDashboard} />
      <Route path="/unified-dashboard" component={UnifiedDashboard} />
      <Route path="/maintenance-dashboard" component={MaintenanceDashboard} />
      <Route path="/machine/:id" component={MachineDetail} />
      <Route path="/export-realtime" component={ExportRealtimeData} />
      <Route path="/spare-parts" component={SparePartsManagement} />
      <Route path="/organization" component={OrganizationManagement} />
      <Route path="/approval-workflow" component={ApprovalWorkflowManagement} />
      <Route path="/module-permissions" component={ModulePermissionManagement} />
      <Route path="/pending-approvals" component={PendingApprovals} />
      <Route path="/approval-report" component={ApprovalReport} />
      <Route path="/spare-parts-guide" component={SparePartsGuide} />
      <Route path="/spare-parts-cost-report" component={SparePartsCostReport} />
      <Route path="/stock-movements" component={StockMovements} />
      <Route path="/inventory-check" component={InventoryCheck} />
      <Route path="/stock-report" component={StockReport} />
      <Route path="/predictive-maintenance" component={PredictiveMaintenance} />
      <Route path="/maintenance-schedule" component={MaintenanceSchedule} />
      <Route path="/equipment-qr" component={EquipmentQRLookup} />
      <Route path="/plant-kpi" component={PlantKPIDashboard} />
      <Route path="/plant-kpi-enhanced" component={PlantKPIDashboardEnhanced} />
      <Route path="/mms-dashboard" component={MMSDashboard} />
      <Route path="/iot-gateway" component={IoTGatewayConfig} />
      <Route path="/reports-export" component={ReportsExport} />
      <Route path="/reports-export-enhanced" component={ReportsExportEnhanced} />
      <Route path="/alert-config" component={AlertConfiguration} />
      <Route path="/alert-config-enhanced" component={AlertConfigurationEnhanced} />
      <Route path="/oee-alert-thresholds" component={OeeAlertThresholdSettings} />
      <Route path="/scheduled-reports" component={ScheduledReportManagement} />
      <Route path="/machine-integration" component={MachineIntegrationDashboard} />
      <Route path="/embed/oee" component={OeeWidget} />
      <Route path="/embed/oee/:machineId" component={OeeWidget} />
      <Route path="/oee-widget-config" component={OeeWidgetConfig} />
      <Route path="/ntf-config" component={NtfAlertConfig} />
      <Route path="/ntf-comparison" component={NtfComparison} />
      <Route path="/ntf-dashboard" component={NtfDashboard} />
      <Route path="/notification-settings" component={NotificationSettings} />
      <Route path="/ntf-line/:id" component={NtfLineDetail} />
      <Route path="/ntf-shift-analysis" component={NtfShiftAnalysis} />
      <Route path="/ntf-product-analysis" component={NtfProductAnalysis} />
              <Route path="/ntf-department" component={NtfDepartmentDashboard} />
      <Route path="/ntf-supplier-analysis" component={NtfSupplierAnalysis} />
      <Route path="/ntf-environment" component={NtfEnvironmentCorrelation} />
      <Route path="/environment-alerts" component={EnvironmentAlertConfig} />
      <Route path="/ceo-dashboard" component={NtfCeoDashboard} />
      <Route path="/scheduled-reports" component={ScheduledReports} />
      <Route path="/supervisor-dashboard" component={SupervisorDashboard} />
      <Route path="/shift-reports" component={ShiftReportHistory} />
      <Route path="/machine-comparison" component={MachineComparison} />
      <Route path="/notification-center" component={NotificationCenter} />
      <Route path="/scheduled-jobs" component={ScheduledJobsManagement} />
      <Route path="/advanced-analytics" component={AdvancedAnalytics} />
      <Route path="/export-reports" component={ExportReports} />
              <Route path="/websocket-event-log" component={WebSocketEventLog} />
      <Route path="/sse-event-log" component={SseEventLog} />
      <Route path="/mms-data-init" component={MMSDataInit} />
      <Route path="/alert-threshold-config" component={AlertThresholdConfig} />
      <Route path="/email-notifications" component={EmailNotificationSettings} />

      <Route path="/smtp-settings" component={SmtpSettings} />
      <Route path="/seed-data" component={SeedDataPage} />
      <Route path="/defects" component={DefectManagement} />
      <Route path="/defect-statistics" component={DefectStatistics} />
      <Route path="/workstations" component={WorkstationManagement} />
      <Route path="/machines" component={MachineManagement} />
      <Route path="/processes" component={ProcessManagement} />
      <Route path="/audit-logs" component={AuditLogs} />
      <Route path="/spc-report" component={SpcReport} />
      <Route path="/machine-types" component={MachineTypeManagement} />
      <Route path="/fixtures" component={FixtureManagement} />
      <Route path="/jigs" component={JigManagement} />
      <Route path="/multi-analysis" component={MultiAnalysis} />
      <Route path="/line-comparison" component={ProductionLineComparison} />
      <Route path="/about" component={About} />
          <Route path="/api-docs" component={ApiDocumentation} />
      <Route path="/profile" component={Profile} />
      <Route path="/rules" component={RulesManagement} />
      <Route path="/webhooks" component={WebhookManagement} />
      <Route path="/webhook-history" component={WebhookHistoryManagement} />
      <Route path="/report-templates" component={ReportTemplateManagement} />
      <Route path="/export-history" component={ExportHistory} />
      <Route path="/license-activation" component={LicenseActivation} />
      <Route path="/license-admin" component={LicenseAdmin} />
      <Route path="/license-management" component={LicenseManagement} />
      <Route path="/license-notification-report" component={LicenseNotificationReport} />
      <Route path="/license-dashboard" component={LicenseDashboard} />
      <Route path="/license-customers" component={LicenseCustomers} />
      <Route path="/license-revenue" component={LicenseRevenue} />
      <Route path="/license-server-settings" component={LicenseServerSettings} />
      <Route path="/license-server-dashboard" component={LicenseServerDashboard} />
      <Route path="/login-history" component={LoginHistoryPage} />
      <Route path="/auth-audit-logs" component={AuthAuditLogs} />
      <Route path="/backup-history" component={BackupHistory} />
      <Route path="/backup-restore" component={BackupRestore} />
      <Route path="/measurement-standards" component={MeasurementStandards} />
      <Route path="/measurement-standards-dashboard" component={MeasurementStandardsDashboard} />
      <Route path="/spc-visualization" component={SpcPlanVisualization} />
      <Route path="/spc-visualization/:type/:id" component={SpcVisualizationDetail} />
      <Route path="/custom-report-builder" component={CustomReportBuilder} />
      <Route path="/rate-limit-dashboard" component={RateLimitDashboard} />
      <Route path="/admin-monitoring" component={AdminMonitoring} />
      <Route path="/performance-trends" component={PerformanceTrendsDashboard} />
      <Route path="/system-health" component={SystemHealthDashboard} />
      <Route path="/security-dashboard" component={SecurityDashboard} />
      <Route path="/cache-monitoring" component={CacheMonitoringDashboard} />
      <Route path="/iot-dashboard" component={IoTDashboard} />
      <Route path="/iot-overview-dashboard" component={IotOverviewDashboard} />
      <Route path="/scheduled-oee-reports" component={ScheduledOeeReports} />
      <Route path="/iot-realtime-dashboard" component={IotRealtimeDashboard} />
      <Route path="/mqtt-connections" component={MqttConnectionManagement} />
      <Route path="/opcua-connections" component={OpcuaConnectionManagement} />
      <Route path="/sensor-dashboard" component={SensorDashboard} />
      <Route path="/twilio-settings" component={TwilioSettings} />
      <Route path="/sms-config" component={SmsConfigSettings} />
      <Route path="/performance-drop-alert" component={PerformanceDropAlertConfig} />
      <Route path="/webhook-settings" component={WebhookSettings} />
      <Route path="/alert-analytics" component={AlertAnalytics} />
      <Route path="/unified-alert-kpi" component={UnifiedAlertKpiDashboard} />
      <Route path="/ai-ml-dashboard" component={AiMlDashboard} />
      <Route path="/ai-dashboard" component={AiDashboard} />
      <Route path="/ai-spc-analysis" component={AiSpcAnalysis} />
      <Route path="/ai-root-cause" component={AiRootCause} />
      <Route path="/ai-natural-language" component={AiNaturalLanguage} />
      <Route path="/ai-predictive" component={AiPredictive} />
      <Route path="/ai-model-training" component={AiModelTraining} />
      <Route path="/ai-analytics-dashboard" component={AiAnalyticsDashboard} />
      <Route path="/ai-ab-testing" component={ABTestingManagement} />
      <Route path="/ai-model-versioning" component={ModelVersioningPage} />
      <Route path="/ai-data-drift" component={DataDriftMonitoring} />
      <Route path="/ai-ml-health" component={AiMlHealth} />
      <Route path="/ai-correlation" component={AiCorrelationAnalysis} />
      <Route path="/ai-trend-analysis" component={AiTrendAnalysis} />
      <Route path="/ai-oee-forecast" component={AiOeeForecast} />
      <Route path="/ai-defect-prediction" component={AiDefectPrediction} />
      <Route path="/ai-vision-detection" component={AiVisionDefectDetection} />
      <Route path="/ai-yield-optimization" component={AiYieldOptimization} />
      <Route path="/ai-reports" component={AiReports} />
      <Route path="/ai-insights" component={AiInsights} />
      <Route path="/ai-training-jobs" component={AiTrainingJobs} />
      <Route path="/model-training" component={ModelTraining} />
      <Route path="/ai-model-comparison" component={AiModelComparison} />
      <Route path="/ai-model-accuracy" component={AiModelAccuracyDashboard} />
      <Route path="/ai-config" component={AiConfig} />
      <Route path="/ai-thresholds" component={AiThresholds} />
      <Route path="/ai-predictive-alerts" component={PredictiveAlertConfig} />
      <Route path="/ai-predictive-alert-dashboard" component={PredictiveAlertDashboard} />
      <Route path="/ai-forecast-accuracy" component={ForecastAccuracyDashboard} />
      <Route path="/ai-data-sources" component={AiDataSources} />
      <Route path="/ai-audit-logs" component={AiAuditLogs} />
      <Route path="/ai-alerts" component={AiAlerts} />
      <Route path="/ai-predictions" component={AiPredictions} />
      <Route path="/ai-prediction-thresholds" component={AiPredictionThresholds} />
      <Route path="/ai-prediction-history" component={AiPredictionHistory} />
      <Route path="/model-version-comparison" component={ModelVersionComparison} />
      <Route path="/cpk-forecasting" component={CpkForecastingPage} />
      <Route path="/defect-detection" component={DefectDetectionPage} />
      <Route path="/firebase-push-settings" component={FirebasePushSettingsPage} />
      <Route path="/cpk-comparison" component={CpkComparisonPage} />
      <Route path="/advanced-analytics-dashboard" component={AdvancedAnalyticsDashboard} />
      <Route path="/notification-preferences" component={NotificationPreferences} />
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/video-management" component={VideoManagement} />
      <Route path="/iot-monitoring-realtime" component={IotMonitoringRealtime} />
      <Route path="/telegram-settings" component={TelegramSettings} />
      <Route path="/webhook-templates" component={WebhookTemplates} />
      <Route path="/iot-floor-plan" component={IoTFloorPlan} />
      <Route path="/floor-plan-designer" component={FloorPlanDesignerPage} />
      <Route path="/alert-webhook-settings" component={AlertWebhookSettings} />
      <Route path="/iot-unified-dashboard" component={IoTUnifiedDashboard} />
      <Route path="/iot-enhanced-dashboard" component={IoTEnhancedDashboard} />
      <Route path="/iot-device-management" component={IoTDeviceManagement} />
      <Route path="/iot-protocol-management" component={IoTProtocolManagement} />
      <Route path="/iot-alert-escalation" component={IoTAlertEscalation} />
      <Route path="/iot-analytics" component={IoTAnalytics} />
      <Route path="/iot-firmware-ota" component={IoTFirmwareOTA} />
      <Route path="/iot-floor-plan-integration" component={IoTFloorPlanIntegration} />
      <Route path="/iot-predictive-maintenance" component={IoTPredictiveMaintenance} />
      <Route path="/iot-scheduled-ota" component={IoTScheduledOTA} />
      <Route path="/iot-3d-floor-plan" component={IoT3DFloorPlan} />
      <Route path="/iot-work-orders" component={IoTWorkOrders} />
      <Route path="/iot-work-order-management" component={IotWorkOrderManagement} />
      <Route path="/iot-oee-alert-config" component={IotOeeAlertConfig} />
      <Route path="/oee-thresholds-by-line" component={OeeThresholdsByLine} />
      <Route path="/oee-alert-integrations" component={OeeAlertIntegrations} />
      <Route path="/webhook-escalation" component={WebhookEscalationPage} />
      <Route path="/escalation-config" component={EscalationConfigPage} />
      <Route path="/sms-settings" component={SmsSettings} />
      <Route path="/escalation-dashboard" component={EscalationDashboard} />
      <Route path="/auto-resolve-settings" component={AutoResolveSettings} />
      <Route path="/escalation-webhook-settings" component={EscalationWebhookSettings} />
      <Route path="/escalation-templates" component={EscalationTemplates} />
      <Route path="/escalation-reports" component={EscalationReports} />
      <Route path="/latency-monitoring" component={LatencyMonitoringPage} />
      <Route path="/widget-config" component={WidgetConfigScreen} />
      <Route path="/sync-dashboard" component={SyncDashboard} />
      <Route path="/widget-preview" component={WidgetPreview} />
      <Route path="/fcm-test" component={FCMTestPage} />
      <Route path="/conflict-resolution" component={ConflictResolutionScreen} />
      <Route path="/push-notification-settings" component={PushNotificationSettings} />
      <Route path="/ai-model-performance" component={AiModelPerformance} />
      {/* Phase 98: IoT Enhancement */}
      <Route path="/model-3d-management" component={Model3DManagement} />
      {/* Phase 101: IoT Frontend Management */}
      <Route path="/iot-device-crud" component={IotDeviceCrud} />
      <Route path="/iot-alarm-crud" component={IotAlarmCrud} />
      <Route path="/notification-preferences" component={NotificationPreferencesPage} />
      <Route path="/iot-user-guide" component={IoTUserGuide} />
      <Route path="/work-order-notification-config" component={WorkOrderNotificationConfig} />
      <Route path="/mttr-mtbf-report" component={MttrMtbfReport} />
      <Route path="/scheduled-mttr-mtbf-reports" component={ScheduledMttrMtbfReports} />
      <Route path="/mttr-mtbf-comparison" component={MttrMtbfComparison} />
      <Route path="/mttr-mtbf-thresholds" component={MttrMtbfThresholds} />
      <Route path="/mttr-mtbf-prediction" component={MttrMtbfPrediction} />
      {/* Phase 14 - Edge Gateway, TimescaleDB, Anomaly Detection */}
      <Route path="/edge-gateway" component={EdgeGatewayDashboard} />
      <Route path="/timeseries-dashboard" component={TimeseriesDashboard} />
      <Route path="/anomaly-detection-ai" component={AnomalyDetectionDashboard} />
      <Route path="/alert-config-management" component={AlertConfigManagement} />
      <Route path="/edge-simulator" component={EdgeSimulatorDashboard} />
      <Route path="/model-retraining" component={ModelRetrainingDashboard} />
      {/* Phase 22 - CPK Alert Management */}
      <Route path="/cpk-alert-management" component={CpkAlertManagement} />
      <Route path="/scheduled-cpk-jobs" component={ScheduledCpkJobs} />
      {/* Phase 10 - Image Comparison & Camera Capture */}
      <Route path="/image-comparison" component={ImageComparison} />
      <Route path="/camera-capture" component={CameraCapture} />
      <Route path="/alert-email-config" component={AlertEmailConfig} />
      <Route path="/auto-capture" component={AutoCapture} />
      <Route path="/unified-webhooks" component={UnifiedWebhooks} />
      <Route path="/quality-trend-report" component={QualityTrendReport} />
      {/* Phase 11 - AVI/AOI Dashboard & Advanced Features */}
      <Route path="/avi-aoi-dashboard" component={AviAoiDashboard} />
      <Route path="/advanced-history" component={AdvancedHistory} />
      <Route path="/floor-plan-live" component={FloorPlanLive} />
      <Route path="/machine-api-documentation" component={MachineApiDocumentation} />
      <Route path="/ai-vision-analysis" component={AiVisionAnalysis} />
      <Route path="/unified-realtime-dashboard" component={UnifiedRealtimeDashboard} />
      {/* Phase 10 - AI Vision Dashboard, Line Comparison, SPC Scheduled Reports */}
      <Route path="/ai-vision-dashboard" component={AiVisionDashboard} />
      <Route path="/line-comparison" component={LineComparison} />
      <Route path="/spc-scheduled-reports" component={SpcScheduledReports} />
      {/* Phase 12 - CPK History Comparison, Webhook Notifications */}
      <Route path="/cpk-history-comparison" component={CpkHistoryComparison} />
      <Route path="/scheduled-email-reports" component={ScheduledEmailReports} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Import OfflineIndicator
import { OfflineIndicator } from "./components/OfflineIndicator";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <GlobalKeyboardShortcuts>
            <SseNotificationProvider>
              <OfflineIndicator />
              <Toaster />
              <Router />
            </SseNotificationProvider>
          </GlobalKeyboardShortcuts>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
