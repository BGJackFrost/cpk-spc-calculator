import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  FileText, 
  BarChart3, 
  Settings
} from "lucide-react";

// Lazy load các components con
const ScheduledJobsManagementContent = lazy(() => import("./ScheduledJobsManagement").then(m => ({ default: m.default })));
const ScheduledKpiReportsContent = lazy(() => import("./ScheduledKpiReports").then(m => ({ default: m.default })));
const ScheduledReportManagementContent = lazy(() => import("./ScheduledReportManagement").then(m => ({ default: m.default })));
const ScheduledReportsContent = lazy(() => import("./ScheduledReports").then(m => ({ default: m.default })));

const LoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64" />
  </div>
);

export default function ScheduledMasterDashboard() {
  const [activeTab, setActiveTab] = useState("jobs");

  const tabs = [
    { id: "jobs", label: "Quản lý Jobs", icon: Settings, description: "Quản lý các scheduled jobs" },
    { id: "kpi", label: "Báo cáo KPI", icon: BarChart3, description: "Báo cáo KPI định kỳ" },
    { id: "management", label: "Quản lý báo cáo", icon: FileText, description: "Quản lý báo cáo định kỳ" },
    { id: "reports", label: "Báo cáo", icon: Calendar, description: "Danh sách báo cáo" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện các tác vụ và báo cáo định kỳ
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            Scheduled System
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 gap-1 h-auto p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center gap-1 py-2 px-2 text-xs"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ScheduledJobsManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="kpi" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ScheduledKpiReportsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ScheduledReportManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ScheduledReportsContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
