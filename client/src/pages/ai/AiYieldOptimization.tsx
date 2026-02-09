import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, RefreshCw, Download, Brain, CheckCircle, TrendingUp, Target, Zap, Settings, Play, Lightbulb, AlertTriangle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

// Mock yield optimization data
// Mock data removed - mockYieldData (data comes from tRPC or is not yet implemented)

export default function AiYieldOptimization() {
  const { toast } = useToast();
  const [selectedLine, setSelectedLine] = useState("all");
  const [simulationMode, setSimulationMode] = useState(false);
  const [tempValue, setTempValue] = useState([185]);
  const [pressureValue, setPressureValue] = useState([2.5]);

  const handleOptimize = () => {
    toast({ title: "Đang tối ưu", description: "Đang phân tích và tìm thông số tối ưu với AI..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã tìm được thông số tối ưu" });
    }, 2000);
  };

  const handleApply = () => {
    toast({ title: "Áp dụng thành công", description: "Đã gửi thông số tối ưu đến hệ thống điều khiển" });
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "high": return <Badge className="bg-red-500">Cao</Badge>;
      case "medium": return <Badge className="bg-orange-500">Trung bình</Badge>;
      case "low": return <Badge className="bg-green-500">Thấp</Badge>;
      default: return <Badge variant="outline">{impact}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-500" />
              AI Yield Optimization
            </h1>
            <p className="text-muted-foreground mt-1">Tối ưu hóa năng suất sản xuất với AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Line</SelectItem>
                <SelectItem value="line1">Line 1</SelectItem>
                <SelectItem value="line2">Line 2</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleOptimize}>
              <RefreshCw className="w-4 h-4 mr-2" />Tối ưu
            </Button>
            <Button onClick={handleApply}>
              <Play className="w-4 h-4 mr-2" />Áp dụng
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Yield hiện tại</p>
              <p className="text-3xl font-bold">{mockYieldData.summary.currentYield}%</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="pt-4">
              <p className="text-sm text-emerald-700">Yield tối ưu</p>
              <p className="text-3xl font-bold text-emerald-800">{mockYieldData.summary.optimizedYield}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tiềm năng tăng</p>
              <p className="text-2xl font-bold text-green-600">+{mockYieldData.summary.potentialGain}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tiết kiệm ước tính</p>
              <p className="text-2xl font-bold">{mockYieldData.summary.estimatedSavings.toLocaleString()} VND/ngày</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Độ tin cậy</p>
              <p className="text-2xl font-bold">{(mockYieldData.summary.confidenceScore * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-emerald-500" />AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Phân tích</h4>
                {mockYieldData.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                    {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                    {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                    {insight.type === "info" && <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <span className="text-sm">{insight.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Khuyến nghị thực hiện</h4>
                {mockYieldData.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{rec.priority}</Badge>
                      <span className="text-sm">{rec.action}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{rec.impact}</p>
                      <p className="text-xs text-muted-foreground">Rủi ro: {rec.risk}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="parameters" className="space-y-4">
          <TabsList>
            <TabsTrigger value="parameters">Thông số tối ưu</TabsTrigger>
            <TabsTrigger value="simulation">Mô phỏng</TabsTrigger>
            <TabsTrigger value="scenarios">Kịch bản</TabsTrigger>
            <TabsTrigger value="comparison">So sánh</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thông số tối ưu được AI đề xuất</CardTitle>
                <CardDescription>So sánh giữa giá trị hiện tại và giá trị tối ưu</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thông số</TableHead>
                      <TableHead className="text-center">Hiện tại</TableHead>
                      <TableHead className="text-center">Tối ưu</TableHead>
                      <TableHead className="text-center">Đơn vị</TableHead>
                      <TableHead className="text-center">Mức ảnh hưởng</TableHead>
                      <TableHead className="text-center">Thay đổi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockYieldData.parameters.map((param, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{param.name}</TableCell>
                        <TableCell className="text-center">{param.current}</TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">{param.optimal}</TableCell>
                        <TableCell className="text-center">{param.unit}</TableCell>
                        <TableCell className="text-center">{getImpactBadge(param.impact)}</TableCell>
                        <TableCell className="text-center">
                          {param.optimal > param.current ? (
                            <span className="text-green-600">+{(param.optimal - param.current).toFixed(1)}</span>
                          ) : (
                            <span className="text-red-600">{(param.optimal - param.current).toFixed(1)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mô phỏng thay đổi thông số</CardTitle>
                <CardDescription>Điều chỉnh thông số và xem kết quả dự báo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Nhiệt độ</span>
                        <span className="text-sm">{tempValue[0]}°C</span>
                      </div>
                      <Slider value={tempValue} onValueChange={setTempValue} min={170} max={210} step={1} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>170°C</span>
                        <span className="text-emerald-600">Tối ưu: 192°C</span>
                        <span>210°C</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Áp suất</span>
                        <span className="text-sm">{pressureValue[0]} bar</span>
                      </div>
                      <Slider value={pressureValue} onValueChange={setPressureValue} min={1.5} max={4.0} step={0.1} />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1.5 bar</span>
                        <span className="text-emerald-600">Tối ưu: 2.8 bar</span>
                        <span>4.0 bar</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Yield dự báo</p>
                      <p className="text-5xl font-bold text-emerald-600">
                        {(94.5 + (tempValue[0] - 185) * 0.1 + (pressureValue[0] - 2.5) * 0.5).toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {tempValue[0] >= 190 && pressureValue[0] >= 2.7 ? (
                          <span className="text-green-600">Thông số gần tối ưu</span>
                        ) : (
                          <span className="text-orange-600">Có thể cải thiện thêm</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Các kịch bản tối ưu</CardTitle>
                <CardDescription>So sánh các phương án tối ưu khác nhau</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kịch bản</TableHead>
                      <TableHead className="text-center">Yield dự báo</TableHead>
                      <TableHead className="text-center">Chi phí</TableHead>
                      <TableHead className="text-center">ROI</TableHead>
                      <TableHead className="text-center">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockYieldData.scenarios.map((scenario, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{scenario.name}</TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">{scenario.yield}%</TableCell>
                        <TableCell className="text-center">{scenario.cost.toLocaleString()} VND</TableCell>
                        <TableCell className="text-center">{scenario.roi}x</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline">Chọn</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng Yield</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockYieldData.yieldTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[92, 98]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="actual" stroke="#8b5cf6" name="Thực tế" strokeWidth={2} />
                        <Line type="monotone" dataKey="optimized" stroke="#22c55e" name="Tối ưu" strokeWidth={2} strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>So sánh đa chiều</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={mockYieldData.radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Hiện tại" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        <Radar name="Tối ưu" dataKey="B" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
