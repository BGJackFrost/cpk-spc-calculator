import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Brain, GitBranch, AlertTriangle, Target,
  CheckCircle, Lightbulb, RefreshCw, Download,
  ChevronRight, Loader2, Settings, Users,
  Thermometer, Gauge, BarChart3, ArrowRight,
} from "lucide-react";

// 5M1E Categories
const categories5M1E = [
  { id: "man", name: "Man (Người)", nameEn: "Man", icon: Users, color: "text-blue-500", bgColor: "bg-blue-50" },
  { id: "machine", name: "Machine (Máy)", nameEn: "Machine", icon: Settings, color: "text-orange-500", bgColor: "bg-orange-50" },
  { id: "material", name: "Material (Vật liệu)", nameEn: "Material", icon: BarChart3, color: "text-green-500", bgColor: "bg-green-50" },
  { id: "method", name: "Method (Phương pháp)", nameEn: "Method", icon: GitBranch, color: "text-purple-500", bgColor: "bg-purple-50" },
  { id: "measurement", name: "Measurement (Đo lường)", nameEn: "Measurement", icon: Gauge, color: "text-cyan-500", bgColor: "bg-cyan-50" },
  { id: "environment", name: "Environment (Môi trường)", nameEn: "Environment", icon: Thermometer, color: "text-yellow-500", bgColor: "bg-yellow-50" },
];

interface RootCause {
  id: string;
  category: string;
  title: string;
  description: string;
  probability: number;
  impact: string;
  evidence: string[];
  recommendations: string[];
  relatedFactors: string[];
}

interface CausalChain {
  id: string;
  name: string;
  steps: { factor: string; description: string; category: string }[];
  confidence: number;
}

export default function AiRootCause() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [selectedProblem, setSelectedProblem] = useState<"cpk_decline" | "high_variation" | "out_of_spec" | "trend_shift">("cpk_decline");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [causalChains, setCausalChains] = useState<CausalChain[]>([]);
  const [dataContext, setDataContext] = useState<any>(null);

  const analyzeMutation = trpc.aiRootCause.analyze.useMutation({
    onSuccess: (data) => {
      setRootCauses(data.rootCauses);
      setCausalChains(data.causalChains);
      setDataContext(data.dataContext);
      toast.success(isVi ? "Phân tích nguyên nhân hoàn tất" : "Root cause analysis complete");
    },
    onError: (err) => {
      toast.error(isVi ? `Lỗi phân tích: ${err.message}` : `Analysis error: ${err.message}`);
    },
  });

  const runAnalysis = () => {
    analyzeMutation.mutate({
      problemType: selectedProblem,
      timeRange,
    });
  };

  const filteredCauses = selectedCategory === "all"
    ? rootCauses
    : rootCauses.filter(rc => rc.category === selectedCategory);

  const sortedCauses = [...filteredCauses].sort((a, b) => b.probability - a.probability);

  const getCategoryInfo = (categoryId: string) => {
    return categories5M1E.find(c => c.id === categoryId) || categories5M1E[0];
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-orange-500" />
              {isVi ? "Phân tích Nguyên nhân Gốc rễ (Causal AI)" : "Root Cause Analysis (Causal AI)"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi
                ? "Phân tích nguyên nhân gốc rễ tự động với phương pháp 5M1E và Causal AI"
                : "Automatic root cause analysis with 5M1E methodology and Causal AI"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info(isVi ? "Chức năng đang phát triển" : "Feature coming soon")}>
              <Download className="h-4 w-4 mr-2" />
              {isVi ? "Xuất báo cáo" : "Export Report"}
            </Button>
          </div>
        </div>

        {/* Problem Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isVi ? "Chọn vấn đề cần phân tích" : "Select Problem to Analyze"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedProblem} onValueChange={(v: any) => setSelectedProblem(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={isVi ? "Chọn vấn đề" : "Select problem"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpk_decline">CPK Decline (CPK giảm)</SelectItem>
                  <SelectItem value="high_variation">High Variation (Biến động cao)</SelectItem>
                  <SelectItem value="out_of_spec">Out of Spec (Ngoài spec)</SelectItem>
                  <SelectItem value="trend_shift">Trend Shift (Dịch chuyển xu hướng)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{isVi ? "7 ngày gần nhất" : "Last 7 days"}</SelectItem>
                  <SelectItem value="30d">{isVi ? "30 ngày gần nhất" : "Last 30 days"}</SelectItem>
                  <SelectItem value="90d">{isVi ? "90 ngày gần nhất" : "Last 90 days"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={isVi ? "Lọc theo 5M1E" : "Filter by 5M1E"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isVi ? "Tất cả" : "All Categories"}</SelectItem>
                  {categories5M1E.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isVi ? cat.name : cat.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={runAnalysis} disabled={analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isVi ? "Đang phân tích..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    {isVi ? "Chạy Causal AI" : "Run Causal AI"}
                  </>
                )}
              </Button>
            </div>
            {dataContext && (
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span>SPC records: {dataContext.spcRecords}</span>
                <span>OEE records: {dataContext.oeeRecords}</span>
                {dataContext.fallback && (
                  <Badge variant="outline" className="text-yellow-600">Fallback mode</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5M1E Category Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories5M1E.map(cat => {
            const catCount = rootCauses.filter(rc => rc.category === cat.id).length;
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === cat.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full ${cat.bgColor} flex items-center justify-center mb-2`}>
                    <Icon className={`h-6 w-6 ${cat.color}`} />
                  </div>
                  <div className="font-medium text-sm">{isVi ? cat.name.split(" ")[0] : cat.nameEn}</div>
                  <div className="text-2xl font-bold mt-1">{catCount}</div>
                  <div className="text-xs text-muted-foreground">{isVi ? "nguyên nhân" : "causes"}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state when no analysis run yet */}
        {rootCauses.length === 0 && !analyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isVi ? "Chưa có kết quả phân tích" : "No analysis results yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isVi
                  ? "Chọn vấn đề và nhấn 'Chạy Causal AI' để bắt đầu phân tích nguyên nhân gốc rễ"
                  : "Select a problem and click 'Run Causal AI' to start root cause analysis"}
              </p>
              <Button onClick={runAnalysis}>
                <Brain className="h-4 w-4 mr-2" />
                {isVi ? "Chạy Causal AI" : "Run Causal AI"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {rootCauses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Root Causes List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                {isVi ? "Nguyên nhân gốc rễ được xác định" : "Identified Root Causes"}
                <Badge variant="secondary">{sortedCauses.length}</Badge>
              </h2>

              {sortedCauses.map((cause, index) => {
                const catInfo = getCategoryInfo(cause.category);
                const CatIcon = catInfo.icon;

                return (
                  <Card key={cause.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${catInfo.bgColor} flex items-center justify-center`}>
                            <CatIcon className={`h-5 w-5 ${catInfo.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <span className="text-muted-foreground">#{index + 1}</span>
                              {cause.title}
                            </CardTitle>
                            <CardDescription>{cause.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getImpactColor(cause.impact)}>
                            {cause.impact.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {(cause.probability * 100).toFixed(0)}% {isVi ? "xác suất" : "probability"}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <Progress value={cause.probability * 100} className="h-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {isVi ? "Bằng chứng" : "Evidence"}
                          </h4>
                          <ul className="space-y-1">
                            {cause.evidence.map((ev, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-1">
                                <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0" />
                                {ev}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            {isVi ? "Khuyến nghị" : "Recommendations"}
                          </h4>
                          <ul className="space-y-1">
                            {cause.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-1">
                                <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0 text-primary" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground mr-2">
                          {isVi ? "Yếu tố liên quan:" : "Related factors:"}
                        </span>
                        {cause.relatedFactors.map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="mr-1 mb-1">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Causal Chains */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {isVi ? "Chuỗi nhân quả" : "Causal Chains"}
              </h2>

              {causalChains.map(chain => (
                <Card key={chain.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{chain.name}</CardTitle>
                      <Badge variant="secondary">
                        {(chain.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {chain.steps.map((step, idx) => {
                        const catInfo = getCategoryInfo(step.category);
                        const CatIcon = catInfo.icon;
                        const isLast = idx === chain.steps.length - 1;

                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${catInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                              <CatIcon className={`h-4 w-4 ${catInfo.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{step.factor}</div>
                              <div className="text-xs text-muted-foreground">{step.description}</div>
                            </div>
                            {!isLast && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {isVi ? "Tổng kết" : "Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isVi ? "Tổng nguyên nhân" : "Total Causes"}
                    </span>
                    <span className="font-bold">{rootCauses.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isVi ? "Nguyên nhân chính" : "Primary Cause"}
                    </span>
                    <span className="font-bold text-orange-600">
                      {rootCauses[0]?.title?.split(" - ")[0] || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isVi ? "Độ tin cậy" : "Confidence"}
                    </span>
                    <span className="font-bold text-green-600">
                      {rootCauses[0] ? `${(rootCauses[0].probability * 100).toFixed(0)}%` : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {isVi ? "Chuỗi nhân quả" : "Causal Chains"}
                    </span>
                    <span className="font-bold">{causalChains.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
