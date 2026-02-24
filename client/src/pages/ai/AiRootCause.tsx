import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, Search, AlertTriangle, CheckCircle, Lightbulb,
  Factory, Users, Wrench, Package, Thermometer, Ruler, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer
} from "recharts";

export default function AiRootCause() {
  const { toast } = useToast();
  const [selectedIssue, setSelectedIssue] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 5M1E Categories
  const categories = [
    { id: "man", name: "Man (Người)", icon: Users, color: "text-blue-500" },
    { id: "machine", name: "Machine (Máy)", icon: Factory, color: "text-violet-500" },
    { id: "method", name: "Method (Phương pháp)", icon: Wrench, color: "text-green-500" },
    { id: "material", name: "Material (Nguyên liệu)", icon: Package, color: "text-yellow-500" },
    { id: "measurement", name: "Measurement (Đo lường)", icon: Ruler, color: "text-pink-500" },
    { id: "environment", name: "Environment (Môi trường)", icon: Thermometer, color: "text-orange-500" },
  ];

  // Mock analysis result
  // Mock data removed - mockAnalysis (data comes from tRPC or is not yet implemented)

  const recentAnalyses = [
    { id: 1, issue: "CPK giảm đột ngột", date: "2024-06-15", confidence: 87, status: "resolved" },
    { id: 2, issue: "Tỷ lệ lỗi tăng cao", date: "2024-06-14", confidence: 92, status: "in_progress" },
    { id: 3, issue: "OEE giảm liên tục", date: "2024-06-13", confidence: 78, status: "resolved" },
  ];

  const handleAnalyze = () => {
    if (!selectedIssue) {
      toast({ title: "Lỗi", description: "Vui lòng chọn vấn đề cần phân tích", variant: "destructive" });
      return;
    }
    
    // Simulate AI analysis
    toast({ title: "Đang phân tích...", description: "AI đang xử lý dữ liệu với phương pháp 5M1E" });
    setTimeout(() => {
      setAnalysisResult(mockAnalysis);
      toast({ title: "Hoàn thành", description: "Phân tích nguyên nhân gốc rễ thành công" });
    }, 2000);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;
    const Icon = category.icon;
    return <Icon className={`h-5 w-5 ${category.color}`} />;
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500">Đã giải quyết</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">Đang xử lý</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-8 w-8 text-violet-500" />
            AI Root Cause Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Phân tích nguyên nhân gốc rễ với phương pháp 5M1E (Man, Machine, Method, Material, Measurement, Environment)
          </p>
        </div>

        {/* 5M1E Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Phương pháp 5M1E</CardTitle>
            <CardDescription>6 yếu tố chính ảnh hưởng đến chất lượng sản xuất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.id} className="flex items-center gap-3 p-4 border rounded-lg">
                    <Icon className={`h-8 w-8 ${category.color}`} />
                    <div>
                      <p className="font-medium">{category.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Phân tích mới
            </CardTitle>
            <CardDescription>Nhập thông tin vấn đề để AI phân tích nguyên nhân</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Loại vấn đề</Label>
              <Select value={selectedIssue} onValueChange={setSelectedIssue}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại vấn đề..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpk_drop">CPK giảm đột ngột</SelectItem>
                  <SelectItem value="defect_increase">Tỷ lệ lỗi tăng cao</SelectItem>
                  <SelectItem value="oee_decline">OEE giảm liên tục</SelectItem>
                  <SelectItem value="yield_drop">Năng suất giảm</SelectItem>
                  <SelectItem value="quality_issue">Vấn đề chất lượng khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mô tả chi tiết (tùy chọn)</Label>
              <Textarea 
                placeholder="Mô tả chi tiết về vấn đề, thời gian xảy ra, các yếu tố liên quan..."
                rows={4}
              />
            </div>

            <Button onClick={handleAnalyze} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Phân tích nguyên nhân
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Result */}
        {analysisResult && (
          <>
            {/* Summary */}
            <Card className="border-l-4 border-l-violet-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kết quả phân tích</CardTitle>
                    <CardDescription>{analysisResult.issue}</CardDescription>
                  </div>
                  <Badge className="bg-violet-500">Độ tin cậy: {analysisResult.confidence}%</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Phân bố nguyên nhân theo 5M1E
                </CardTitle>
                <CardDescription>Xác suất ảnh hưởng của từng yếu tố</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={analysisResult.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 50]} />
                    <Radar name="Xác suất (%)" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Root Causes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Nguyên nhân gốc rễ
                </CardTitle>
                <CardDescription>Các yếu tố có khả năng gây ra vấn đề (sắp xếp theo xác suất)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.rootCauses.map((cause: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(cause.category)}
                          <div>
                            <p className="font-medium">{cause.factor}</p>
                            <p className="text-sm text-muted-foreground">{getCategoryName(cause.category)}</p>
                          </div>
                        </div>
                        <Badge className="bg-violet-500">{cause.probability}%</Badge>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Bằng chứng:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {cause.evidence.map((item: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Khuyến nghị:
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {cause.recommendations.map((item: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Analyses */}
        <Card>
          <CardHeader>
            <CardTitle>Phân tích gần đây</CardTitle>
            <CardDescription>Lịch sử các phân tích nguyên nhân gốc rễ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{analysis.issue}</p>
                    <p className="text-sm text-muted-foreground">{analysis.date} • Độ tin cậy: {analysis.confidence}%</p>
                  </div>
                  {getStatusBadge(analysis.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
