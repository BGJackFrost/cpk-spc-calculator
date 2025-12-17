import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, ComposedChart, Line
} from "recharts";
import { 
  AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, 
  Lightbulb, Factory, Wrench, Users, Thermometer, Ruler, Package
} from "lucide-react";
import { Link } from "wouter";
import NtfPrediction from "@/components/NtfPrediction";

const CATEGORY_COLORS: Record<string, string> = {
  'Machine': '#3b82f6',
  'Material': '#22c55e',
  'Method': '#f59e0b',
  'Man': '#8b5cf6',
  'Environment': '#06b6d4',
  'Measurement': '#ec4899',
  'Unknown': '#6b7280',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Machine': <Wrench className="w-4 h-4" />,
  'Material': <Package className="w-4 h-4" />,
  'Method': <Factory className="w-4 h-4" />,
  'Man': <Users className="w-4 h-4" />,
  'Environment': <Thermometer className="w-4 h-4" />,
  'Measurement': <Ruler className="w-4 h-4" />,
};

const CATEGORY_NAMES: Record<string, string> = {
  'Machine': 'Máy móc',
  'Material': 'Nguyên vật liệu',
  'Method': 'Phương pháp',
  'Man': 'Nhân lực',
  'Environment': 'Môi trường',
  'Measurement': 'Đo lường',
  'Unknown': 'Không xác định',
};

export default function NtfDashboard() {
  const [days, setDays] = useState(30);
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);

  const { data: summary, isLoading: loadingSummary } = trpc.ntfConfig.getDashboardSummary.useQuery({ days });
  const { data: rootCause, isLoading: loadingRootCause } = trpc.ntfConfig.getRootCauseAnalysis.useQuery({ 
    days, 
    productionLineId: selectedLine 
  });
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  const getStatusColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "text-red-500";
    if (ntfRate >= 20) return "text-yellow-500";
    return "text-green-500";
  };

  // Prepare Pareto data for root cause
  const paretoData = rootCause?.byCategory.map((cat, index, arr) => {
    const total = arr.reduce((sum, c) => sum + c.count, 0);
    const cumulative = arr.slice(0, index + 1).reduce((sum, c) => sum + c.count, 0);
    return {
      ...cat,
      categoryName: CATEGORY_NAMES[cat.category] || cat.category,
      percentage: (cat.count / total) * 100,
      cumulative: (cumulative / total) * 100,
    };
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">NTF Dashboard</h1>
            <p className="text-muted-foreground">Tổng quan và phân tích nguyên nhân gốc NTF</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedLine ? String(selectedLine) : "all"} onValueChange={(v) => setSelectedLine(v === "all" ? undefined : Number(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {productionLines?.map((line: any) => (
                  <SelectItem key={line.id} value={String(line.id)}>{line.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingSummary ? (
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Card key={i}><CardContent className="h-24 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : summary && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">NTF Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getStatusColor(summary.ntfRate)}`}>
                    {summary.ntfRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">{days} ngày qua</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.total.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    NTF: {summary.ntfCount} | Real NG: {summary.realNgCount}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Chờ xác nhận
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{summary.pendingCount}</div>
                  <p className="text-xs text-muted-foreground">Cần xử lý</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Cảnh báo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{summary.alertCount}</div>
                  <p className="text-xs text-muted-foreground">Đã gửi</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50">
                <Link href="/ntf-comparison">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top dây chuyền NTF</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {summary.topLines[0] && (
                      <>
                        <div className="text-lg font-bold truncate">{summary.topLines[0].name}</div>
                        <p className="text-xs text-red-500">{summary.topLines[0].ntfRate.toFixed(1)}% NTF</p>
                      </>
                    )}
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng NTF Rate</CardTitle>
                <CardDescription>Biểu đồ NTF rate theo ngày</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.trend}>
                      <defs>
                        <linearGradient id="ntfDashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'ntfRate' ? `${value.toFixed(1)}%` : value,
                          name === 'ntfRate' ? 'NTF Rate' : name
                        ]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Area type="monotone" dataKey="ntfRate" stroke="#f59e0b" fill="url(#ntfDashGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Root Cause Analysis */}
        {loadingRootCause ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardContent className="h-[400px] animate-pulse bg-muted" /></Card>
            <Card><CardContent className="h-[400px] animate-pulse bg-muted" /></Card>
          </div>
        ) : rootCause && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Pareto Chart - 5M1E */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân tích 5M1E (Pareto)</CardTitle>
                  <CardDescription>Nguyên nhân gốc theo phương pháp 5M1E</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={paretoData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === 'percentage' ? 'Tỉ lệ' : 'Tích lũy'
                          ]}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar yAxisId="left" dataKey="percentage" radius={[4, 4, 0, 0]}>
                          {paretoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#6b7280'} />
                          ))}
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#dc2626" strokeWidth={2} dot />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart - Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo danh mục</CardTitle>
                  <CardDescription>Tỉ lệ lỗi theo từng nhóm nguyên nhân</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rootCause.byCategory}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ category, count }) => `${CATEGORY_NAMES[category] || category}: ${count}`}
                        >
                          {rootCause.byCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#6b7280'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${value} lỗi (NTF: ${props.payload.ntfRate.toFixed(1)}%)`,
                            CATEGORY_NAMES[name] || name
                          ]}
                        />
                        <Legend formatter={(value) => CATEGORY_NAMES[value] || value} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Cards */}
            <div className="grid gap-4 md:grid-cols-6">
              {rootCause.byCategory.slice(0, 6).map((cat) => (
                <Card key={cat.category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {CATEGORY_ICONS[cat.category]}
                      {CATEGORY_NAMES[cat.category] || cat.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cat.count}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-yellow-500">NTF: {cat.ntfCount}</span>
                      <span className="text-muted-foreground">({cat.ntfRate.toFixed(0)}%)</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Top Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Top Rules vi phạm</CardTitle>
                <CardDescription>Các rule SPC bị vi phạm nhiều nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rootCause.byRule.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="rule" 
                        width={100}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `${value} lỗi (NTF: ${props.payload.ntfRate.toFixed(1)}%)`,
                          'Số lượng'
                        ]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Prediction */}
            <NtfPrediction productionLineId={selectedLine} />

            {/* Recommendations */}
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Khuyến nghị cải tiến
                </CardTitle>
                <CardDescription>Dựa trên phân tích dữ liệu {days} ngày qua</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rootCause.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
