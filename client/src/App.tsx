import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SseNotificationProvider from "./components/SseNotificationProvider";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { lazy, Suspense } from "react";

// Loading fallback component
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

// ==========================================
// CORE PAGES - Minimal direct imports
// ==========================================
import LocalLogin from "./pages/LocalLogin";
import NotFound from "./pages/NotFound";

// ==========================================
// LAZY-LOADED CORE PAGES - Code splitting
// ==========================================
const Home = lazy(() => import("./pages/Home"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));

// ==========================================
// LAZY-LOADED PAGES - Code splitting by module
// ==========================================

// Core Analysis
const History = lazy(() => import("./pages/History"));
const Mappings = lazy(() => import("./pages/Mappings"));
const Settings = lazy(() => import("./pages/Settings"));
const Analyze = lazy(() => import("./pages/Analyze"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const QuickAccessManagement = lazy(() => import("./pages/QuickAccessManagement"));

// User & Auth Management
const UserManagement = lazy(() => import("./pages/UserManagement"));
const LocalUserManagement = lazy(() => import("./pages/LocalUserManagement"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TwoFactorSetup = lazy(() => import("./pages/TwoFactorSetup"));
const LoginCustomization = lazy(() => import("./pages/LoginCustomization"));
const LoginHistoryPage = lazy(() => import("./pages/LoginHistoryPage"));
const AuthAuditLogs = lazy(() => import("./pages/AuthAuditLogs"));

// Product & Specification Management
const ProductManagement = lazy(() => import("./pages/ProductManagement"));
const SpecificationManagement = lazy(() => import("./pages/SpecificationManagement"));
const SamplingMethodManagement = lazy(() => import("./pages/SamplingMethodManagement"));
const SpcPlanManagement = lazy(() => import("./pages/SpcPlanManagement"));
const QuickSpcPlan = lazy(() => import("./pages/QuickSpcPlan"));
const ValidationRulesManagement = lazy(() => import("./pages/ValidationRulesManagement"));
const MeasurementStandards = lazy(() => import("./pages/MeasurementStandards"));
const MeasurementStandardsDashboard = lazy(() => import("./pages/MeasurementStandardsDashboard"));

// Production & Factory Management
const ProductionLineManagement = lazy(() => import("./pages/ProductionLineManagement"));
const FactoryManagement = lazy(() => import("./pages/FactoryManagement"));
const FloorPlanHeatmapPage = lazy(() => import("./pages/FloorPlanHeatmapPage"));
const IoTFloorPlanPage = lazy(() => import("./pages/IoTFloorPlanPage"));
const IoT3DFloorPlanPage = lazy(() => import("./pages/IoT3DFloorPlanPage"));
const FloorPlanLivePage = lazy(() => import("./pages/FloorPlanLivePage"));
const WorkshopManagement = lazy(() => import("./pages/WorkshopManagement"));
const WorkstationManagement = lazy(() => import("./pages/WorkstationManagement"));
const MachineManagement = lazy(() => import("./pages/MachineManagement"));
const ProcessManagement = lazy(() => import("./pages/ProcessManagement"));
const MachineTypeManagement = lazy(() => import("./pages/MachineTypeManagement"));
const MachineAreaManagement = lazy(() => import("./pages/MachineAreaManagement"));
const MachineDetail = lazy(() => import("./pages/MachineDetail"));

// Defect & Quality Management
const DefectManagement = lazy(() => import("./pages/DefectManagement"));
const DefectStatistics = lazy(() => import("./pages/DefectStatistics"));
const FixtureManagement = lazy(() => import("./pages/FixtureManagement"));
const JigManagement = lazy(() => import("./pages/JigManagement"));

// Alert & Notification
const AlertConfiguration = lazy(() => import("./pages/AlertConfiguration"));
const AlertDashboard = lazy(() => import("./pages/AlertDashboard"));
const AlertHistory = lazy(() => import("./pages/AlertHistory"));
const AlertNotificationConfig = lazy(() => import("./pages/AlertNotificationConfig"));
const AlertThresholdConfig = lazy(() => import("./pages/AlertThresholdConfig"));
const AlarmThresholdConfig = lazy(() => import("./pages/AlarmThresholdConfig"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const AlertUnified = lazy(() => import("./pages/AlertUnified"));
const NotificationUnified = lazy(() => import("./pages/NotificationUnified"));
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const EnvironmentAlertConfig = lazy(() => import("./pages/EnvironmentAlertConfig"));
const PerformanceDropAlertConfig = lazy(() => import("./pages/PerformanceDropAlertConfig"));
const PushNotificationSettings = lazy(() => import("./pages/PushNotificationSettings"));
const WorkOrderNotificationConfig = lazy(() => import("./pages/WorkOrderNotificationConfig"));

// Email & SMS Settings
const EmailNotificationSettings = lazy(() => import("./pages/EmailNotificationSettings"));
const SmtpSettings = lazy(() => import("./pages/SmtpSettings"));
const TwilioSettings = lazy(() => import("./pages/TwilioSettings"));
const SmsConfigSettings = lazy(() => import("./pages/SmsConfigSettings"));
const SmsSettings = lazy(() => import("./pages/SmsSettings"));
const TelegramSettings = lazy(() => import("./pages/TelegramSettings"));

// Webhook & Integration
const WebhookManagement = lazy(() => import("./pages/WebhookManagement"));
const WebhookSettings = lazy(() => import("./pages/WebhookSettings"));
const WebhookUnified = lazy(() => import("./pages/WebhookUnified"));

// Reports & Export - Master Dashboards
const ReportsMasterDashboard = lazy(() => import("./pages/ReportsMasterDashboard"));
const ScheduledMasterDashboard = lazy(() => import("./pages/ScheduledMasterDashboard"));
const ReportTemplateManagement = lazy(() => import("./pages/ReportTemplateManagement"));
const ReportsExport = lazy(() => import("./pages/ReportsExport"));
const ScheduledReports = lazy(() => import("./pages/ScheduledReports"));
const ScheduledReportManagement = lazy(() => import("./pages/ScheduledReportManagement"));
const ShiftReportHistory = lazy(() => import("./pages/ShiftReportHistory"));
const ScheduledJobsManagement = lazy(() => import("./pages/ScheduledJobsManagement"));
const ScheduledKpiReports = lazy(() => import("./pages/ScheduledKpiReports"));

// SPC & CPK
const SpcReport = lazy(() => import("./pages/SpcReport"));
const SpcPlanVisualization = lazy(() => import("./pages/SpcPlanVisualization"));
const SpcVisualizationDetail = lazy(() => import("./pages/SpcVisualizationDetail"));
const CpkComparisonDashboard = lazy(() => import("./pages/CpkComparisonDashboard"));

// OEE - Master Dashboard
const OeeMasterDashboard = lazy(() => import("./pages/OeeMasterDashboard"));
const OEEDashboard = lazy(() => import("./pages/OEEDashboard"));
const OeeAlertThresholdSettings = lazy(() => import("./pages/OeeAlertThresholdSettings"));
const OeeThresholdsByLine = lazy(() => import("./pages/OeeThresholdsByLine"));
const OeeAlertIntegrations = lazy(() => import("./pages/OeeAlertIntegrations"));
const IotOeeAlertConfig = lazy(() => import("./pages/IotOeeAlertConfig"));
const OeePeriodReport = lazy(() => import("./pages/OeePeriodReport"));

// KPI
const KpiAlertThresholds = lazy(() => import("./pages/KpiAlertThresholds"));
const KpiThresholdSettings = lazy(() => import("./pages/KpiThresholdSettings"));
const PlantKPIDashboard = lazy(() => import("./pages/PlantKPIDashboard"));

// NTF
const NtfAlertConfig = lazy(() => import("./pages/NtfAlertConfig"));
const NtfComparison = lazy(() => import("./pages/NtfComparison"));
const NtfDashboard = lazy(() => import("./pages/NtfDashboard"));
const NtfLineDetail = lazy(() => import("./pages/NtfLineDetail"));

// Maintenance & Spare Parts - Master Dashboard
const MaintenanceMasterDashboard = lazy(() => import("./pages/MaintenanceMasterDashboard"));
const MaintenanceDashboard = lazy(() => import("./pages/MaintenanceDashboard"));
const MaintenanceSchedule = lazy(() => import("./pages/MaintenanceSchedule"));
const PredictiveMaintenance = lazy(() => import("./pages/PredictiveMaintenance"));
const SparePartsManagement = lazy(() => import("./pages/SparePartsManagement"));
const SparePartsGuide = lazy(() => import("./pages/SparePartsGuide"));
const SparePartsCostReport = lazy(() => import("./pages/SparePartsCostReport"));
const StockMovements = lazy(() => import("./pages/StockMovements"));
const InventoryCheck = lazy(() => import("./pages/InventoryCheck"));
const StockReport = lazy(() => import("./pages/StockReport"));
const EquipmentQRLookup = lazy(() => import("./pages/EquipmentQRLookup"));
const MttrMtbfReport = lazy(() => import("./pages/MttrMtbfReport"));

// License
const LicenseActivation = lazy(() => import("./pages/LicenseActivation"));
const LicenseAdmin = lazy(() => import("./pages/LicenseAdmin"));
const LicenseManagement = lazy(() => import("./pages/LicenseManagement"));
const LicenseDashboard = lazy(() => import("./pages/LicenseDashboard"));
const LicenseNotificationReport = lazy(() => import("./pages/LicenseNotificationReport"));
const LicenseServerSettings = lazy(() => import("./pages/LicenseServerSettings"));
const LicenseUnified = lazy(() => import("./pages/LicenseUnified"));

// Database & System
const DatabaseSettings = lazy(() => import("./pages/DatabaseSettings"));
const DatabaseUnified = lazy(() => import("./pages/DatabaseUnified"));
const DataMigrationTool = lazy(() => import("./pages/DataMigrationTool"));
const ConnectionManager = lazy(() => import("./pages/ConnectionManager"));
const BackupHistory = lazy(() => import("./pages/BackupHistory"));
const BackupRestore = lazy(() => import("./pages/BackupRestore"));
const SystemSetup = lazy(() => import("./pages/SystemSetup"));
const CompanyInfo = lazy(() => import("./pages/CompanyInfo"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const SeedDataPage = lazy(() => import("./pages/SeedDataPage"));
const AdminMonitoring = lazy(() => import("./pages/AdminMonitoring"));

// Organization & Approval
const OrganizationManagement = lazy(() => import("./pages/OrganizationManagement"));
const ApprovalWorkflowManagement = lazy(() => import("./pages/ApprovalWorkflowManagement"));
const ModulePermissionManagement = lazy(() => import("./pages/ModulePermissionManagement"));
const PendingApprovals = lazy(() => import("./pages/PendingApprovals"));
const ApprovalReport = lazy(() => import("./pages/ApprovalReport"));
const RulesManagement = lazy(() => import("./pages/RulesManagement"));

// IoT - Master Dashboard
const IoTMasterDashboard = lazy(() => import("./pages/IoTMasterDashboard"));
const IoTDashboard = lazy(() => import("./pages/IoTDashboard"));
const IoTDeviceManagement = lazy(() => import("./pages/IoTDeviceManagement"));
const IoTProtocolManagement = lazy(() => import("./pages/IoTProtocolManagement"));
const IoTAnalytics = lazy(() => import("./pages/IoTAnalytics"));
const IoTGatewayConfig = lazy(() => import("./pages/IoTGatewayConfig"));
const IoTPredictiveMaintenance = lazy(() => import("./pages/IoTPredictiveMaintenance"));
const IoTWorkOrders = lazy(() => import("./pages/IoTWorkOrders"));
const IoTAlertEscalation = lazy(() => import("./pages/IoTAlertEscalation"));
const IoTFirmwareOTA = lazy(() => import("./pages/IoTFirmwareOTA"));
const IoTScheduledOTA = lazy(() => import("./pages/IoTScheduledOTA"));
const IotMonitoringRealtime = lazy(() => import("./pages/iot/IotMonitoringRealtime"));
const MqttConnectionManagement = lazy(() => import("./pages/MqttConnectionManagement"));
const OpcuaConnectionManagement = lazy(() => import("./pages/OpcuaConnectionManagement"));

// AI/ML - Master Dashboard
const AiMasterDashboard = lazy(() => import("./pages/AiMasterDashboard"));
const AiDashboard = lazy(() => import("./pages/AiDashboard"));
const AiRootCause = lazy(() => import("./pages/AiRootCause"));
const AiPredictive = lazy(() => import("./pages/AiPredictive"));
const AiModelTraining = lazy(() => import("./pages/AiModelTraining"));
const AiNaturalLanguage = lazy(() => import("./pages/AiNaturalLanguage"));
const AiSpcAnalysis = lazy(() => import("./pages/AiSpcAnalysis"));
const AiVisionAnalysis = lazy(() => import("./pages/AiVisionAnalysis"));

// AI subfolder
const AiMlDashboard = lazy(() => import("./pages/ai/AiMlDashboard"));
const AiAnalyticsDashboard = lazy(() => import("./pages/ai/AiAnalyticsDashboard"));
const ABTestingManagement = lazy(() => import("./pages/ai/ABTestingManagement"));
const ModelVersioningPage = lazy(() => import("./pages/ai/ModelVersioningPage"));
const DataDriftMonitoring = lazy(() => import("./pages/ai/DataDriftMonitoring"));
const AiMlHealth = lazy(() => import("./pages/ai/AiMlHealth"));
const AiCorrelationAnalysis = lazy(() => import("./pages/ai/AiCorrelationAnalysis"));
const AiTrendAnalysis = lazy(() => import("./pages/ai/AiTrendAnalysis"));
const AiOeeForecast = lazy(() => import("./pages/ai/AiOeeForecast"));
const AiDefectPrediction = lazy(() => import("./pages/ai/AiDefectPrediction"));
const AiVisionDefectDetection = lazy(() => import("./pages/ai/AiVisionDefectDetection"));
const AiYieldOptimization = lazy(() => import("./pages/ai/AiYieldOptimization"));
const AiReports = lazy(() => import("./pages/ai/AiReports"));
const AiInsights = lazy(() => import("./pages/ai/AiInsights"));
const AiTrainingJobs = lazy(() => import("./pages/ai/AiTrainingJobs"));
const ModelTraining = lazy(() => import("./pages/ai/ModelTraining"));
const AiConfig = lazy(() => import("./pages/ai/AiConfig"));
const AiThresholds = lazy(() => import("./pages/ai/AiThresholds"));
const PredictiveAlertConfig = lazy(() => import("./pages/ai/PredictiveAlertConfig"));
const PredictiveAlertDashboard = lazy(() => import("./pages/ai/PredictiveAlertDashboard"));
const ForecastAccuracyDashboard = lazy(() => import("./pages/ai/ForecastAccuracyDashboard"));
const AiDataSources = lazy(() => import("./pages/ai/AiDataSources"));
const AiAuditLogs = lazy(() => import("./pages/ai/AiAuditLogs"));
const AiAlerts = lazy(() => import("./pages/ai/AiAlerts"));
const AiPredictions = lazy(() => import("./pages/ai/AiPredictions"));
const AiPredictionThresholds = lazy(() => import("./pages/ai/AiPredictionThresholds"));
const AiPredictionHistory = lazy(() => import("./pages/ai/AiPredictionHistory"));
const CpkForecastingPage = lazy(() => import("./pages/ai/CpkForecastingPage"));
const DefectDetectionPage = lazy(() => import("./pages/ai/DefectDetectionPage"));
const FirebasePushSettingsPage = lazy(() => import("./pages/ai/FirebasePushSettingsPage"));
const CpkComparisonPage = lazy(() => import("./pages/ai/CpkComparisonPage"));
const AiModelPerformance = lazy(() => import("./pages/ai/AiModelPerformance"));
const AiModelComparison = lazy(() => import("./pages/ai/AiModelComparison"));

// WebSocket & Custom Alerts
const WebSocketDashboard = lazy(() => import("./pages/WebSocketDashboard"));
const CustomAlertRules = lazy(() => import("./pages/CustomAlertRules"));

// Realtime & Monitoring
const RealtimeMachineConfig = lazy(() => import("./pages/RealtimeMachineConfig"));
const RealtimeHistory = lazy(() => import("./pages/RealtimeHistory"));
const ExportRealtimeData = lazy(() => import("./pages/ExportRealtimeData"));
const AnomalyDetection = lazy(() => import("./pages/AnomalyDetection"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));

// Vision & AVI/AOI
const ImageComparison = lazy(() => import("./pages/ImageComparison"));
const AviAoiDashboard = lazy(() => import("./pages/AviAoiDashboard"));
const AoiAviSummaryDashboard = lazy(() => import("./pages/AoiAviSummaryDashboard"));
const YieldDefectAlertHistory = lazy(() => import("./pages/YieldDefectAlertHistory"));
const GoldenSampleManager = lazy(() => import("./pages/GoldenSampleManager"));
const DefectTypeManager = lazy(() => import("./pages/DefectTypeManager"));
const DashboardCustomization = lazy(() => import("./pages/DashboardCustomization"));
const BatchImageAnalysis = lazy(() => import("./pages/BatchImageAnalysis"));
const RealtimeInspection = lazy(() => import("./pages/RealtimeInspection"));
const GoldenSample = lazy(() => import("./pages/GoldenSample"));
const AiModelManagement = lazy(() => import("./pages/AiModelManagement"));
const MachineApiDocumentation = lazy(() => import("./pages/MachineApiDocumentation"));
const CustomWidgets = lazy(() => import("./pages/CustomWidgets"));
const CameraManagement = lazy(() => import("./pages/CameraManagement"));
const SNImageHistory = lazy(() => import("./pages/SNImageHistory"));
const ImageHistory = lazy(() => import("./pages/ImageHistory"));
const CameraCaptureSchedule = lazy(() => import("./pages/CameraCaptureSchedule"));
const QualityStatisticsReport = lazy(() => import("./pages/QualityStatisticsReport"));
const SNImageCompare = lazy(() => import("./pages/SNImageCompare"));
const SnImages = lazy(() => import("./pages/SnImages"));

// MMS
const MMSDashboard = lazy(() => import("./pages/MMSDashboard"));
const MMSDataInit = lazy(() => import("./pages/MMSDataInit"));

// Escalation
const EscalationConfigPage = lazy(() => import("./pages/EscalationConfigPage"));
const AutoResolveSettings = lazy(() => import("./pages/AutoResolveSettings"));

// User Guide & Documentation
const UserGuide = lazy(() => import("./pages/UserGuide"));
const VideoManagement = lazy(() => import("./pages/VideoManagement"));
const ApiDocumentation = lazy(() => import("./pages/ApiDocumentation"));

// Role & Permission
const RolePermissionManagement = lazy(() => import("./pages/RolePermissionManagement"));
const ProcessTemplateManagement = lazy(() => import("./pages/ProcessTemplateManagement"));
const InspectionDetail = lazy(() => import("./pages/InspectionDetail"));

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        {/* Core Routes - Direct loaded */}
        <Route path="/" component={LandingPage} />
        <Route path="/home" component={Home} />
        <Route path="/local-login" component={LocalLogin} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/about" component={About} />

        {/* Core Analysis */}
        <Route path="/analyze" component={Analyze} />
        <Route path="/history" component={History} />
        <Route path="/mappings" component={Mappings} />
        <Route path="/settings" component={Settings} />
        <Route path="/app-settings" component={AppSettings} />
        <Route path="/quick-access" component={QuickAccessManagement} />

        {/* Auth & User Management */}
        <Route path="/users" component={UserManagement} />
        <Route path="/local-users" component={LocalUserManagement} />
        <Route path="/change-password" component={ChangePassword} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/2fa-setup" component={TwoFactorSetup} />
        <Route path="/login-customization" component={LoginCustomization} />
        <Route path="/login-history" component={LoginHistoryPage} />
        <Route path="/auth-audit-logs" component={AuthAuditLogs} />

        {/* Product & Specification */}
        <Route path="/products" component={ProductManagement} />
        <Route path="/specifications" component={SpecificationManagement} />
        <Route path="/sampling-methods" component={SamplingMethodManagement} />
        <Route path="/spc-plans" component={SpcPlanManagement} />
        <Route path="/quick-spc-plan" component={QuickSpcPlan} />
        <Route path="/validation-rules" component={ValidationRulesManagement} />
        <Route path="/measurement-standards" component={MeasurementStandards} />
        <Route path="/measurement-standards-dashboard" component={MeasurementStandardsDashboard} />

        {/* Production & Factory */}
        <Route path="/production-line-management" component={ProductionLineManagement} />
        <Route path="/factories" component={FactoryManagement} />
        <Route path="/workshops" component={WorkshopManagement} />
        <Route path="/workstations" component={WorkstationManagement} />
        <Route path="/machines" component={MachineManagement} />
        <Route path="/processes" component={ProcessManagement} />
        <Route path="/machine-types" component={MachineTypeManagement} />
        <Route path="/machine-areas" component={MachineAreaManagement} />
        <Route path="/machine/:id" component={MachineDetail} />
        <Route path="/floor-plan-heatmap" component={FloorPlanHeatmapPage} />
        <Route path="/iot-floor-plan" component={IoTFloorPlanPage} />
        <Route path="/iot-3d-floor-plan" component={IoT3DFloorPlanPage} />
        <Route path="/floor-plan-live" component={FloorPlanLivePage} />

        {/* Defect & Quality */}
        <Route path="/defects" component={DefectManagement} />
        <Route path="/defect-statistics" component={DefectStatistics} />
        <Route path="/fixtures" component={FixtureManagement} />
        <Route path="/jigs" component={JigManagement} />

        {/* Alert & Notification */}
        <Route path="/alert-config" component={AlertConfiguration} />
        <Route path="/alert-dashboard" component={AlertDashboard} />
        <Route path="/alert-history" component={AlertHistory} />
        <Route path="/alert-notification-config" component={AlertNotificationConfig} />
        <Route path="/alert-threshold-config" component={AlertThresholdConfig} />
        <Route path="/alarm-threshold-config" component={AlarmThresholdConfig} />
        <Route path="/notification-settings" component={NotificationSettings} />
        <Route path="/notification-preferences" component={NotificationPreferences} />
        <Route path="/alert-unified" component={AlertUnified} />
        <Route path="/notification-unified" component={NotificationUnified} />
        <Route path="/notification-history" component={NotificationHistory} />
        <Route path="/environment-alerts" component={EnvironmentAlertConfig} />
        <Route path="/performance-drop-alert" component={PerformanceDropAlertConfig} />
        <Route path="/push-notification-settings" component={PushNotificationSettings} />
        <Route path="/work-order-notification-config" component={WorkOrderNotificationConfig} />

        {/* Email & SMS */}
        <Route path="/email-notifications" component={EmailNotificationSettings} />
        <Route path="/smtp-settings" component={SmtpSettings} />
        <Route path="/twilio-settings" component={TwilioSettings} />
        <Route path="/sms-config" component={SmsConfigSettings} />
        <Route path="/sms-settings" component={SmsSettings} />
        <Route path="/telegram-settings" component={TelegramSettings} />

        {/* Webhook */}
        <Route path="/webhooks" component={WebhookManagement} />
        <Route path="/webhook-settings" component={WebhookSettings} />
        <Route path="/webhook-unified" component={WebhookUnified} />

        {/* Reports - Master Dashboards */}
        <Route path="/reports-master" component={ReportsMasterDashboard} />
        <Route path="/scheduled-master" component={ScheduledMasterDashboard} />
        <Route path="/report-templates" component={ReportTemplateManagement} />
        <Route path="/reports-export" component={ReportsExport} />
        <Route path="/scheduled-reports" component={ScheduledReports} />
        <Route path="/scheduled-report-management" component={ScheduledReportManagement} />
        <Route path="/shift-reports" component={ShiftReportHistory} />
        <Route path="/scheduled-jobs" component={ScheduledJobsManagement} />
        <Route path="/scheduled-kpi-reports" component={ScheduledKpiReports} />

        {/* SPC & CPK */}
        <Route path="/spc-report" component={SpcReport} />
        <Route path="/spc-visualization" component={SpcPlanVisualization} />
        <Route path="/spc-visualization/:type/:id" component={SpcVisualizationDetail} />
        <Route path="/cpk-comparison" component={CpkComparisonDashboard} />

        {/* OEE - Master Dashboard */}
        <Route path="/oee-master" component={OeeMasterDashboard} />
        <Route path="/oee-period-report" component={OeePeriodReport} />
        <Route path="/oee-dashboard" component={OEEDashboard} />
        <Route path="/oee-alert-thresholds" component={OeeAlertThresholdSettings} />
        <Route path="/oee-thresholds-by-line" component={OeeThresholdsByLine} />
        <Route path="/oee-alert-integrations" component={OeeAlertIntegrations} />
        <Route path="/iot-oee-alert-config" component={IotOeeAlertConfig} />

        {/* KPI */}
        <Route path="/kpi-alert-thresholds" component={KpiAlertThresholds} />
        <Route path="/kpi-threshold-settings" component={KpiThresholdSettings} />
        <Route path="/plant-kpi" component={PlantKPIDashboard} />

        {/* NTF */}
        <Route path="/ntf-config" component={NtfAlertConfig} />
        <Route path="/ntf-comparison" component={NtfComparison} />
        <Route path="/ntf-dashboard" component={NtfDashboard} />
        <Route path="/ntf-line/:id" component={NtfLineDetail} />

        {/* Maintenance - Master Dashboard */}
        <Route path="/maintenance-master" component={MaintenanceMasterDashboard} />
        <Route path="/maintenance-dashboard" component={MaintenanceDashboard} />
        <Route path="/maintenance-schedule" component={MaintenanceSchedule} />
        <Route path="/predictive-maintenance" component={PredictiveMaintenance} />
        <Route path="/spare-parts" component={SparePartsManagement} />
        <Route path="/spare-parts-guide" component={SparePartsGuide} />
        <Route path="/spare-parts-cost-report" component={SparePartsCostReport} />
        <Route path="/stock-movements" component={StockMovements} />
        <Route path="/inventory-check" component={InventoryCheck} />
        <Route path="/stock-report" component={StockReport} />
        <Route path="/equipment-qr" component={EquipmentQRLookup} />
        <Route path="/mttr-mtbf-report" component={MttrMtbfReport} />

        {/* License */}
        <Route path="/license-activation" component={LicenseActivation} />
        <Route path="/license-admin" component={LicenseAdmin} />
        <Route path="/license-management" component={LicenseManagement} />
        <Route path="/license-dashboard" component={LicenseDashboard} />
        <Route path="/license-notification-report" component={LicenseNotificationReport} />
        <Route path="/license-server-settings" component={LicenseServerSettings} />
        <Route path="/license-unified" component={LicenseUnified} />

        {/* Database & System */}
        <Route path="/database-settings" component={DatabaseSettings} />
        <Route path="/database-unified" component={DatabaseUnified} />
        <Route path="/data-migration" component={DataMigrationTool} />
        <Route path="/connection-manager" component={ConnectionManager} />
        <Route path="/backup-history" component={BackupHistory} />
        <Route path="/backup-restore" component={BackupRestore} />
        <Route path="/setup" component={SystemSetup} />
        <Route path="/company-info" component={CompanyInfo} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/seed-data" component={SeedDataPage} />
        <Route path="/admin-monitoring" component={AdminMonitoring} />

        {/* Organization & Approval */}
        <Route path="/organization" component={OrganizationManagement} />
        <Route path="/approval-workflow" component={ApprovalWorkflowManagement} />
        <Route path="/module-permissions" component={ModulePermissionManagement} />
        <Route path="/pending-approvals" component={PendingApprovals} />
        <Route path="/approval-report" component={ApprovalReport} />
        <Route path="/rules" component={RulesManagement} />

        {/* IoT - Master Dashboard */}
        <Route path="/iot-master" component={IoTMasterDashboard} />
        <Route path="/iot-dashboard" component={IoTDashboard} />
        <Route path="/iot-device-management" component={IoTDeviceManagement} />
        <Route path="/iot-protocol-management" component={IoTProtocolManagement} />
        <Route path="/iot-analytics" component={IoTAnalytics} />
        <Route path="/iot-gateway" component={IoTGatewayConfig} />
        <Route path="/iot-predictive-maintenance" component={IoTPredictiveMaintenance} />
        <Route path="/iot-work-orders" component={IoTWorkOrders} />
        <Route path="/iot-alert-escalation" component={IoTAlertEscalation} />
        <Route path="/iot-firmware-ota" component={IoTFirmwareOTA} />
        <Route path="/iot-scheduled-ota" component={IoTScheduledOTA} />
        <Route path="/iot-monitoring-realtime" component={IotMonitoringRealtime} />
        <Route path="/mqtt-connections" component={MqttConnectionManagement} />
        <Route path="/opcua-connections" component={OpcuaConnectionManagement} />

        {/* AI/ML - Master Dashboard */}
        <Route path="/ai-master" component={AiMasterDashboard} />
        <Route path="/ai-dashboard" component={AiDashboard} />
        <Route path="/ai-root-cause" component={AiRootCause} />
        <Route path="/ai-predictive" component={AiPredictive} />
        <Route path="/ai-model-training" component={AiModelTraining} />
        <Route path="/ai-natural-language" component={AiNaturalLanguage} />
        <Route path="/ai-spc-analysis" component={AiSpcAnalysis} />
        <Route path="/ai-vision-analysis" component={AiVisionAnalysis} />
        <Route path="/ai-ml-dashboard" component={AiMlDashboard} />
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
        <Route path="/cpk-forecasting" component={CpkForecastingPage} />
        <Route path="/defect-detection" component={DefectDetectionPage} />
        <Route path="/firebase-push-settings" component={FirebasePushSettingsPage} />
        <Route path="/cpk-comparison-page" component={CpkComparisonPage} />
        <Route path="/ai-model-performance" component={AiModelPerformance} />
        <Route path="/ai-model-comparison" component={AiModelComparison} />

        {/* Realtime & Monitoring */}
        <Route path="/realtime-machine-config" component={RealtimeMachineConfig} />
        <Route path="/realtime-history" component={RealtimeHistory} />
        <Route path="/export-realtime" component={ExportRealtimeData} />
        <Route path="/anomaly-detection" component={AnomalyDetection} />
        <Route path="/advanced-analytics" component={AdvancedAnalytics} />

        {/* Vision & AVI/AOI */}
        <Route path="/image-comparison" component={ImageComparison} />
        <Route path="/avi-aoi-dashboard" component={AviAoiDashboard} />
        <Route path="/aoi-avi-summary" component={AoiAviSummaryDashboard} />
        <Route path="/yield-defect-alert-history" component={YieldDefectAlertHistory} />
        <Route path="/golden-sample-manager" component={GoldenSampleManager} />
        <Route path="/defect-type-manager" component={DefectTypeManager} />
        <Route path="/dashboard-customization" component={DashboardCustomization} />
        <Route path="/batch-image-analysis" component={BatchImageAnalysis} />
        <Route path="/machine-api-documentation" component={MachineApiDocumentation} />
        <Route path="/custom-widgets" component={CustomWidgets} />
        <Route path="/camera-management" component={CameraManagement} />
        <Route path="/sn-image-history" component={SNImageHistory} />
        <Route path="/image-history" component={ImageHistory} />
        <Route path="/camera-capture-schedule" component={CameraCaptureSchedule} />
        <Route path="/quality-statistics-report" component={QualityStatisticsReport} />
        <Route path="/sn-image-compare" component={SNImageCompare} />
        <Route path="/sn-images" component={SnImages} />
        <Route path="/realtime-inspection" component={RealtimeInspection} />
        <Route path="/golden-sample" component={GoldenSample} />
        <Route path="/ai-model-management" component={AiModelManagement} />

        {/* MMS */}
        <Route path="/mms-dashboard" component={MMSDashboard} />
        <Route path="/mms-data-init" component={MMSDataInit} />

        {/* WebSocket & Custom Alerts */}
        <Route path="/websocket-dashboard" component={WebSocketDashboard} />
        <Route path="/custom-alert-rules" component={CustomAlertRules} />

        {/* Escalation */}
        <Route path="/escalation-config" component={EscalationConfigPage} />
        <Route path="/auto-resolve-settings" component={AutoResolveSettings} />

        {/* User Guide & Documentation */}
        <Route path="/user-guide" component={UserGuide} />
        <Route path="/video-management" component={VideoManagement} />
        <Route path="/api-docs" component={ApiDocumentation} />

        {/* Role & Permission */}
        <Route path="/role-permissions" component={RolePermissionManagement} />
        <Route path="/process-templates" component={ProcessTemplateManagement} />
        <Route path="/inspection/:id" component={InspectionDetail} />

        {/* 404 */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

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
