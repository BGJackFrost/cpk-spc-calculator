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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <Route path="/rules" component={RulesManagement} />
      <Route path="/webhooks" component={WebhookManagement} />
      <Route path="/report-templates" component={ReportTemplateManagement} />
      <Route path="/export-history" component={ExportHistory} />
      <Route path="/license-activation" component={LicenseActivation} />
      <Route path="/license-admin" component={LicenseAdmin} />
      <Route path="/login-history" component={LoginHistoryPage} />
      <Route path="/spc-visualization" component={SpcPlanVisualization} />
      <Route path="/spc-visualization/:type/:id" component={SpcVisualizationDetail} />
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
          <SseNotificationProvider>
            <Toaster />
            <Router />
          </SseNotificationProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
