import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Mappings from "./pages/Mappings";
import Settings from "./pages/Settings";
import ProductionLinesDashboard from "./pages/ProductionLinesDashboard";
import UserManagement from "./pages/UserManagement";
import ProductManagement from "./pages/ProductManagement";
import SpecificationManagement from "./pages/SpecificationManagement";
import ProductionLineManagement from "./pages/ProductionLineManagement";
import SamplingMethodManagement from "./pages/SamplingMethodManagement";
import SpcPlanManagement from "./pages/SpcPlanManagement";
import EmailNotificationSettings from "./pages/EmailNotificationSettings";
import RolePermissionManagement from "./pages/RolePermissionManagement";
import SmtpSettings from "./pages/SmtpSettings";
import SeedDataPage from "./pages/SeedDataPage";
import WorkstationManagement from "./pages/WorkstationManagement";
import MachineManagement from "./pages/MachineManagement";
import ProcessManagement from "./pages/ProcessManagement";
import AuditLogs from "./pages/AuditLogs";
import SpcReport from "./pages/SpcReport";
import DefectManagement from "./pages/DefectManagement";
import DefectStatistics from "./pages/DefectStatistics";
import MachineTypeManagement from "./pages/MachineTypeManagement";
import FixtureManagement from "./pages/FixtureManagement";
import MultiAnalysis from "./pages/MultiAnalysis";
import ProductionLineComparison from "./pages/ProductionLineComparison";
import About from "./pages/About";
import Profile from "./pages/Profile";
import RulesManagement from "./pages/RulesManagement";
import SpcPlanVisualization from "./pages/SpcPlanVisualization";
import SpcVisualizationDetail from "./pages/SpcVisualizationDetail";
import SseNotificationProvider from "./components/SseNotificationProvider";
import WebhookManagement from "./pages/WebhookManagement";
import ReportTemplateManagement from "./pages/ReportTemplateManagement";
import ExportHistory from "./pages/ExportHistory";
import LocalLogin from "./pages/LocalLogin";
import LocalUserManagement from "./pages/LocalUserManagement";
import ChangePassword from "./pages/ChangePassword";
import LicenseActivation from "./pages/LicenseActivation";
import LicenseAdmin from "./pages/LicenseAdmin";
import LoginHistoryPage from "./pages/LoginHistoryPage";
import SystemSetup from "./pages/SystemSetup";
import DatabaseSettings from "./pages/DatabaseSettings";
import CompanyInfo from "./pages/CompanyInfo";
import BackupHistory from "./pages/BackupHistory";
import ConnectionManager from "./pages/ConnectionManager";
import MeasurementStandards from "./pages/MeasurementStandards";
import MeasurementStandardsDashboard from "./pages/MeasurementStandardsDashboard";
import QuickSpcPlan from "./pages/QuickSpcPlan";
import ValidationRulesManagement from "./pages/ValidationRulesManagement";
import CpkComparisonDashboard from "./pages/CpkComparisonDashboard";
import ShiftCpkComparison from "./pages/ShiftCpkComparison";
import LicenseManagement from "./pages/LicenseManagement";
import LicenseCustomers from "./pages/LicenseCustomers";
import LicenseRevenue from "./pages/LicenseRevenue";
import LicenseServerSettings from "./pages/LicenseServerSettings";
import LicenseServerDashboard from "./pages/LicenseServerDashboard";
import RealtimeLineDashboard from "./pages/RealtimeLineDashboard";
import RealtimeMachineConfig from "./pages/RealtimeMachineConfig";
import RealtimeHistory from "./pages/RealtimeHistory";
import AlarmThresholdConfig from "./pages/AlarmThresholdConfig";
import MachineOverviewDashboard from "./pages/MachineOverviewDashboard";
import MachineAreaManagement from "./pages/MachineAreaManagement";
import MachineStatusReport from "./pages/MachineStatusReport";
import OEEDashboard from "./pages/OEEDashboard";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import MachineDetail from "./pages/MachineDetail";
import ExportRealtimeData from "./pages/ExportRealtimeData";
import SparePartsManagement from "./pages/SparePartsManagement";
import StockMovements from "./pages/StockMovements";
import InventoryCheck from "./pages/InventoryCheck";
import StockReport from "./pages/StockReport";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";
import MMSDataInit from "./pages/MMSDataInit";
import MaintenanceSchedule from "./pages/MaintenanceSchedule";
import AlertThresholdConfig from "./pages/AlertThresholdConfig";
import EquipmentQRLookup from "./pages/EquipmentQRLookup";
import PlantKPIDashboard from "./pages/PlantKPIDashboard";
import IoTGatewayConfig from "./pages/IoTGatewayConfig";
import ReportsExport from "./pages/ReportsExport";
import AlertConfiguration from "./pages/AlertConfiguration";
import ScheduledReports from "./pages/ScheduledReports";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import ShiftReportHistory from "./pages/ShiftReportHistory";
import MachineComparison from "./pages/MachineComparison";
import NotificationCenter from "./pages/NotificationCenter";
import ScheduledJobsManagement from "./pages/ScheduledJobsManagement";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import ExportReports from "./pages/ExportReports";
import WebSocketEventLog from "./pages/WebSocketEventLog";
import SseEventLog from "./pages/SseEventLog";
import CustomReportBuilder from "./pages/CustomReportBuilder";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts";
import RateLimitDashboard from "./pages/RateLimitDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup" component={SystemSetup} />
      <Route path="/database-settings" component={DatabaseSettings} />
      <Route path="/database-setting" component={DatabaseSettings} />
      <Route path="/connection-manager" component={ConnectionManager} />
      <Route path="/company-info" component={CompanyInfo} />
      <Route path="/local-login" component={LocalLogin} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/production-lines" component={ProductionLinesDashboard} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/history" component={History} />
      <Route path="/mappings" component={Mappings} />
      <Route path="/settings" component={Settings} />
      <Route path="/users" component={UserManagement} />
      <Route path="/local-users" component={LocalUserManagement} />
      <Route path="/products" component={ProductManagement} />
      <Route path="/specifications" component={SpecificationManagement} />
      <Route path="/production-line-management" component={ProductionLineManagement} />
      <Route path="/sampling-methods" component={SamplingMethodManagement} />
      <Route path="/spc-plans" component={SpcPlanManagement} />
      <Route path="/quick-spc-plan" component={QuickSpcPlan} />
      <Route path="/validation-rules" component={ValidationRulesManagement} />
      <Route path="/cpk-comparison" component={CpkComparisonDashboard} />
      <Route path="/shift-cpk-comparison" component={ShiftCpkComparison} />
      <Route path="/realtime-line" component={RealtimeLineDashboard} />
      <Route path="/realtime-machine-config" component={RealtimeMachineConfig} />
      <Route path="/realtime-history" component={RealtimeHistory} />
      <Route path="/alarm-threshold-config" component={AlarmThresholdConfig} />
      <Route path="/machine-overview" component={MachineOverviewDashboard} />
      <Route path="/machine-areas" component={MachineAreaManagement} />
      <Route path="/machine-status-report" component={MachineStatusReport} />
      <Route path="/oee-dashboard" component={OEEDashboard} />
      <Route path="/maintenance-dashboard" component={MaintenanceDashboard} />
      <Route path="/machine/:id" component={MachineDetail} />
      <Route path="/export-realtime" component={ExportRealtimeData} />
      <Route path="/spare-parts" component={SparePartsManagement} />
      <Route path="/stock-movements" component={StockMovements} />
      <Route path="/inventory-check" component={InventoryCheck} />
      <Route path="/stock-report" component={StockReport} />
      <Route path="/predictive-maintenance" component={PredictiveMaintenance} />
      <Route path="/maintenance-schedule" component={MaintenanceSchedule} />
      <Route path="/equipment-qr" component={EquipmentQRLookup} />
      <Route path="/plant-kpi" component={PlantKPIDashboard} />
      <Route path="/iot-gateway" component={IoTGatewayConfig} />
      <Route path="/reports-export" component={ReportsExport} />
      <Route path="/alert-config" component={AlertConfiguration} />
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
      <Route path="/permissions" component={RolePermissionManagement} />
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
      <Route path="/multi-analysis" component={MultiAnalysis} />
      <Route path="/line-comparison" component={ProductionLineComparison} />
      <Route path="/about" component={About} />
      <Route path="/profile" component={Profile} />
      <Route path="/rules" component={RulesManagement} />
      <Route path="/webhooks" component={WebhookManagement} />
      <Route path="/report-templates" component={ReportTemplateManagement} />
      <Route path="/export-history" component={ExportHistory} />
      <Route path="/license-activation" component={LicenseActivation} />
      <Route path="/license-admin" component={LicenseAdmin} />
      <Route path="/license-management" component={LicenseManagement} />
      <Route path="/license-customers" component={LicenseCustomers} />
      <Route path="/license-revenue" component={LicenseRevenue} />
      <Route path="/license-server-settings" component={LicenseServerSettings} />
      <Route path="/license-server-dashboard" component={LicenseServerDashboard} />
      <Route path="/login-history" component={LoginHistoryPage} />
      <Route path="/backup-history" component={BackupHistory} />
      <Route path="/measurement-standards" component={MeasurementStandards} />
      <Route path="/measurement-standards-dashboard" component={MeasurementStandardsDashboard} />
      <Route path="/spc-visualization" component={SpcPlanVisualization} />
      <Route path="/spc-visualization/:type/:id" component={SpcVisualizationDetail} />
      <Route path="/custom-report-builder" component={CustomReportBuilder} />
      <Route path="/rate-limit-dashboard" component={RateLimitDashboard} />
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
