import { useState, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  LineChart, 
  MessageSquare, 
  TrendingUp, 
  Search, 
  BarChart3,
  Eye
} from "lucide-react";

// Lazy load các components con
const AiDashboardContent = lazy(() => import("./AiDashboard").then(m => ({ default: m.default })));
const AiModelTrainingContent = lazy(() => import("./AiModelTraining").then(m => ({ default: m.default })));
const AiNaturalLanguageContent = lazy(() => import("./AiNaturalLanguage").then(m => ({ default: m.default })));
const AiPredictiveContent = lazy(() => import("./AiPredictive").then(m => ({ default: m.default })));
const AiRootCauseContent = lazy(() => import("./AiRootCause").then(m => ({ default: m.default })));
const AiSpcAnalysisContent = lazy(() => import("./AiSpcAnalysis").then(m => ({ default: m.default })));
const AiVisionAnalysisContent = lazy(() => import("./AiVisionAnalysis").then(m => ({ default: m.default })));

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

export default function AiMasterDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: Brain, description: "Dashboard tổng quan AI" },
    { id: "training", label: "Huấn luyện", icon: LineChart, description: "Huấn luyện mô hình AI" },
    { id: "nlp", label: "Ngôn ngữ tự nhiên", icon: MessageSquare, description: "Xử lý ngôn ngữ tự nhiên" },
    { id: "predictive", label: "Dự đoán", icon: TrendingUp, description: "Phân tích dự đoán" },
    { id: "rootcause", label: "Nguyên nhân gốc", icon: Search, description: "Phân tích nguyên nhân gốc" },
    { id: "spc", label: "SPC Analysis", icon: BarChart3, description: "Phân tích SPC bằng AI" },
    { id: "vision", label: "Vision", icon: Eye, description: "Phân tích hình ảnh AI" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Master Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý toàn diện hệ thống AI - Huấn luyện, Dự đoán, Phân tích
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Brain className="w-4 h-4 mr-2" />
            AI System
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-7 gap-1 h-auto p-1">
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
              <AiDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiModelTrainingContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="nlp" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiNaturalLanguageContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiPredictiveContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="rootcause" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiRootCauseContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="spc" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiSpcAnalysisContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="vision" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AiVisionAnalysisContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
