import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Calendar, 
  TrendingUp, 
  Package,
  FileText,
  DollarSign
} from "lucide-react";

// Lazy load các components con
const MaintenanceDashboardContent = lazy(() => import("./MaintenanceDashboard").then(m => ({ default: m.default })));
const MaintenanceScheduleContent = lazy(() => import("./MaintenanceSchedule").then(m => ({ default: m.default })));
const PredictiveMaintenanceContent = lazy(() => import("./PredictiveMaintenance").then(m => ({ default: m.default })));
const SparePartsManagementContent = lazy(() => import("./SparePartsManagement").then(m => ({ default: m.default })));
const MttrMtbfReportContent = lazy(() => import("./MttrMtbfReport").then(m => ({ default: m.default })));
const SparePartsCostReportContent = lazy(() => import("./SparePartsCostReport").then(m => ({ default: m.default })));

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

export default function MaintenanceMasterDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: Wrench, description: "Dashboard bảo trì" },
    { id: "schedule", label: "Lịch bảo trì", icon: Calendar, description: "Lịch bảo trì định kỳ" },
    { id: "predictive", label: "Bảo trì dự đoán", icon: TrendingUp, description: "Bảo trì dự đoán" },
    { id: "spareparts", label: "Phụ tùng", icon: Package, description: "Quản lý phụ tùng" },
    { id: "mttr", label: "MTTR/MTBF", icon: FileText, description: "Báo cáo MTTR/MTBF" },
    { id: "cost", label: "Chi phí", icon: DollarSign, description: "Báo cáo chi phí" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Maintenance Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện bảo trì - Lịch trình, Dự đoán, Phụ tùng, Chi phí
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance System
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-6 gap-1 h-auto p-1">
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

          <TabsContent value="overview" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <MaintenanceDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <MaintenanceScheduleContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <PredictiveMaintenanceContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="spareparts" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <SparePartsManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="mttr" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <MttrMtbfReportContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <SparePartsCostReportContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
