import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Cpu, 
  Settings, 
  AlertTriangle, 
  BarChart3, 
  Wrench,
  Upload,
  Calendar,
  Network,
  Box,
  BookOpen,
  Workflow
} from "lucide-react";

// Lazy load các components con
const IoTDashboardContent = lazy(() => import("./IoTDashboard").then(m => ({ default: m.default })));
const IoTDeviceManagementContent = lazy(() => import("./IoTDeviceManagement").then(m => ({ default: m.default })));
const IoTAnalyticsContent = lazy(() => import("./IoTAnalytics").then(m => ({ default: m.default })));
const IoTFirmwareOTAContent = lazy(() => import("./IoTFirmwareOTA").then(m => ({ default: m.default })));
const IoTGatewayConfigContent = lazy(() => import("./IoTGatewayConfig").then(m => ({ default: m.default })));
const IoTPredictiveMaintenanceContent = lazy(() => import("./IoTPredictiveMaintenance").then(m => ({ default: m.default })));
const IoTProtocolManagementContent = lazy(() => import("./IoTProtocolManagement").then(m => ({ default: m.default })));
const IoTScheduledOTAContent = lazy(() => import("./IoTScheduledOTA").then(m => ({ default: m.default })));
const IoTWorkOrdersContent = lazy(() => import("./IoTWorkOrders").then(m => ({ default: m.default })));
const IoTAlertEscalationContent = lazy(() => import("./IoTAlertEscalation").then(m => ({ default: m.default })));

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

export default function IoTMasterDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: Activity, description: "Dashboard tổng quan IoT" },
    { id: "devices", label: "Thiết bị", icon: Cpu, description: "Quản lý thiết bị IoT" },
    { id: "analytics", label: "Phân tích", icon: BarChart3, description: "Phân tích dữ liệu IoT" },
    { id: "firmware", label: "Firmware", icon: Upload, description: "Cập nhật firmware OTA" },
    { id: "gateway", label: "Gateway", icon: Network, description: "Cấu hình gateway" },
    { id: "maintenance", label: "Bảo trì", icon: Wrench, description: "Bảo trì dự đoán" },
    { id: "protocols", label: "Giao thức", icon: Settings, description: "Quản lý giao thức" },
    { id: "scheduled", label: "Lịch OTA", icon: Calendar, description: "Lịch cập nhật OTA" },
    { id: "workorders", label: "Work Orders", icon: Workflow, description: "Quản lý work orders" },
    { id: "alerts", label: "Cảnh báo", icon: AlertTriangle, description: "Leo thang cảnh báo" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">IoT Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện hệ thống IoT - Thiết bị, Gateway, Firmware, Bảo trì
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Activity className="w-4 h-4 mr-2" />
            Hệ thống IoT
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 lg:grid-cols-10 gap-1 h-auto p-1">
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
              <IoTDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTDeviceManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTAnalyticsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="firmware" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTFirmwareOTAContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="gateway" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTGatewayConfigContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTPredictiveMaintenanceContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="protocols" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTProtocolManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTScheduledOTAContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="workorders" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTWorkOrdersContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IoTAlertEscalationContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
