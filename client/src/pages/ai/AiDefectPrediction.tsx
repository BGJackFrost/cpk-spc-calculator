import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Download, Brain, CheckCircle, TrendingUp, TrendingDown, Bug, Shield, Target, BarChart3 } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

// Mock defect prediction data
const mockDefectData = {
  summary: {
    currentDefectRate: 2.8,
    predictedDefectRate: 2.3,
    riskLevel: "medium",
    confidenceScore: 0.89,
    topRiskProduct: "Product A",
    topRiskLine: "Line 2",
  },
  predictions: [
    { date: "25/12", actual: 2.8, predicted: 2.7, lower: 2.4, upper: 3.0 },
    { date: "26/12", actual: null, predicted: 2.6, lower: 2.2, upper: 3.0 },
    { date: "27/12", actual: null, predicted: 2.5, lower: 2.1, upper: 2.9 },
    { date: "28/12", actual: null, predicted: 2.4, lower: 2.0, upper: 2.8 },
    { date: "29/12", actual: null, predicted: 2.3, lower: 1.9, upper: 2.7 },
    { date: "30/12", actual: null, predicted: 2.2, lower: 1.8, upper: 2.6 },
    { date: "31/12", actual: null, predicted: 2.1, lower: 1.7, upper: 2.5 },
  ],
  byDefectType: [
    { type: "Scratch", current: 0.8, predicted: 0.6, trend: "down" },
    { type: "Dimension", current: 0.7, predicted: 0.5, trend: "down" },
    { type: "Surface", current: 0.6, predicted: 0.7, trend: "up" },
    { type: "Assembly", current: 0.4, predicted: 0.3, trend: "down" },
    { type: "Other", current: 0.3, predicted: 0.2, trend: "down" },
  ],
  riskFactors: [
    { factor: "Nhiệt độ môi trường", score: 85, impact: "high" },
    { factor: "Độ ẩm", score: 72, impact: "medium" },
    { factor: "Tuổi thọ dao cắt", score: 68, impact: "medium" },
    { factor: "Tốc độ máy", score: 55, impact: "low" },
    { factor: "Chất lượng nguyên liệu", score: 45, impact: "low" },
  ],
  radarData: [
    { subject: "Scratch", A: 0.8, B: 0.6, fullMark: 1.5 },
    { subject: "Dimension", A: 0.7, B: 0.5, fullMark: 1.5 },
    { subject: "Surface", A: 0.6, B: 0.7, fullMark: 1.5 },
    { subject: "Assembly", A: 0.4, B: 0.3, fullMark: 1.5 },
    { subject: "Other", A: 0.3, B: 0.2, fullMark: 1.5 },
  ],
  insights: [
    { type: "positive", message: "Tỷ lệ lỗi dự báo giảm 18% trong 7 ngày tới nhờ cải tiến quy trình." },
    { type: "warning", message: "Lỗi Surface có xu hướng tăng. Cần kiểm tra thiết bị xử lý bề mặt." },
    { type: "info", message: "Nhiệt độ môi trường là yếu tố rủi ro cao nhất (85%). Cần kiểm soát." },
  ],
  preventiveActions: [
    { action: "Kiểm tra và thay dao cắt", priority: "high", dueDate: "26/12", expectedImpact: "-0.3% defect" },
    { action: "Điều chỉnh nhiệt độ phòng", priority: "high", dueDate: "25/12", expectedImpact: "-0.2% defect" },
    { action: "Bảo trì thiết bị xử lý bề mặt", priority: "medium", dueDate: "28/12", expectedImpact: "-0.15% defect" },
  ],
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

export default function AiDefectPrediction() {
  const { toast } = useToast();
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");

  const handlePredict = () => {
    toast({ title: "Đang dự đoán", description: "Đang phân tích và dự đoán lỗi với AI..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã dự đoán lỗi thành công" });
    }, 1500);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "high": return <Badge className="bg-red-500">Cao</Badge>;
      case "medium": return <Badge className="bg-orange-500">Trung bình</Badge>;
      case "low": return <Badge className="bg-green-500">Thấp</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge className="bg-red-500">Khẩn cấp</Badge>;
      case "medium": return <Badge className="bg-orange-500">Trung bình</Badge>;
      case "low": return <Badge className="bg-blue-500">Thấp</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bug className="w-8 h-8 text-red-500" />
              AI Defect Prediction
            </h1>
            <p className="text-muted-foreground mt-1">Dự đoán và phòng ngừa lỗi sản xuất với AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Line</SelectItem>
                <SelectItem value="line1">Line 1</SelectItem>
                <SelectItem value="line2">Line 2</SelectItem>
                <SelectItem value="line3">Line 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả SP</SelectItem>
                <SelectItem value="productA">Product A</SelectItem>
                <SelectItem value="productB">Product B</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePredict}>
              <RefreshCw className="w-4 h-4 mr-2" />Dự đoán
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">Tỷ lệ lỗi hiện tại</p>
              <p className="text-3xl font-bold text-red-800">{mockDefectData.summary.currentDefectRate}%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">Dự báo (7 ngày)</p>
              <p className="text-3xl font-bold text-green-800">{mockDefectData.summary.predictedDefectRate}%</p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3" />-0.5% so với hiện tại
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Mức độ rủi ro</p>
              <div className="flex items-center gap-2 mt-1">
                {getRiskBadge(mockDefectData.summary.riskLevel)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Độ tin cậy</p>
              <p className="text-2xl font-bold">{(mockDefectData.summary.confidenceScore * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">SP rủi ro cao</p>
              <p className="text-lg font-bold">{mockDefectData.summary.topRiskProduct}</p>
              <p className="text-xs text-muted-foreground">{mockDefectData.summary.topRiskLine}</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-red-500" />AI Insights & Preventive Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Phân tích</h4>
                {mockDefectData.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                    {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                    {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                    {insight.type === "info" && <Brain className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <span className="text-sm">{insight.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Hành động phòng ngừa</h4>
                {mockDefectData.preventiveActions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(action.priority)}
                      <span className="text-sm">{action.action}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{action.expectedImpact}</p>
                      <p className="text-xs text-muted-foreground">Hạn: {action.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">Dự báo</TabsTrigger>
            <TabsTrigger value="bytype">Theo loại lỗi</TabsTrigger>
            <TabsTrigger value="risk">Yếu tố rủi ro</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dự báo tỷ lệ lỗi 7 ngày tới</CardTitle>
                <CardDescription>Giá trị thực tế và dự báo với khoảng tin cậy 95%</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mockDefectData.predictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[1, 4]} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="upper" stackId="1" stroke="none" fill="#ef4444" fillOpacity={0.1} name="Giới hạn trên" />
                      <Area type="monotone" dataKey="lower" stackId="2" stroke="none" fill="#fff" name="Giới hạn dưới" />
                      <Line type="monotone" dataKey="predicted" stroke="#ef4444" strokeDasharray="5 5" name="Dự báo" strokeWidth={2} />
                      <Line type="monotone" dataKey="actual" stroke="#8b5cf6" name="Thực tế" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bytype" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dự báo theo loại lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại lỗi</TableHead>
                        <TableHead className="text-center">Hiện tại</TableHead>
                        <TableHead className="text-center">Dự báo</TableHead>
                        <TableHead className="text-center">Xu hướng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDefectData.byDefectType.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.type}</TableCell>
                          <TableCell className="text-center">{item.current}%</TableCell>
                          <TableCell className="text-center">{item.predicted}%</TableCell>
                          <TableCell className="text-center">
                            {item.trend === "down" ? (
                              <TrendingDown className="w-4 h-4 text-green-500 inline" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-500 inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>So sánh Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={mockDefectData.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 1.5]} />
                        <Radar name="Hiện tại" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                        <Radar name="Dự báo" dataKey="B" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Yếu tố rủi ro gây lỗi</CardTitle>
                <CardDescription>Các yếu tố ảnh hưởng đến tỷ lệ lỗi được AI phân tích</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockDefectData.riskFactors.map((factor, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{factor.factor}</span>
                        <div className="flex items-center gap-2">
                          {getRiskBadge(factor.impact)}
                          <span className="text-sm font-bold">{factor.score}%</span>
                        </div>
                      </div>
                      <Progress value={factor.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
