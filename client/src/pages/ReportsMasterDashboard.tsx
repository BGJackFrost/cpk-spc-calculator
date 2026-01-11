import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Download, 
  BarChart3, 
  ClipboardList,
  History,
  Package
} from "lucide-react";

// Lazy load các components con
const SpcReportContent = lazy(() => import("./SpcReport").then(m => ({ default: m.default })));
const ReportsExportContent = lazy(() => import("./ReportsExport").then(m => ({ default: m.default })));
const ReportTemplateManagementContent = lazy(() => import("./ReportTemplateManagement").then(m => ({ default: m.default })));
const ApprovalReportContent = lazy(() => import("./ApprovalReport").then(m => ({ default: m.default })));
const ShiftReportHistoryContent = lazy(() => import("./ShiftReportHistory").then(m => ({ default: m.default })));
const StockReportContent = lazy(() => import("./StockReport").then(m => ({ default: m.default })));

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

export default function ReportsMasterDashboard() {
  const [activeTab, setActiveTab] = useState("spc");

  const tabs = [
    { id: "spc", label: "SPC Report", icon: BarChart3, description: "Báo cáo SPC" },
    { id: "export", label: "Xuất báo cáo", icon: Download, description: "Xuất báo cáo" },
    { id: "templates", label: "Mẫu báo cáo", icon: FileText, description: "Quản lý mẫu báo cáo" },
    { id: "approval", label: "Phê duyệt", icon: ClipboardList, description: "Báo cáo phê duyệt" },
    { id: "shift", label: "Lịch sử ca", icon: History, description: "Lịch sử báo cáo ca" },
    { id: "stock", label: "Tồn kho", icon: Package, description: "Báo cáo tồn kho" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện báo cáo - SPC, Xuất, Mẫu, Phê duyệt
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <FileText className="w-4 h-4 mr-2" />
            Reports System
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

          <TabsContent value="spc" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <SpcReportContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ReportsExportContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ReportTemplateManagementContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="approval" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ApprovalReportContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="shift" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ShiftReportHistoryContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <StockReportContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
