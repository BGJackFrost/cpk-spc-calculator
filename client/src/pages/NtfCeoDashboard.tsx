import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, ReferenceLine, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Target, Award, AlertTriangle, 
  CheckCircle, Download, BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import { NtfPowerPointExport } from "@/components/NtfPowerPointExport";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function NtfCeoDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = trpc.ceoDashboard.getData.useQuery({ year });

  const exportMutation = trpc.ceoDashboard.exportPowerPoint.useMutation({
    onSuccess: (data) => {
      // Download as JSON for now - can be converted to PPTX on client side
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NTF_Report_${year}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất dữ liệu báo cáo");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const getStatusColor = (achieved: boolean) => achieved ? 'text-green-500' : 'text-red-500';
  const getStatusIcon = (achieved: boolean) => achieved ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              Dashboard NTF cho CEO
            </h1>
            <p className="text-muted-foreground">Tổng quan KPI và hiệu suất NTF theo năm</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NtfPowerPointExport />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-32 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không có dữ liệu cho năm {year}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className={data.kpi.targetAchieved ? 'border-green-500/50' : 'border-red-500/50'}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    KPI NTF Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`text-3xl font-bold ${getStatusColor(data.kpi.targetAchieved)}`}>
                      {data.kpi.actualNtfRate.toFixed(1)}%
                    </span>
                    {getStatusIcon(data.kpi.targetAchieved)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Mục tiêu: {data.kpi.targetNtfRate}% | Gap: {data.kpi.gap > 0 ? '+' : ''}{data.kpi.gap.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tổng lỗi YTD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.ytd.total.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    NTF: {data.ytd.ntfCount.toLocaleString()} | Real NG: {data.ytd.realNgCount.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">So với năm trước</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {data.comparison.improved ? (
                      <TrendingDown className="w-6 h-6 text-green-500" />
                    ) : (
                      <TrendingUp className="w-6 h-6 text-red-500" />
                    )}
                    <span className={`text-3xl font-bold ${data.comparison.improved ? 'text-green-500' : 'text-red-500'}`}>
                      {data.comparison.change > 0 ? '+' : ''}{data.comparison.change.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Năm trước: {data.comparison.prevYearNtfRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Trạng thái</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge 
                    className={`text-lg px-4 py-2 ${data.kpi.targetAchieved ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {data.kpi.targetAchieved ? 'ĐẠT MỤC TIÊU' : 'CHƯA ĐẠT'}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Comparison */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    NTF Rate theo Quý
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.quarterly}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                        />
                        <ReferenceLine y={data.kpi.targetNtfRate} stroke="#ef4444" strokeDasharray="5 5" label="Target" />
                        <Bar dataKey="ntfRate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {data.quarterly.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.ntfRate <= data.kpi.targetNtfRate ? '#22c55e' : '#f59e0b'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Phân bổ theo Quý
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.quarterly}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ quarter, ntfCount }) => `${quarter}: ${ntfCount}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="ntfCount"
                        >
                          {data.quarterly.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng NTF Rate theo Tháng</CardTitle>
                <CardDescription>Biểu đồ NTF rate từng tháng trong năm {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'ntfRate') return [`${value.toFixed(1)}%`, 'NTF Rate'];
                          return [value.toLocaleString(), name];
                        }}
                      />
                      <ReferenceLine y={data.kpi.targetNtfRate} stroke="#ef4444" strokeDasharray="5 5" />
                      <Area 
                        type="monotone" 
                        dataKey="ntfRate" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Issues & Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Nguyên nhân NTF</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topIssues.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Không có dữ liệu</p>
                  ) : (
                    <div className="space-y-4">
                      {data.topIssues.map((issue, i) => {
                        const maxCount = data.topIssues[0].count;
                        const percentage = (issue.count / maxCount) * 100;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{issue.reason === 'unknown' ? 'Không xác định' : issue.reason}</span>
                              <span className="font-medium">{issue.count.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tóm tắt & Khuyến nghị</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${data.kpi.targetAchieved ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <p className="font-medium">
                      {data.kpi.targetAchieved 
                        ? '✅ Đã đạt mục tiêu NTF Rate năm ' + year
                        : '⚠️ Chưa đạt mục tiêu NTF Rate năm ' + year
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      NTF Rate hiện tại: {data.kpi.actualNtfRate.toFixed(1)}% | Mục tiêu: {data.kpi.targetNtfRate}%
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Khuyến nghị:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {!data.kpi.targetAchieved && (
                        <li>• Tập trung cải thiện các nguyên nhân NTF hàng đầu</li>
                      )}
                      {data.comparison.change > 0 && (
                        <li>• NTF rate tăng so với năm trước, cần điều tra nguyên nhân</li>
                      )}
                      <li>• Tiếp tục theo dõi và đào tạo nhân viên về phân loại lỗi</li>
                      <li>• Rà soát định kỳ các thiết bị đo và cảm biến</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết theo Quý</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Quý</th>
                        <th className="text-right p-3">Tổng lỗi</th>
                        <th className="text-right p-3">NTF</th>
                        <th className="text-right p-3">Real NG</th>
                        <th className="text-right p-3">NTF Rate</th>
                        <th className="text-center p-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.quarterly.map((q) => (
                        <tr key={q.quarter} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{q.quarter}</td>
                          <td className="p-3 text-right">{q.total.toLocaleString()}</td>
                          <td className="p-3 text-right">{q.ntfCount.toLocaleString()}</td>
                          <td className="p-3 text-right">{q.realNgCount.toLocaleString()}</td>
                          <td className={`p-3 text-right font-medium ${q.ntfRate <= data.kpi.targetNtfRate ? 'text-green-500' : 'text-red-500'}`}>
                            {q.ntfRate.toFixed(1)}%
                          </td>
                          <td className="p-3 text-center">
                            {q.ntfRate <= data.kpi.targetNtfRate ? (
                              <Badge className="bg-green-500">Đạt</Badge>
                            ) : (
                              <Badge variant="destructive">Chưa đạt</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
