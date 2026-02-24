import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Settings, 
  AlertTriangle, 
  BarChart3, 
  Gauge,
  Bell
} from "lucide-react";

// Lazy load các components con
const OEEDashboardContent = lazy(() => import("./OEEDashboard").then(m => ({ default: m.default })));
const OeeAlertIntegrationsContent = lazy(() => import("./OeeAlertIntegrations").then(m => ({ default: m.default })));
const OeeAlertThresholdSettingsContent = lazy(() => import("./OeeAlertThresholdSettings").then(m => ({ default: m.default })));
const OeeThresholdsByLineContent = lazy(() => import("./OeeThresholdsByLine").then(m => ({ default: m.default })));
const IotOeeAlertConfigContent = lazy(() => import("./IotOeeAlertConfig").then(m => ({ default: m.default })));

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

export default function OeeMasterDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Tổng quan OEE", icon: Gauge, description: "Dashboard tổng quan OEE" },
    { id: "integrations", label: "Tích hợp cảnh báo", icon: Bell, description: "Tích hợp cảnh báo OEE" },
    { id: "thresholds", label: "Ngưỡng cảnh báo", icon: AlertTriangle, description: "Cài đặt ngưỡng cảnh báo" },
    { id: "byline", label: "Ngưỡng theo Line", icon: BarChart3, description: "Ngưỡng theo dây chuyền" },
    { id: "iot", label: "IoT OEE", icon: Activity, description: "Cấu hình IoT OEE" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">OEE Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện OEE - Hiệu suất thiết bị tổng thể
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Gauge className="w-4 h-4 mr-2" />
            OEE System
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 gap-1 h-auto p-1">
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
              <OEEDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <OeeAlertIntegrationsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <OeeAlertThresholdSettingsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="byline" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <OeeThresholdsByLineContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="iot" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <IotOeeAlertConfigContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
