import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { GitCompare, RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3, Download, Brain, AlertTriangle, CheckCircle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, BarChart, Bar, LineChart, Line } from "recharts";

// Mock correlation data
// Mock data removed - mockCorrelationData (data comes from tRPC or is not yet implemented)

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#8b5cf6"];

export default function AiCorrelationAnalysis() {
  const { toast } = useToast();
  const [selectedVar1, setSelectedVar1] = useState("CPK");
  const [selectedVar2, setSelectedVar2] = useState("Temperature");
  const [timeRange, setTimeRange] = useState("7d");

  const getCorrelationColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.7) return value > 0 ? "text-green-600" : "text-red-600";
    if (abs >= 0.4) return value > 0 ? "text-blue-600" : "text-orange-600";
    return "text-gray-500";
  };

  const getSignificanceBadge = (sig: string) => {
    switch (sig) {
      case "high": return <Badge className="bg-green-500">Cao</Badge>;
      case "medium": return <Badge className="bg-yellow-500">Trung bình</Badge>;
      case "low": return <Badge variant="secondary">Thấp</Badge>;
      default: return <Badge variant="outline">{sig}</Badge>;
    }
  };

  const handleAnalyze = () => {
    toast({ title: "Đang phân tích", description: "Đang tính toán tương quan giữa các biến..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã phân tích tương quan thành công" });
    }, 1500);
  };

  const handleExport = () => {
    toast({ title: "Đang xuất", description: "Đang xuất báo cáo phân tích tương quan..." });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-purple-500" />
              AI Correlation Analysis
            </h1>
            <p className="text-muted-foreground mt-1">Phân tích tương quan giữa các biến sản xuất với AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAnalyze}>
              <RefreshCw className="w-4 h-4 mr-2" />Phân tích
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* AI Insights */}
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-purple-500" />AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {mockCorrelationData.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                  {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                  {insight.type === "negative" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                  {insight.type === "info" && <Brain className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <span className="text-sm">{insight.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="matrix" className="space-y-4">
          <TabsList>
            <TabsTrigger value="matrix">Ma trận tương quan</TabsTrigger>
            <TabsTrigger value="scatter">Biểu đồ phân tán</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ma trận tương quan</CardTitle>
                <CardDescription>Hệ số tương quan Pearson giữa các biến</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Biến 1</TableHead>
                      <TableHead>Biến 2</TableHead>
                      <TableHead className="text-center">Hệ số r</TableHead>
                      <TableHead className="text-center">p-value</TableHead>
                      <TableHead className="text-center">Mức ý nghĩa</TableHead>
                      <TableHead className="text-center">Xu hướng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCorrelationData.matrix.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.var1}</TableCell>
                        <TableCell>{row.var2}</TableCell>
                        <TableCell className={`text-center font-bold ${getCorrelationColor(row.correlation)}`}>
                          {row.correlation.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">{row.pValue.toFixed(3)}</TableCell>
                        <TableCell className="text-center">{getSignificanceBadge(row.significance)}</TableCell>
                        <TableCell className="text-center">
                          {row.correlation > 0.3 && <TrendingUp className="w-4 h-4 text-green-500 inline" />}
                          {row.correlation < -0.3 && <TrendingDown className="w-4 h-4 text-red-500 inline" />}
                          {Math.abs(row.correlation) <= 0.3 && <Minus className="w-4 h-4 text-gray-400 inline" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scatter" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Biểu đồ phân tán</CardTitle>
                    <CardDescription>Mối quan hệ giữa hai biến</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedVar1} onValueChange={setSelectedVar1}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPK">CPK</SelectItem>
                        <SelectItem value="OEE">OEE</SelectItem>
                        <SelectItem value="Defect Rate">Tỷ lệ lỗi</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedVar2} onValueChange={setSelectedVar2}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Temperature">Nhiệt độ</SelectItem>
                        <SelectItem value="Humidity">Độ ẩm</SelectItem>
                        <SelectItem value="Speed">Tốc độ</SelectItem>
                        <SelectItem value="Pressure">Áp suất</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name={selectedVar2} unit="" />
                      <YAxis type="number" dataKey="y" name={selectedVar1} unit="" />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Legend />
                      <Scatter name={`${selectedVar1} vs ${selectedVar2}`} data={mockCorrelationData.scatterData} fill="#8b5cf6">
                        {mockCorrelationData.scatterData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng theo thời gian</CardTitle>
                <CardDescription>So sánh xu hướng của các biến liên quan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockCorrelationData.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="cpk" stroke="#8b5cf6" name="CPK" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f97316" name="Nhiệt độ" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#22c55e" name="Tốc độ" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
