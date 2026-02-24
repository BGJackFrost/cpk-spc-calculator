import { useState, useCallback, useMemo } from "react";
import AiVisionTrendChart from "@/components/AiVisionTrendChart";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, Upload, Camera, Zap, AlertTriangle, CheckCircle2, XCircle, Settings, History, 
  Image as ImageIcon, Loader2, Cpu, Target, Layers, Brain, GitCompare, Sparkles,
  Trash2, Info, FileDown, TrendingUp, Download
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  id: string;
  imageUrl: string;
  status: "pass" | "fail" | "warning";
  confidence: number;
  qualityScore: number;
  defects: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    location?: { x: number; y: number; width: number; height: number };
    confidence: number;
    description: string;
  }>;
  summary: string;
  recommendations: string[];
  processingTime: number;
  timestamp: Date;
  serialNumber?: string;
  machineId?: string;
}

interface CompareResult {
  similarity: number;
  differences: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    location?: { x: number; y: number };
  }>;
  overallResult: "match" | "mismatch" | "partial_match";
  summary: string;
  recommendations: string[];
}

const severityColors = {
  low: "border-blue-500 text-blue-500",
  medium: "border-yellow-500 text-yellow-500",
  high: "border-orange-500 text-orange-500",
  critical: "border-red-500 text-red-500",
};

const severityLabels = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

export default function AiVisionAnalysis() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [productType, setProductType] = useState("general");
  const [inspectionStandard, setInspectionStandard] = useState("IPC-A-610");
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  
  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  
  // History filter state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState<'pass' | 'fail' | 'warning' | undefined>(undefined);
  const [showDatabaseHistory, setShowDatabaseHistory] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [inspectionImageUrl, setInspectionImageUrl] = useState("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  // Batch mode state
  const [batchUrls, setBatchUrls] = useState<string[]>([]);
  const [newBatchUrl, setNewBatchUrl] = useState("");

  // Trend chart state
  const [trendDays, setTrendDays] = useState(30);
  const [trendGroupBy, setTrendGroupBy] = useState<"day" | "week" | "month">("day");
  const [showTrendChart, setShowTrendChart] = useState(false);

  // API mutations
  const analyzeMutation = trpc.vision.analyzeWithAI.useMutation({
    onSuccess: (data) => {
      const result: AnalysisResult = {
        id: `AN-${Date.now()}`,
        imageUrl: selectedImage || imageUrl,
        status: data.overallResult as "pass" | "fail" | "warning",
        confidence: data.defects.length > 0 ? data.defects.reduce((sum, d) => sum + d.confidence, 0) / data.defects.length : 0.95,
        qualityScore: data.qualityScore,
        defects: data.defects.map(d => ({
          type: d.type,
          severity: d.severity as "low" | "medium" | "high" | "critical",
          location: d.location,
          confidence: d.confidence,
          description: d.description,
        })),
        summary: data.summary,
        recommendations: data.recommendations,
        processingTime: data.processingTime,
        timestamp: new Date(),
        serialNumber: `SN${Date.now()}`,
      };
      
      setResults(prev => [result, ...prev].slice(0, 50));
      setSelectedResult(result);
      
      if (result.status === "fail") {
        toast({
          title: "Phát hiện lỗi nghiêm trọng!",
          description: `${result.defects.length} lỗi được phát hiện`,
          variant: "destructive",
        });
      } else if (result.status === "warning") {
        toast({
          title: "Phát hiện lỗi nhẹ",
          description: `${result.defects.length} lỗi cần kiểm tra`,
        });
      } else {
        toast({
          title: "Sản phẩm đạt chuẩn",
          description: `Điểm chất lượng: ${result.qualityScore}/100`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Lỗi phân tích",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeBatchMutation = trpc.vision.analyzeWithAIBatch.useMutation({
    onSuccess: (data) => {
      const newResults: AnalysisResult[] = data.results.map((r, index) => ({
        id: `AN-${Date.now()}-${index}`,
        imageUrl: batchUrls[index] || '',
        status: r.overallResult as "pass" | "fail" | "warning",
        confidence: r.defects.length > 0 ? r.defects.reduce((sum, d) => sum + d.confidence, 0) / r.defects.length : 0.95,
        qualityScore: r.qualityScore,
        defects: r.defects.map(d => ({
          type: d.type,
          severity: d.severity as "low" | "medium" | "high" | "critical",
          location: d.location,
          confidence: d.confidence,
          description: d.description,
        })),
        summary: r.summary,
        recommendations: r.recommendations,
        processingTime: r.processingTime,
        timestamp: new Date(),
        serialNumber: `SN${Date.now()}-${index}`,
      }));
      
      setResults(prev => [...newResults, ...prev].slice(0, 50));
      if (newResults.length > 0) {
        setSelectedResult(newResults[0]);
      }
      
      toast({
        title: "Phân tích batch hoàn tất",
        description: `Đã phân tích ${newResults.length} hình ảnh`,
      });
      
      setBatchUrls([]);
    },
    onError: (error) => {
      toast({
        title: "Lỗi phân tích batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const compareMutation = trpc.vision.compareWithAI.useMutation({
    onSuccess: (data) => {
      setCompareResult({
        similarity: data.similarity,
        differences: data.differences.map(d => ({
          type: d.type,
          description: d.description,
          severity: d.severity as "low" | "medium" | "high" | "critical",
          location: d.location,
        })),
        overallResult: data.overallResult as "match" | "mismatch" | "partial_match",
        summary: data.summary,
        recommendations: data.recommendations,
      });
      
      toast({
        title: "So sánh hoàn tất",
        description: `Độ tương đồng: ${data.similarity}%`,
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi so sánh",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadMutation = trpc.vision.uploadImage.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.url);
      setSelectedImage(data.url);
      toast({
        title: "Upload thành công",
        description: `Hình ảnh đã được tải lên: ${data.fileName}`,
      });
      if (autoAnalyze && data.url) {
        // Will analyze after upload completes
      }
    },
    onError: (error) => {
      toast({
        title: "Lỗi upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = analyzeMutation.isPending || analyzeBatchMutation.isPending || compareMutation.isPending || uploadMutation.isPending;

  // Query history from database
  const historyQuery = trpc.vision.getAnalysisHistory.useQuery({
    page: historyPage,
    pageSize: 20,
    status: historyStatus,
  }, {
    enabled: showDatabaseHistory,
  });

  // Query stats from database
  const statsQuery = trpc.vision.getAnalysisStats.useQuery({
    days: 30,
  }, {
    enabled: showDatabaseHistory,
  });

  // Query trend data
  const trendQuery = trpc.vision.getAnalysisTrend.useQuery({
    days: trendDays,
    groupBy: trendGroupBy,
  }, {
    enabled: showTrendChart,
  });

  // Export report mutation
  const exportMutation = trpc.vision.exportReport.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Generate and download file
        const format = data.data.format;
        if (format === 'excel') {
          // Generate CSV for Excel
          const headers = ['ID', 'Serial Number', 'Status', 'Quality Score', 'Defect Count', 'Analyzed At'];
          const rows = data.data.items.map((item: any) => [
            item.analysisId,
            item.serialNumber || '',
            item.status,
            item.qualityScore,
            item.defectCount,
            new Date(item.analyzedAt).toLocaleString('vi-VN'),
          ]);
          const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ai-vision-report-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          // Generate HTML for PDF
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>AI Vision Report</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                .stat { background: #f5f5f5; padding: 15px; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f0f0f0; }
                .pass { color: green; }
                .fail { color: red; }
                .warning { color: orange; }
              </style>
            </head>
            <body>
              <h1>Báo cáo AI Vision Analysis</h1>
              <p>Xuất ngày: ${new Date().toLocaleString('vi-VN')}</p>
              <p>Khoảng thời gian: ${data.data.days} ngày gần nhất</p>
              <div class="stats">
                <div class="stat"><strong>Tổng phân tích:</strong> ${data.data.stats.total}</div>
                <div class="stat"><strong>Đạt:</strong> ${data.data.stats.passCount}</div>
                <div class="stat"><strong>Lỗi:</strong> ${data.data.stats.failCount}</div>
                <div class="stat"><strong>Điểm TB:</strong> ${data.data.stats.avgQualityScore.toFixed(1)}</div>
              </div>
              <table>
                <thead>
                  <tr><th>ID</th><th>Serial</th><th>Trạng thái</th><th>Điểm</th><th>Lỗi</th><th>Thời gian</th></tr>
                </thead>
                <tbody>
                  ${data.data.items.map((item: any) => `
                    <tr>
                      <td>${item.analysisId}</td>
                      <td>${item.serialNumber || '-'}</td>
                      <td class="${item.status}">${item.status === 'pass' ? 'Đạt' : item.status === 'fail' ? 'Lỗi' : 'Cảnh báo'}</td>
                      <td>${item.qualityScore}</td>
                      <td>${item.defectCount}</td>
                      <td>${new Date(item.analyzedAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
            </html>
          `;
          const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ai-vision-report-${new Date().toISOString().split('T')[0]}.html`;
          link.click();
          URL.revokeObjectURL(url);
        }
        toast({
          title: "Xuất báo cáo thành công",
          description: `Đã xuất ${data.data.items.length} bản ghi`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Lỗi xuất báo cáo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeImage = useCallback((url: string) => {
    if (!url) {
      toast({
        title: "Thiếu URL hình ảnh",
        description: "Vui lòng nhập URL hình ảnh cần phân tích",
        variant: "destructive",
      });
      return;
    }
    
    analyzeMutation.mutate({
      imageUrl: url,
      productType,
      inspectionStandard,
      confidenceThreshold: confidenceThreshold / 100,
      language,
      saveToHistory: saveToDatabase,
    });
  }, [productType, inspectionStandard, confidenceThreshold, language, saveToDatabase, analyzeMutation, toast]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);
      
      // Upload to S3
      uploadMutation.mutate({
        base64Data: dataUrl,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSelectedImage(dataUrl);
        
        // Upload to S3
        uploadMutation.mutate({
          base64Data: dataUrl,
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
        });
      };
      reader.readAsDataURL(file);
    }
  }, [uploadMutation]);

  const handleAnalyzeBatch = useCallback(() => {
    if (batchUrls.length === 0) {
      toast({
        title: "Thiếu URL hình ảnh",
        description: "Vui lòng thêm ít nhất một URL hình ảnh",
        variant: "destructive",
      });
      return;
    }
    
    analyzeBatchMutation.mutate({
      imageUrls: batchUrls,
      productType,
      inspectionStandard,
      confidenceThreshold: confidenceThreshold / 100,
      language,
      saveToHistory: saveToDatabase,
    });
  }, [batchUrls, productType, inspectionStandard, confidenceThreshold, language, analyzeBatchMutation, toast]);

  const handleCompare = useCallback(() => {
    if (!referenceImageUrl || !inspectionImageUrl) {
      toast({
        title: "Thiếu URL hình ảnh",
        description: "Vui lòng nhập cả URL hình ảnh tham chiếu và hình ảnh kiểm tra",
        variant: "destructive",
      });
      return;
    }
    
    compareMutation.mutate({
      referenceImageUrl,
      inspectionImageUrl,
      productType,
      language,
    });
  }, [referenceImageUrl, inspectionImageUrl, productType, language, compareMutation, toast]);

  const addBatchUrl = useCallback(() => {
    if (newBatchUrl && batchUrls.length < 10) {
      setBatchUrls([...batchUrls, newBatchUrl]);
      setNewBatchUrl("");
    }
  }, [newBatchUrl, batchUrls]);

  const stats = useMemo(() => ({
    total: results.length,
    pass: results.filter(r => r.status === "pass").length,
    fail: results.filter(r => r.status === "fail").length,
    warning: results.filter(r => r.status === "warning").length,
    avgTime: results.length > 0 ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length : 0,
  }), [results]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              AI Vision Analysis
            </h1>
            <p className="text-muted-foreground mt-1">Phân tích hình ảnh tự động bằng AI LLM Vision</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-primary border-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              Powered by LLM Vision
            </Badge>
            <div className="flex items-center gap-2">
              <Switch checked={compareMode} onCheckedChange={setCompareMode} id="compare-mode" />
              <Label htmlFor="compare-mode">Chế độ so sánh</Label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tổng phân tích</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Đạt</p><p className="text-2xl font-bold text-green-500">{stats.pass}</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Lỗi</p><p className="text-2xl font-bold text-red-500">{stats.fail}</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cảnh báo</p><p className="text-2xl font-bold text-yellow-500">{stats.warning}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">TB xử lý</p><p className="text-2xl font-bold">{stats.avgTime.toFixed(0)}ms</p></CardContent></Card>
        </div>

        {compareMode ? (
          /* Compare Mode UI */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  So sánh hình ảnh
                </CardTitle>
                <CardDescription>So sánh hình ảnh kiểm tra với hình ảnh tham chiếu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hình ảnh tham chiếu (chuẩn)</Label>
                    <Input
                      placeholder="https://example.com/reference.jpg"
                      value={referenceImageUrl}
                      onChange={(e) => setReferenceImageUrl(e.target.value)}
                    />
                    {referenceImageUrl && (
                      <div className="border rounded-lg p-2">
                        <img
                          src={referenceImageUrl}
                          alt="Reference"
                          className="max-h-40 rounded object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x150?text=Invalid+URL";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Hình ảnh kiểm tra</Label>
                    <Input
                      placeholder="https://example.com/inspection.jpg"
                      value={inspectionImageUrl}
                      onChange={(e) => setInspectionImageUrl(e.target.value)}
                    />
                    {inspectionImageUrl && (
                      <div className="border rounded-lg p-2">
                        <img
                          src={inspectionImageUrl}
                          alt="Inspection"
                          className="max-h-40 rounded object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x150?text=Invalid+URL";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCompare}
                  disabled={isLoading || !referenceImageUrl || !inspectionImageUrl}
                  className="w-full"
                >
                  {compareMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <GitCompare className="h-4 w-4 mr-2" />
                  )}
                  So sánh hình ảnh
                </Button>

                {compareResult && (
                  <div className="space-y-4 pt-4">
                    <Separator />
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Kết quả so sánh</h3>
                      <Badge
                        className={
                          compareResult.overallResult === "match"
                            ? "bg-green-500"
                            : compareResult.overallResult === "mismatch"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }
                      >
                        {compareResult.overallResult === "match"
                          ? "Khớp"
                          : compareResult.overallResult === "mismatch"
                          ? "Không khớp"
                          : "Khớp một phần"}
                      </Badge>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Độ tương đồng</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold">{compareResult.similarity}%</p>
                      </div>
                      <Progress value={compareResult.similarity} className="mt-2" />
                    </div>

                    <div className="space-y-2">
                      <Label>Tóm tắt</Label>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {compareResult.summary}
                      </p>
                    </div>

                    {compareResult.differences.length > 0 && (
                      <div className="space-y-2">
                        <Label>Điểm khác biệt ({compareResult.differences.length})</Label>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {compareResult.differences.map((diff, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{diff.type}</span>
                                  <Badge variant="outline" className={severityColors[diff.severity]}>
                                    {severityLabels[diff.severity]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{diff.description}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Cấu hình</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Loại sản phẩm</Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Chung</SelectItem>
                      <SelectItem value="pcb">PCB/Mạch điện tử</SelectItem>
                      <SelectItem value="metal">Kim loại</SelectItem>
                      <SelectItem value="plastic">Nhựa</SelectItem>
                      <SelectItem value="glass">Kính/Thủy tinh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ngôn ngữ kết quả</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "vi" | "en")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Normal Analysis Mode UI */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Phân tích hình ảnh</CardTitle></CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="upload">Tải lên</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="batch">Batch</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isLoading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {isLoading ? (
                        <div className="space-y-4">
                          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                          <p className="text-lg font-medium">Đang phân tích...</p>
                        </div>
                      ) : selectedImage ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <img src={selectedImage} alt="Selected" className="max-h-64 rounded-lg mx-auto" />
                            {selectedResult && selectedResult.defects.map((defect, i) => (
                              defect.location && (
                                <div
                                  key={i}
                                  className={`absolute border-2 ${defect.severity === "critical" ? "border-red-500" : defect.severity === "high" ? "border-orange-500" : defect.severity === "medium" ? "border-yellow-500" : "border-blue-500"}`}
                                  style={{ left: `${defect.location.x}%`, top: `${defect.location.y}%`, width: `${defect.location.width}%`, height: `${defect.location.height}%` }}
                                />
                              )
                            ))}
                          </div>
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" onClick={() => { setSelectedImage(null); setSelectedResult(null); }}>Xóa</Button>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <p className="text-xs text-muted-foreground">
                                Để phân tích với AI, vui lòng sử dụng tab URL và nhập đường dẫn hình ảnh trực tiếp.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-lg font-medium">Kéo thả hình ảnh vào đây</p>
                            <p className="text-sm text-muted-foreground">hoặc click để chọn file</p>
                          </div>
                          <Input type="file" accept="image/*" onChange={handleImageUpload} className="max-w-xs mx-auto" />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="url">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nhập URL hình ảnh..." 
                          className="flex-1" 
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                        <Button onClick={() => analyzeImage(imageUrl)} disabled={isLoading || !imageUrl}>
                          {analyzeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Brain className="h-4 w-4 mr-2" />
                          )}
                          Phân tích
                        </Button>
                      </div>
                      {imageUrl && (
                        <div className="border rounded-lg p-4">
                          <Label className="text-sm text-muted-foreground mb-2 block">Xem trước</Label>
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="max-h-48 rounded-lg object-contain mx-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Invalid+URL";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="batch">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nhập URL hình ảnh..." 
                          className="flex-1" 
                          value={newBatchUrl}
                          onChange={(e) => setNewBatchUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addBatchUrl()}
                        />
                        <Button onClick={addBatchUrl} disabled={batchUrls.length >= 10}>
                          <Upload className="h-4 w-4 mr-2" />
                          Thêm
                        </Button>
                      </div>
                      
                      {batchUrls.length > 0 && (
                        <div className="space-y-2">
                          <Label>Danh sách hình ảnh ({batchUrls.length}/10)</Label>
                          <ScrollArea className="h-32">
                            <div className="space-y-2">
                              {batchUrls.map((url, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                  <span className="text-sm truncate flex-1 mr-2">{url}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setBatchUrls(batchUrls.filter((_, i) => i !== index))}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      <Button
                        onClick={handleAnalyzeBatch}
                        disabled={isLoading || batchUrls.length === 0}
                        className="w-full"
                      >
                        {analyzeBatchMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        Phân tích {batchUrls.length} hình ảnh
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Kết quả</CardTitle></CardHeader>
              <CardContent>
                {selectedResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className={selectedResult.status === "pass" ? "bg-green-500" : selectedResult.status === "fail" ? "bg-red-500" : "bg-yellow-500"}>
                        {selectedResult.status === "pass" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : selectedResult.status === "fail" ? <XCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        {selectedResult.status === "pass" ? "Đạt" : selectedResult.status === "fail" ? "Lỗi" : "Cảnh báo"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{selectedResult.processingTime.toFixed(0)}ms</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">Điểm chất lượng</span><span className="font-medium">{selectedResult.qualityScore}/100</span></div>
                      <Progress value={selectedResult.qualityScore} className="h-2" />
                      <div className="flex justify-between"><span className="text-muted-foreground">Số lỗi</span><span className="font-medium">{selectedResult.defects.length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Serial</span><span className="font-mono text-sm">{selectedResult.serialNumber}</span></div>
                    </div>
                    
                    {selectedResult.summary && (
                      <div className="space-y-1">
                        <Label className="text-sm">Tóm tắt</Label>
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{selectedResult.summary}</p>
                      </div>
                    )}
                    
                    {selectedResult.defects.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Chi tiết lỗi:</h4>
                        <ScrollArea className="h-32">
                          {selectedResult.defects.map((defect, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-2">
                              <div>
                                <p className="text-sm font-medium">{defect.type}</p>
                                <p className="text-xs text-muted-foreground">{(defect.confidence * 100).toFixed(0)}% tin cậy</p>
                              </div>
                              <Badge variant="outline" className={severityColors[defect.severity]}>
                                {severityLabels[defect.severity]}
                              </Badge>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    {selectedResult.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-sm">Khuyến nghị</Label>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {selectedResult.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Chưa có kết quả phân tích</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Lịch sử phân tích</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Từ Database</Label>
                  <Switch checked={showDatabaseHistory} onCheckedChange={setShowDatabaseHistory} />
                </div>
              </div>
              {showDatabaseHistory && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Select value={historyStatus || 'all'} onValueChange={(v) => setHistoryStatus(v === 'all' ? undefined : v as any)}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pass">Đạt</SelectItem>
                      <SelectItem value="fail">Lỗi</SelectItem>
                      <SelectItem value="warning">Cảnh báo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTrendChart(!showTrendChart)}
                    className="gap-1"
                  >
                    <TrendingUp className="h-4 w-4" />
                    {showTrendChart ? "Ẩn biểu đồ" : "Xem xu hướng"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMutation.mutate({ format: 'excel', days: 30, status: historyStatus })}
                    disabled={exportMutation.isPending}
                    className="gap-1"
                  >
                    <FileDown className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMutation.mutate({ format: 'pdf', days: 30, status: historyStatus })}
                    disabled={exportMutation.isPending}
                    className="gap-1"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {showDatabaseHistory ? (
                  historyQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : historyQuery.data?.items && historyQuery.data.items.length > 0 ? (
                    <div className="space-y-2">
                      {historyQuery.data.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setSelectedResult({
                              id: item.analysisId,
                              imageUrl: item.imageUrl,
                              status: item.status,
                              confidence: item.confidence,
                              qualityScore: item.qualityScore,
                              defects: item.defects || [],
                              summary: item.summary || '',
                              recommendations: item.recommendations || [],
                              processingTime: item.processingTimeMs,
                              timestamp: new Date(item.analyzedAt),
                              serialNumber: item.serialNumber,
                            });
                            setSelectedImage(item.imageUrl);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.status === "pass" ? "bg-green-500" : item.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                            <div>
                              <p className="text-sm font-medium">{item.serialNumber || item.analysisId}</p>
                              <p className="text-xs text-muted-foreground">{new Date(item.analyzedAt).toLocaleString("vi-VN")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">{item.defectCount} lỗi</Badge>
                            <p className="text-xs text-muted-foreground mt-1">Q: {item.qualityScore}</p>
                          </div>
                        </div>
                      ))}
                      {historyQuery.data.totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={historyPage <= 1}
                            onClick={() => setHistoryPage(p => p - 1)}
                          >
                            Trước
                          </Button>
                          <span className="text-sm py-1">{historyPage}/{historyQuery.data.totalPages}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={historyPage >= historyQuery.data.totalPages}
                            onClick={() => setHistoryPage(p => p + 1)}
                          >
                            Sau
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử trong database</div>
                  )
                ) : results.length > 0 ? (
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedResult?.id === result.id ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"}`}
                        onClick={() => { setSelectedResult(result); setSelectedImage(result.imageUrl); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${result.status === "pass" ? "bg-green-500" : result.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                          <div>
                            <p className="text-sm font-medium">{result.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">{result.timestamp.toLocaleTimeString("vi-VN")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{result.defects.length} lỗi</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{result.processingTime.toFixed(0)}ms</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử phân tích</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Cấu hình</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Ngưỡng độ tin cậy (%)</Label>
                <Slider value={[confidenceThreshold]} onValueChange={([v]) => setConfidenceThreshold(v)} min={50} max={99} step={1} />
                <p className="text-sm text-muted-foreground">{confidenceThreshold}%</p>
              </div>
              <div className="space-y-2">
                <Label>Loại sản phẩm</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Chung</SelectItem>
                    <SelectItem value="pcb">PCB/Mạch điện tử</SelectItem>
                    <SelectItem value="metal">Kim loại</SelectItem>
                    <SelectItem value="plastic">Nhựa</SelectItem>
                    <SelectItem value="glass">Kính/Thủy tinh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tiêu chuẩn kiểm tra</Label>
                <Select value={inspectionStandard} onValueChange={setInspectionStandard}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPC-A-610">IPC-A-610</SelectItem>
                    <SelectItem value="ISO-9001">ISO 9001</SelectItem>
                    <SelectItem value="IATF-16949">IATF 16949</SelectItem>
                    <SelectItem value="custom">Tùy chỉnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Tự động phân tích khi tải hình</Label>
                <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Lưu kết quả vào database</Label>
                <Switch checked={saveToDatabase} onCheckedChange={setSaveToDatabase} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart Section */}
        {showTrendChart && showDatabaseHistory && (
          <div className="mt-6">
            <AiVisionTrendChart
              trendData={trendQuery.data?.trendData || []}
              summary={trendQuery.data?.summary || { totalAnalyses: 0, avgPassRate: 0, avgQualityScore: 0 }}
              isLoading={trendQuery.isLoading}
              days={trendDays}
              groupBy={trendGroupBy}
              onDaysChange={setTrendDays}
              onGroupByChange={setTrendGroupBy}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
