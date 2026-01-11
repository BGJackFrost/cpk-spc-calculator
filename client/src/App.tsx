import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SseNotificationProvider from "./components/SseNotificationProvider";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useEffect } from "react";
import { useLocation } from "wouter";

// Direct page imports (core pages)
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import LocalLogin from "./pages/LocalLogin";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import Mappings from "./pages/Mappings";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Profile from "./pages/Profile";
import About from "./pages/About";

// User & Auth Management
import UserManagement from "./pages/UserManagement";
import LocalUserManagement from "./pages/LocalUserManagement";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorSetup from "./pages/TwoFactorSetup";
import LoginCustomization from "./pages/LoginCustomization";
import LoginHistoryPage from "./pages/LoginHistoryPage";
import AuthAuditLogs from "./pages/AuthAuditLogs";

// Product & Specification Management
import ProductManagement from "./pages/ProductManagement";
import SpecificationManagement from "./pages/SpecificationManagement";
import SamplingMethodManagement from "./pages/SamplingMethodManagement";
import SpcPlanManagement from "./pages/SpcPlanManagement";
import QuickSpcPlan from "./pages/QuickSpcPlan";
import ValidationRulesManagement from "./pages/ValidationRulesManagement";
import MeasurementStandards from "./pages/MeasurementStandards";
import MeasurementStandardsDashboard from "./pages/MeasurementStandardsDashboard";

// Production & Factory Management
import ProductionLineManagement from "./pages/ProductionLineManagement";
import FactoryManagement from "./pages/FactoryManagement";
import WorkshopManagement from "./pages/WorkshopManagement";
import WorkstationManagement from "./pages/WorkstationManagement";
import MachineManagement from "./pages/MachineManagement";
import ProcessManagement from "./pages/ProcessManagement";
import MachineTypeManagement from "./pages/MachineTypeManagement";
import MachineAreaManagement from "./pages/MachineAreaManagement";
import MachineDetail from "./pages/MachineDetail";

// Defect & Quality Management
import DefectManagement from "./pages/DefectManagement";
import DefectStatistics from "./pages/DefectStatistics";
import FixtureManagement from "./pages/FixtureManagement";
import JigManagement from "./pages/JigManagement";

// Alert & Notification
import AlertConfiguration from "./pages/AlertConfiguration";
import AlertDashboard from "./pages/AlertDashboard";
import AlertHistory from "./pages/AlertHistory";
import AlertNotificationConfig from "./pages/AlertNotificationConfig";
import AlertThresholdConfig from "./pages/AlertThresholdConfig";
import AlarmThresholdConfig from "./pages/AlarmThresholdConfig";
import NotificationSettings from "./pages/NotificationSettings";
import NotificationPreferences from "./pages/NotificationPreferences";
import AlertUnified from "./pages/AlertUnified";
import NotificationUnified from "./pages/NotificationUnified";
import EnvironmentAlertConfig from "./pages/EnvironmentAlertConfig";
import PerformanceDropAlertConfig from "./pages/PerformanceDropAlertConfig";
import PushNotificationSettings from "./pages/PushNotificationSettings";
import WorkOrderNotificationConfig from "./pages/WorkOrderNotificationConfig";

// Email & SMS Settings
import EmailNotificationSettings from "./pages/EmailNotificationSettings";
import SmtpSettings from "./pages/SmtpSettings";
import TwilioSettings from "./pages/TwilioSettings";
import SmsConfigSettings from "./pages/SmsConfigSettings";
import SmsSettings from "./pages/SmsSettings";
import TelegramSettings from "./pages/TelegramSettings";

// Webhook & Integration
import WebhookManagement from "./pages/WebhookManagement";
import WebhookSettings from "./pages/WebhookSettings";
import WebhookUnified from "./pages/WebhookUnified";

// Reports & Export - Master Dashboards
import ReportsMasterDashboard from "./pages/ReportsMasterDashboard";
import ScheduledMasterDashboard from "./pages/ScheduledMasterDashboard";
import ReportTemplateManagement from "./pages/ReportTemplateManagement";
import ReportsExport from "./pages/ReportsExport";
import ScheduledReports from "./pages/ScheduledReports";
import ScheduledReportManagement from "./pages/ScheduledReportManagement";
import ShiftReportHistory from "./pages/ShiftReportHistory";
import ScheduledJobsManagement from "./pages/ScheduledJobsManagement";
import ScheduledKpiReports from "./pages/ScheduledKpiReports";

// SPC & CPK
import SpcReport from "./pages/SpcReport";
import SpcPlanVisualization from "./pages/SpcPlanVisualization";
import SpcVisualizationDetail from "./pages/SpcVisualizationDetail";
import CpkComparisonDashboard from "./pages/CpkComparisonDashboard";

// OEE - Master Dashboard
import OeeMasterDashboard from "./pages/OeeMasterDashboard";
import OEEDashboard from "./pages/OEEDashboard";
import OeeAlertThresholdSettings from "./pages/OeeAlertThresholdSettings";
import OeeThresholdsByLine from "./pages/OeeThresholdsByLine";
import OeeAlertIntegrations from "./pages/OeeAlertIntegrations";
import IotOeeAlertConfig from "./pages/IotOeeAlertConfig";

// KPI
import KpiAlertThresholds from "./pages/KpiAlertThresholds";
import KpiThresholdSettings from "./pages/KpiThresholdSettings";
import PlantKPIDashboard from "./pages/PlantKPIDashboard";

// NTF
import NtfAlertConfig from "./pages/NtfAlertConfig";
import NtfComparison from "./pages/NtfComparison";
import NtfDashboard from "./pages/NtfDashboard";
import NtfLineDetail from "./pages/NtfLineDetail";

// Maintenance & Spare Parts - Master Dashboard
import MaintenanceMasterDashboard from "./pages/MaintenanceMasterDashboard";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import MaintenanceSchedule from "./pages/MaintenanceSchedule";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";
import SparePartsManagement from "./pages/SparePartsManagement";
import SparePartsGuide from "./pages/SparePartsGuide";
import SparePartsCostReport from "./pages/SparePartsCostReport";
import StockMovements from "./pages/StockMovements";
import InventoryCheck from "./pages/InventoryCheck";
import StockReport from "./pages/StockReport";
import EquipmentQRLookup from "./pages/EquipmentQRLookup";
import MttrMtbfReport from "./pages/MttrMtbfReport";

// License
import LicenseActivation from "./pages/LicenseActivation";
import LicenseAdmin from "./pages/LicenseAdmin";
import LicenseManagement from "./pages/LicenseManagement";
import LicenseDashboard from "./pages/LicenseDashboard";
import LicenseNotificationReport from "./pages/LicenseNotificationReport";
import LicenseServerSettings from "./pages/LicenseServerSettings";
import LicenseUnified from "./pages/LicenseUnified";

// Database & System
import DatabaseSettings from "./pages/DatabaseSettings";
import DatabaseUnified from "./pages/DatabaseUnified";
import DataMigrationTool from "./pages/DataMigrationTool";
import ConnectionManager from "./pages/ConnectionManager";
import BackupHistory from "./pages/BackupHistory";
import BackupRestore from "./pages/BackupRestore";
import SystemSetup from "./pages/SystemSetup";
import CompanyInfo from "./pages/CompanyInfo";
import AuditLogs from "./pages/AuditLogs";
import SeedDataPage from "./pages/SeedDataPage";
import AdminMonitoring from "./pages/AdminMonitoring";
import AppSettings from "./pages/AppSettings";
import QuickAccessManagement from "./pages/QuickAccessManagement";

// Organization & Approval
import OrganizationManagement from "./pages/OrganizationManagement";
import ApprovalWorkflowManagement from "./pages/ApprovalWorkflowManagement";
import ModulePermissionManagement from "./pages/ModulePermissionManagement";
import PendingApprovals from "./pages/PendingApprovals";
import ApprovalReport from "./pages/ApprovalReport";
import RulesManagement from "./pages/RulesManagement";

// IoT - Master Dashboard
import IoTMasterDashboard from "./pages/IoTMasterDashboard";
import IoTDashboard from "./pages/IoTDashboard";
import IoTDeviceManagement from "./pages/IoTDeviceManagement";
import IoTProtocolManagement from "./pages/IoTProtocolManagement";
import IoTAnalytics from "./pages/IoTAnalytics";
import IoTGatewayConfig from "./pages/IoTGatewayConfig";
import IoTPredictiveMaintenance from "./pages/IoTPredictiveMaintenance";
import IoTWorkOrders from "./pages/IoTWorkOrders";
import IoTAlertEscalation from "./pages/IoTAlertEscalation";
import IoTFirmwareOTA from "./pages/IoTFirmwareOTA";
import IoTScheduledOTA from "./pages/IoTScheduledOTA";
import IotMonitoringRealtime from "./pages/iot/IotMonitoringRealtime";
import MqttConnectionManagement from "./pages/MqttConnectionManagement";
import OpcuaConnectionManagement from "./pages/OpcuaConnectionManagement";

// AI/ML - Master Dashboard
import AiMasterDashboard from "./pages/AiMasterDashboard";
import AiDashboard from "./pages/AiDashboard";
import AiRootCause from "./pages/AiRootCause";
import AiPredictive from "./pages/AiPredictive";
import AiModelTraining from "./pages/AiModelTraining";
import AiNaturalLanguage from "./pages/AiNaturalLanguage";
import AiSpcAnalysis from "./pages/AiSpcAnalysis";
import AiVisionAnalysis from "./pages/AiVisionAnalysis";

// AI subfolder
import AiMlDashboard from "./pages/ai/AiMlDashboard";
import AiAnalyticsDashboard from "./pages/ai/AiAnalyticsDashboard";
import ABTestingManagement from "./pages/ai/ABTestingManagement";
import ModelVersioningPage from "./pages/ai/ModelVersioningPage";
import DataDriftMonitoring from "./pages/ai/DataDriftMonitoring";
import AiMlHealth from "./pages/ai/AiMlHealth";
import AiCorrelationAnalysis from "./pages/ai/AiCorrelationAnalysis";
import AiTrendAnalysis from "./pages/ai/AiTrendAnalysis";
import AiOeeForecast from "./pages/ai/AiOeeForecast";
import AiDefectPrediction from "./pages/ai/AiDefectPrediction";
import AiVisionDefectDetection from "./pages/ai/AiVisionDefectDetection";
import AiYieldOptimization from "./pages/ai/AiYieldOptimization";
import AiReports from "./pages/ai/AiReports";
import AiInsights from "./pages/ai/AiInsights";
import AiTrainingJobs from "./pages/ai/AiTrainingJobs";
import ModelTraining from "./pages/ai/ModelTraining";
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
import CpkForecastingPage from "./pages/ai/CpkForecastingPage";
import DefectDetectionPage from "./pages/ai/DefectDetectionPage";
import FirebasePushSettingsPage from "./pages/ai/FirebasePushSettingsPage";
import CpkComparisonPage from "./pages/ai/CpkComparisonPage";
import AiModelPerformance from "./pages/ai/AiModelPerformance";
import AiModelComparison from "./pages/ai/AiModelComparison";

// Realtime & Monitoring
import RealtimeMachineConfig from "./pages/RealtimeMachineConfig";
import RealtimeHistory from "./pages/RealtimeHistory";
import ExportRealtimeData from "./pages/ExportRealtimeData";
import AnomalyDetection from "./pages/AnomalyDetection";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";

// Vision & AVI/AOI
import ImageComparison from "./pages/ImageComparison";
import AviAoiDashboard from "./pages/AviAoiDashboard";
import MachineApiDocumentation from "./pages/MachineApiDocumentation";

// MMS
import MMSDashboard from "./pages/MMSDashboard";
import MMSDataInit from "./pages/MMSDataInit";

// Escalation
import EscalationConfigPage from "./pages/EscalationConfigPage";
import AutoResolveSettings from "./pages/AutoResolveSettings";

// User Guide & Documentation
import UserGuide from "./pages/UserGuide";
import VideoManagement from "./pages/VideoManagement";
import ApiDocumentation from "./pages/ApiDocumentation";

function Router() {
  return (
    <Switch>
      {/* Core Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={Home} />
      <Route path="/local-login" component={LocalLogin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/history" component={History} />
      <Route path="/mappings" component={Mappings} />
      <Route path="/settings" component={Settings} />
      <Route path="/profile" component={Profile} />
      <Route path="/about" component={About} />
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
      <Route path="/machine-api-documentation" component={MachineApiDocumentation} />

      {/* MMS */}
      <Route path="/mms-dashboard" component={MMSDashboard} />
      <Route path="/mms-data-init" component={MMSDataInit} />

      {/* Escalation */}
      <Route path="/escalation-config" component={EscalationConfigPage} />
      <Route path="/auto-resolve-settings" component={AutoResolveSettings} />

      {/* User Guide & Documentation */}
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/video-management" component={VideoManagement} />
      <Route path="/api-docs" component={ApiDocumentation} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
