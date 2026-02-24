import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Wrench,
  Users,
  Leaf,
  Ruler,
  Package,
  Settings,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SpcDataPoint {
  value: number;
  timestamp: Date;
  isViolation?: boolean;
  violationRules?: string[];
}

interface SpcViolation {
  rule: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedPoints: number[];
}

interface AiRecommendationsProps {
  productCode: string;
  stationName: string;
  metrics: SpcMetrics;
  recentData: SpcDataPoint[];
  violations: SpcViolation[];
  historicalCpk?: number[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  process: <Settings className="h-4 w-4" />,
  equipment: <Wrench className="h-4 w-4" />,
  material: <Package className="h-4 w-4" />,
  operator: <Users className="h-4 w-4" />,
  environment: <Leaf className="h-4 w-4" />,
  measurement: <Ruler className="h-4 w-4" />,
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const healthColors: Record<string, string> = {
  excellent: "text-green-600",
  good: "text-blue-600",
  warning: "text-yellow-600",
  critical: "text-red-600",
};

export function AiRecommendations({
  productCode,
  stationName,
  metrics,
  recentData,
  violations,
  historicalCpk,
}: AiRecommendationsProps) {
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [expandedRecs, setExpandedRecs] = useState<Set<string>>(new Set());

  // AI Analysis mutation
  const analyzeMutation = trpc.ai.analyzeSpc.useMutation();

  // Chat mutation
  const chatMutation = trpc.ai.chatAboutSpc.useMutation({
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: "assistant", content: data.answer }]);
    },
  });

  // Quick insights query
  const { data: quickInsights } = trpc.ai.analytics.getQuickInsights.useQuery(metrics);

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      productCode,
      stationName,
      metrics,
      recentData,
      violations,
      historicalCpk,
    });
  };

  const handleSendChat = () => {
    if (!chatQuestion.trim()) return;

    setChatHistory((prev) => [...prev, { role: "user", content: chatQuestion }]);
    chatMutation.mutate({
      question: chatQuestion,
      context: {
        productCode,
        stationName,
        cpk: metrics.cpk,
        mean: metrics.mean,
        stdDev: metrics.stdDev,
        violations: violations.map((v) => v.rule),
      },
    });
    setChatQuestion("");
  };

  const toggleRecExpand = (id: string) => {
    setExpandedRecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const analysis = analyzeMutation.data;

  return (
    <div className="space-y-6">
      {/* Quick Insights */}
      {quickInsights && (quickInsights.insights.length > 0 || quickInsights.alerts.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Nhận định nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickInsights.insights.map((insight, idx) => (
                <div key={`insight-${idx}`} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{insight}</span>
                </div>
              ))}
              {quickInsights.alerts.map((alert, idx) => (
                <div key={`alert-${idx}`} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-700 dark:text-yellow-400">{alert}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Button */}
      {!analysis && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Phân tích AI</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sử dụng AI để phân tích sâu dữ liệu SPC và nhận khuyến nghị cải tiến
                </p>
              </div>
              <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Bắt đầu phân tích
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="recommendations">Khuyến nghị</TabsTrigger>
            <TabsTrigger value="risk">Rủi ro</TabsTrigger>
            <TabsTrigger value="chat">Hỏi AI</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Health Score */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sức khỏe quy trình</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={analysis.healthScore} className="h-3" />
                  </div>
                  <div className={cn("text-2xl font-bold", healthColors[analysis.processHealth])}>
                    {analysis.healthScore}%
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{analysis.summary}</p>
              </CardContent>
            </Card>

            {/* Key Findings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Phát hiện chính
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Root Cause Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Phân tích nguyên nhân gốc rễ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.rootCauseAnalysis.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Trend Prediction */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {analysis.trendPrediction.direction === "improving" ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : analysis.trendPrediction.direction === "declining" ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-yellow-500" />
                  )}
                  Dự đoán xu hướng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {analysis.trendPrediction.direction === "improving"
                        ? "Cải thiện"
                        : analysis.trendPrediction.direction === "declining"
                        ? "Giảm sút"
                        : "Ổn định"}
                    </div>
                    <div className="text-sm text-muted-foreground">Xu hướng</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {(analysis.trendPrediction.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Độ tin cậy</div>
                  </div>
                  {analysis.trendPrediction.predictedCpk7Days && (
                    <div>
                      <div className="text-2xl font-bold">
                        {analysis.trendPrediction.predictedCpk7Days.toFixed(3)}
                      </div>
                      <div className="text-sm text-muted-foreground">CPK dự đoán (7 ngày)</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {analysis.recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {categoryIcons[rec.category]}
                      <CardTitle className="text-base">{rec.title}</CardTitle>
                    </div>
                    <Badge className={priorityColors[rec.priority]}>
                      {rec.priority === "critical"
                        ? "Khẩn cấp"
                        : rec.priority === "high"
                        ? "Cao"
                        : rec.priority === "medium"
                        ? "Trung bình"
                        : "Thấp"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full justify-between"
                    onClick={() => toggleRecExpand(rec.id)}
                  >
                    <span>Chi tiết</span>
                    {expandedRecs.has(rec.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {expandedRecs.has(rec.id) && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Tác động dự kiến:</span>{" "}
                        <span className="text-muted-foreground">{rec.expectedImpact}</span>
                      </div>
                      <div>
                        <span className="font-medium">Mức độ nỗ lực:</span>{" "}
                        <span className="text-muted-foreground">
                          {rec.estimatedEffort === "low"
                            ? "Thấp"
                            : rec.estimatedEffort === "medium"
                            ? "Trung bình"
                            : "Cao"}
                        </span>
                      </div>
                      {rec.relatedRules && rec.relatedRules.length > 0 && (
                        <div>
                          <span className="font-medium">Rules liên quan:</span>{" "}
                          <span className="text-muted-foreground">{rec.relatedRules.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      analysis.riskAssessment.level === "critical"
                        ? "text-red-500"
                        : analysis.riskAssessment.level === "high"
                        ? "text-orange-500"
                        : analysis.riskAssessment.level === "medium"
                        ? "text-yellow-500"
                        : "text-green-500"
                    )}
                  />
                  Đánh giá rủi ro
                </CardTitle>
                <CardDescription>
                  Mức độ:{" "}
                  <Badge className={priorityColors[analysis.riskAssessment.level]}>
                    {analysis.riskAssessment.level === "critical"
                      ? "Nghiêm trọng"
                      : analysis.riskAssessment.level === "high"
                      ? "Cao"
                      : analysis.riskAssessment.level === "medium"
                      ? "Trung bình"
                      : "Thấp"}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-medium">Các yếu tố rủi ro:</h4>
                  <ul className="space-y-2">
                    {analysis.riskAssessment.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Hỏi AI về SPC
                </CardTitle>
                <CardDescription>
                  Đặt câu hỏi về dữ liệu SPC, quy trình hoặc cách cải tiến
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chat History */}
                {chatHistory.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto p-3 bg-muted/50 rounded-lg">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground ml-8"
                            : "bg-background mr-8 border"
                        )}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI đang suy nghĩ...
                      </div>
                    )}
                  </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ví dụ: Làm thế nào để cải thiện CPK từ 1.2 lên 1.5?"
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={!chatQuestion.trim() || chatMutation.isPending}
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Câu hỏi gợi ý:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Nguyên nhân CPK thấp là gì?",
                      "Cách giảm biến động quy trình?",
                      "Giải thích Rule 2 của SPC",
                      "So sánh CP và CPK",
                    ].map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setChatQuestion(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {analyzeMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Error State */}
      {analyzeMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi phân tích</AlertTitle>
          <AlertDescription>
            Không thể hoàn thành phân tích AI. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default AiRecommendations;
