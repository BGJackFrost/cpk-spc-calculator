import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  RefreshCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  MessageSquare,
  Send,
  Loader2,
  ArrowRight,
  Gauge,
  BarChart3,
  Minus,
  Zap,
  Clock,
  FileText,
  Download,
  ChevronRight,
} from "lucide-react";

// Types
interface SpcMetrics {
  mean: number;
  stdDev: number;
  cp: number;
  cpk: number;
  pp?: number;
  ppk?: number;
  usl: number;
  lsl: number;
  ucl: number;
  lcl: number;
  sampleSize: number;
}

interface AiRecommendation {
  id: string;
  title: string;
  description: string;
  category: "process" | "equipment" | "material" | "operator" | "environment" | "measurement";
  priority: "low" | "medium" | "high" | "critical";
  expectedImpact: string;
  estimatedEffort: "low" | "medium" | "high";
  relatedRules?: string[];
}

interface AiAnalysisResult {
  summary: string;
  healthScore: number;
  processHealth: "excellent" | "good" | "warning" | "critical";
  keyFindings: string[];
  rootCauseAnalysis: string[];
  recommendations: AiRecommendation[];
  trendPrediction: {
    direction: "improving" | "stable" | "declining";
    confidence: number;
    predictedCpk7Days?: number;
  };
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Category icons and colors
const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  process: { icon: Activity, color: "text-blue-500", label: "Quy trình" },
  equipment: { icon: Gauge, color: "text-orange-500", label: "Thiết bị" },
  material: { icon: BarChart3, color: "text-green-500", label: "Nguyên liệu" },
  operator: { icon: Target, color: "text-purple-500", label: "Vận hành" },
  environment: { icon: Zap, color: "text-yellow-500", label: "Môi trường" },
  measurement: { icon: Target, color: "text-cyan-500", label: "Đo lường" },
};

// Priority badge colors
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

// Health colors
const healthColors: Record<string, { bg: string; text: string; border: string }> = {
  excellent: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  good: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  warning: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

// Trend icons
function TrendIcon({ direction }: { direction: "improving" | "stable" | "declining" }) {
  if (direction === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (direction === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
}

export default function AiSpcAnalysis() {
  const { language } = useLanguage();
  const isVi = language === "vi";

  // State
  const [selectedProductionLine, setSelectedProductionLine] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Queries
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: stations } = trpc.workstation.list.useQuery();

  // AI Analysis mutation
  const aiAnalysisMutation = trpc.ai.analyzeSpc.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success(isVi ? "Phân tích AI hoàn tất" : "AI Analysis Complete");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // AI Chat mutation
  const aiChatMutation = trpc.ai.chatAboutSpc.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedProductionLine || !selectedProduct || !selectedStation) {
      toast.error(isVi ? "Vui lòng chọn đầy đủ thông tin" : "Please select all fields");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Get mock metrics for demo - in production, fetch from actual SPC data
      // Mock data removed - mockMetrics (data comes from tRPC or is not yet implemented)
      // Mock data removed - mockViolations (data comes from tRPC or is not yet implemented)
      // Mock data removed - mockRecentData (data comes from tRPC or is not yet implemented)
      
      await aiAnalysisMutation.mutateAsync({
        productCode: selectedProduct,
        stationName: selectedStation,
        metrics: mockMetrics,
        recentData: mockRecentData,
        violations: mockViolations,
        historicalCpk: [1.28, 1.30, 1.32, 1.29, 1.33, 1.31, 1.32],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !analysisResult) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      const response = await aiChatMutation.mutateAsync({
        question: chatInput,
        context: {
          productCode: selectedProduct,
          stationName: selectedStation,
          cpk: analysisResult.healthScore / 100 * 2,
          mean: 50.5,
          stdDev: 2.1,
          violations: analysisResult.keyFindings,
        },
      });
      
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-violet-500" />
              {isVi ? "Phân tích SPC với AI" : "AI SPC Analysis"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi
                ? "Phân tích SPC nâng cao sử dụng LLM với phương pháp 5M1E"
                : "Advanced SPC analysis using LLM with 5M1E methodology"}
            </p>
          </div>
        </div>

        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isVi ? "Chọn dữ liệu phân tích" : "Select Analysis Data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Dây chuyền" : "Production Line"}
                </label>
                <Select value={selectedProductionLine} onValueChange={setSelectedProductionLine}>
                  <SelectTrigger>
                    <SelectValue placeholder={isVi ? "Chọn dây chuyền" : "Select line"} />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Sản phẩm" : "Product"}
                </label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder={isVi ? "Chọn sản phẩm" : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Trạm đo" : "Station"}
                </label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder={isVi ? "Chọn trạm" : "Select station"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !selectedProductionLine || !selectedProduct || !selectedStation}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isVi ? "Đang phân tích..." : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      {isVi ? "Phân tích AI" : "Run AI Analysis"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Analysis */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <Card className={`${healthColors[analysisResult.processHealth].bg} ${healthColors[analysisResult.processHealth].border} border-2`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {isVi ? "Tóm tắt phân tích" : "Analysis Summary"}
                    </CardTitle>
                    <Badge className={healthColors[analysisResult.processHealth].text}>
                      {analysisResult.processHealth.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg mb-4">{analysisResult.summary}</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold">{analysisResult.healthScore}</div>
                      <div className="text-sm text-muted-foreground">
                        {isVi ? "Điểm sức khỏe" : "Health Score"}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <TrendIcon direction={analysisResult.trendPrediction.direction} />
                        <span className="text-2xl font-bold capitalize">
                          {analysisResult.trendPrediction.direction}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isVi ? "Xu hướng" : "Trend"}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold capitalize">
                        {analysisResult.riskAssessment.level}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isVi ? "Mức rủi ro" : "Risk Level"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Findings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    {isVi ? "Phát hiện chính" : "Key Findings"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.keyFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-1 text-primary" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Root Cause Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    {isVi ? "Phân tích nguyên nhân gốc rễ" : "Root Cause Analysis"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.rootCauseAnalysis.map((cause, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                        <AlertTriangle className="h-4 w-4 mt-1 text-orange-500" />
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    {isVi ? "Khuyến nghị cải tiến (5M1E)" : "Improvement Recommendations (5M1E)"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.recommendations.map((rec) => {
                      const config = categoryConfig[rec.category];
                      const Icon = config?.icon || Activity;
                      
                      return (
                        <div key={rec.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${config?.color}`} />
                              <h4 className="font-semibold">{rec.title}</h4>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={priorityColors[rec.priority]}>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">{config?.label}</Badge>
                            </div>
                          </div>
                          <p className="text-muted-foreground mb-3">{rec.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {isVi ? "Tác động:" : "Impact:"} {rec.expectedImpact}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {isVi ? "Nỗ lực:" : "Effort:"} {rec.estimatedEffort}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Chat Sidebar */}
            <div className="space-y-6">
              {/* Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    {isVi ? "Yếu tố rủi ro" : "Risk Factors"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.riskAssessment.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 mt-0.5 text-red-500" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Trend Prediction */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    {isVi ? "Dự báo xu hướng" : "Trend Prediction"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>{isVi ? "Hướng" : "Direction"}</span>
                      <div className="flex items-center gap-2">
                        <TrendIcon direction={analysisResult.trendPrediction.direction} />
                        <span className="capitalize">{analysisResult.trendPrediction.direction}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{isVi ? "Độ tin cậy" : "Confidence"}</span>
                      <span>{(analysisResult.trendPrediction.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={analysisResult.trendPrediction.confidence * 100} />
                    {analysisResult.trendPrediction.predictedCpk7Days && (
                      <div className="flex items-center justify-between">
                        <span>{isVi ? "CPK dự báo (7 ngày)" : "Predicted CPK (7 days)"}</span>
                        <span className="font-bold">
                          {analysisResult.trendPrediction.predictedCpk7Days.toFixed(3)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Chat */}
              <Card className="h-[400px] flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-violet-500" />
                    {isVi ? "Hỏi đáp AI" : "AI Chat"}
                  </CardTitle>
                  <CardDescription>
                    {isVi ? "Hỏi AI về kết quả phân tích" : "Ask AI about the analysis"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          {isVi
                            ? "Hãy hỏi AI về kết quả phân tích SPC"
                            : "Ask AI about the SPC analysis results"}
                        </div>
                      )}
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {isSendingChat && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-3 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isVi ? "Nhập câu hỏi..." : "Type your question..."}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isSendingChat}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analysisResult && !isAnalyzing && (
          <Card className="p-12">
            <div className="text-center">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {isVi ? "Chưa có dữ liệu phân tích" : "No Analysis Data"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isVi
                  ? "Chọn dây chuyền, sản phẩm và trạm đo để bắt đầu phân tích AI"
                  : "Select production line, product and station to start AI analysis"}
              </p>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="p-12">
            <div className="text-center">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {isVi ? "Đang phân tích với AI..." : "Analyzing with AI..."}
              </h3>
              <p className="text-muted-foreground">
                {isVi
                  ? "AI đang phân tích dữ liệu SPC và tạo khuyến nghị theo phương pháp 5M1E"
                  : "AI is analyzing SPC data and generating 5M1E recommendations"}
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
