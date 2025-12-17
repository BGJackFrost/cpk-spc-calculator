import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Calendar, Target, ArrowUp, ArrowDown, Minus, Download, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, ReferenceLine
} from "recharts";

// Mock data for analytics
const weeklyOEEData = [
  { week: "Tuần 1", oee: 78.5, availability: 85.2, performance: 92.1, quality: 99.8 },
  { week: "Tuần 2", oee: 81.2, availability: 87.5, performance: 93.0, quality: 99.7 },
  { week: "Tuần 3", oee: 79.8, availability: 84.3, performance: 94.5, quality: 99.9 },
  { week: "Tuần 4", oee: 82.5, availability: 88.1, performance: 93.6, quality: 99.8 },
];

const monthlyOEEData = [
  { month: "T1", oee: 75.2, target: 80 },
  { month: "T2", oee: 77.8, target: 80 },
  { month: "T3", oee: 79.5, target: 80 },
  { month: "T4", oee: 78.3, target: 80 },
  { month: "T5", oee: 80.1, target: 80 },
  { month: "T6", oee: 82.4, target: 80 },
  { month: "T7", oee: 81.9, target: 82 },
  { month: "T8", oee: 83.2, target: 82 },
  { month: "T9", oee: 84.5, target: 82 },
  { month: "T10", oee: 83.8, target: 82 },
  { month: "T11", oee: 85.1, target: 85 },
  { month: "T12", oee: 86.2, target: 85 },
];

const quarterlyData = [
  { quarter: "Q1", oee: 77.5, cpk: 1.28, defects: 125 },
  { quarter: "Q2", oee: 80.3, cpk: 1.35, defects: 98 },
  { quarter: "Q3", oee: 83.2, cpk: 1.42, defects: 72 },
  { quarter: "Q4", oee: 85.0, cpk: 1.48, defects: 58 },
];

const machineHeatmapData = [
  { machine: "CNC-001", mon: 85, tue: 82, wed: 88, thu: 79, fri: 84, sat: 75, sun: 0 },
  { machine: "CNC-002", mon: 78, tue: 81, wed: 76, thu: 83, fri: 80, sat: 72, sun: 0 },
  { machine: "CNC-003", mon: 90, tue: 88, wed: 92, thu: 87, fri: 89, sat: 82, sun: 0 },
  { machine: "LATHE-001", mon: 72, tue: 75, wed: 70, thu: 78, fri: 74, sat: 68, sun: 0 },
  { machine: "LATHE-002", mon: 82, tue: 85, wed: 80, thu: 84, fri: 81, sat: 76, sun: 0 },
];

const cpkTrendData = [
  { date: "01/12", cpk: 1.32, lsl: 1.0, target: 1.33 },
  { date: "02/12", cpk: 1.28, lsl: 1.0, target: 1.33 },
  { date: "03/12", cpk: 1.35, lsl: 1.0, target: 1.33 },
  { date: "04/12", cpk: 1.41, lsl: 1.0, target: 1.33 },
  { date: "05/12", cpk: 1.38, lsl: 1.0, target: 1.33 },
  { date: "06/12", cpk: 1.45, lsl: 1.0, target: 1.33 },
  { date: "07/12", cpk: 1.42, lsl: 1.0, target: 1.33 },
  { date: "08/12", cpk: 1.48, lsl: 1.0, target: 1.33 },
  { date: "09/12", cpk: 1.52, lsl: 1.0, target: 1.33 },
  { date: "10/12", cpk: 1.49, lsl: 1.0, target: 1.33 },
];

export default function AdvancedAnalytics() {
  const { language } = useLanguage();
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "year">("month");
  const [selectedMetric, setSelectedMetric] = useState<"oee" | "cpk" | "defects">("oee");

  const getHeatmapColor = (value: number) => {
    if (value === 0) return "bg-gray-100 dark:bg-gray-800";
    if (value >= 85) return "bg-green-500";
    if (value >= 75) return "bg-yellow-500";
    if (value >= 65) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 1) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (diff < -1) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // Calculate summary stats
  const avgOEE = useMemo(() => {
    const data = monthlyOEEData.slice(-3);
    return (data.reduce((sum, d) => sum + d.oee, 0) / data.length).toFixed(1);
  }, []);

  const avgCPK = useMemo(() => {
    const data = cpkTrendData.slice(-7);
    return (data.reduce((sum, d) => sum + d.cpk, 0) / data.length).toFixed(2);
  }, []);

  return (
    <DashboardLayout>
      <div id="advanced-analytics-content" className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === "vi" ? "Phân tích Nâng cao" : "Advanced Analytics"}
            </h1>
            <p className="text-muted-foreground">
              {language === "vi" 
                ? "Biểu đồ xu hướng và phân tích dài hạn cho OEE/CPK" 
                : "Long-term trends and analytics for OEE/CPK"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{language === "vi" ? "Theo tuần" : "Weekly"}</SelectItem>
                <SelectItem value="month">{language === "vi" ? "Theo tháng" : "Monthly"}</SelectItem>
                <SelectItem value="quarter">{language === "vi" ? "Theo quý" : "Quarterly"}</SelectItem>
                <SelectItem value="year">{language === "vi" ? "Theo năm" : "Yearly"}</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  const { toast } = await import('sonner');
                  toast.info("Đang xuất báo cáo...");
                  const element = document.getElementById('advanced-analytics-content');
                  if (!element) {
                    toast.error("Không tìm thấy nội dung để xuất");
                    return;
                  }
                  const html2canvas = (await import('html2canvas')).default;
                  const { jsPDF } = await import('jspdf');
                  const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    useCORS: true,
                    logging: false,
                  });
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const imgWidth = pdfWidth - 20;
                  const imgHeight = (canvas.height * imgWidth) / canvas.width;
                  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                  pdf.save(`advanced-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
                  toast.success("Đã xuất báo cáo thành công");
                } catch (error) {
                  console.error('Export error:', error);
                  const { toast } = await import('sonner');
                  toast.error("Đã xảy ra lỗi khi xuất báo cáo");
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              {language === "vi" ? "Xuất báo cáo" : "Export"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE {language === "vi" ? "trung bình" : "Average"}</p>
                  <p className="text-3xl font-bold">{avgOEE}%</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>+2.3% {language === "vi" ? "so với tháng trước" : "vs last month"}</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPK {language === "vi" ? "trung bình" : "Average"}</p>
                  <p className="text-3xl font-bold">{avgCPK}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>+0.08 {language === "vi" ? "so với tuần trước" : "vs last week"}</span>
                  </div>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Lỗi tháng này" : "Defects This Month"}</p>
                  <p className="text-3xl font-bold">58</p>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowDown className="h-3 w-3" />
                    <span>-19% {language === "vi" ? "so với tháng trước" : "vs last month"}</span>
                  </div>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "vi" ? "Máy hoạt động" : "Active Machines"}</p>
                  <p className="text-3xl font-bold">12/15</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>80% {language === "vi" ? "khả dụng" : "availability"}</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="oee-trend">
          <TabsList>
            <TabsTrigger value="oee-trend">
              {language === "vi" ? "Xu hướng OEE" : "OEE Trend"}
            </TabsTrigger>
            <TabsTrigger value="cpk-trend">
              {language === "vi" ? "Xu hướng CPK" : "CPK Trend"}
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              {language === "vi" ? "Heatmap Hiệu suất" : "Performance Heatmap"}
            </TabsTrigger>
            <TabsTrigger value="quarterly">
              {language === "vi" ? "Phân tích theo Quý" : "Quarterly Analysis"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="oee-trend" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "vi" ? "OEE theo Tháng" : "Monthly OEE"}</CardTitle>
                  <CardDescription>
                    {language === "vi" ? "So sánh OEE thực tế với mục tiêu" : "Actual OEE vs Target"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyOEEData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="oee" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="OEE (%)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#ef4444" 
                        strokeDasharray="5 5"
                        name={language === "vi" ? "Mục tiêu" : "Target"} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === "vi" ? "Chi tiết OEE theo Tuần" : "Weekly OEE Breakdown"}</CardTitle>
                  <CardDescription>
                    {language === "vi" ? "Availability, Performance, Quality" : "Availability, Performance, Quality"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyOEEData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="availability" fill="#22c55e" name="Availability" />
                      <Bar dataKey="performance" fill="#3b82f6" name="Performance" />
                      <Bar dataKey="quality" fill="#a855f7" name="Quality" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cpk-trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "vi" ? "Xu hướng CPK 10 ngày gần nhất" : "CPK Trend (Last 10 Days)"}</CardTitle>
                <CardDescription>
                  {language === "vi" ? "Theo dõi chỉ số năng lực quy trình" : "Process capability index tracking"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={cpkTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0.8, 1.8]} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="5 5" label="Target (1.33)" />
                    <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" label="LSL (1.0)" />
                    <Line 
                      type="monotone" 
                      dataKey="cpk" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      name="CPK" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "vi" ? "Heatmap Hiệu suất Máy theo Ngày" : "Machine Performance Heatmap by Day"}</CardTitle>
                <CardDescription>
                  {language === "vi" ? "OEE của từng máy trong tuần (Xanh: >85%, Vàng: 75-85%, Cam: 65-75%, Đỏ: <65%)" : "Weekly OEE per machine (Green: >85%, Yellow: 75-85%, Orange: 65-75%, Red: <65%)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">{language === "vi" ? "Máy" : "Machine"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T2" : "Mon"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T3" : "Tue"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T4" : "Wed"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T5" : "Thu"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T6" : "Fri"}</th>
                        <th className="text-center p-2">{language === "vi" ? "T7" : "Sat"}</th>
                        <th className="text-center p-2">{language === "vi" ? "CN" : "Sun"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineHeatmapData.map((row) => (
                        <tr key={row.machine}>
                          <td className="p-2 font-medium">{row.machine}</td>
                          {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                            <td key={day} className="p-1">
                              <div 
                                className={`w-full h-10 rounded flex items-center justify-center text-white font-medium ${getHeatmapColor(row[day as keyof typeof row] as number)}`}
                              >
                                {(row[day as keyof typeof row] as number) > 0 ? `${row[day as keyof typeof row]}%` : "-"}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quarterly" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "vi" ? "So sánh theo Quý" : "Quarterly Comparison"}</CardTitle>
                  <CardDescription>
                    {language === "vi" ? "OEE, CPK và số lỗi theo quý" : "OEE, CPK and defects by quarter"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={quarterlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 2]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="oee" fill="#3b82f6" name="OEE (%)" />
                      <Bar yAxisId="right" dataKey="cpk" fill="#22c55e" name="CPK" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === "vi" ? "Xu hướng Lỗi theo Quý" : "Quarterly Defect Trend"}</CardTitle>
                  <CardDescription>
                    {language === "vi" ? "Số lượng lỗi giảm dần qua các quý" : "Defect count decreasing over quarters"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={quarterlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quarter" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="defects" name={language === "vi" ? "Số lỗi" : "Defects"}>
                        {quarterlyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.defects > 100 ? "#ef4444" : entry.defects > 70 ? "#f59e0b" : "#22c55e"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "vi" ? "Tổng hợp theo Quý" : "Quarterly Summary"}</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">{language === "vi" ? "Quý" : "Quarter"}</th>
                      <th className="text-center p-3">OEE (%)</th>
                      <th className="text-center p-3">CPK</th>
                      <th className="text-center p-3">{language === "vi" ? "Số lỗi" : "Defects"}</th>
                      <th className="text-center p-3">{language === "vi" ? "Xu hướng" : "Trend"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyData.map((q, index) => (
                      <tr key={q.quarter} className="border-b">
                        <td className="p-3 font-medium">{q.quarter}</td>
                        <td className="text-center p-3">
                          <Badge variant={q.oee >= 80 ? "default" : "secondary"}>{q.oee}%</Badge>
                        </td>
                        <td className="text-center p-3">
                          <Badge variant={q.cpk >= 1.33 ? "default" : "destructive"}>{q.cpk}</Badge>
                        </td>
                        <td className="text-center p-3">{q.defects}</td>
                        <td className="text-center p-3">
                          {index > 0 && getTrendIcon(q.oee, quarterlyData[index - 1].oee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
