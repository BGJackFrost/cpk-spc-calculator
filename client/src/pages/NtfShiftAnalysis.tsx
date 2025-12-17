import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line
} from "recharts";
import { Clock, Sun, Sunset, Moon, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

export default function NtfShiftAnalysis() {
  const [days, setDays] = useState(30);
  const [selectedLine, setSelectedLine] = useState<string>("all");

  const { data: lines } = trpc.productionLine.list.useQuery();
  const { data, isLoading } = trpc.ntfConfig.getShiftAnalysis.useQuery({
    days,
    productionLineId: selectedLine !== "all" ? Number(selectedLine) : undefined,
  });

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'morning':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'afternoon':
        return <Sunset className="w-5 h-5 text-orange-500" />;
      case 'night':
        return <Moon className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'morning':
        return "#eab308";
      case 'afternoon':
        return "#f97316";
      case 'night':
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getStatusColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "text-red-500";
    if (ntfRate >= 20) return "text-yellow-500";
    return "text-green-500";
  };

  const getBarColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "#dc2626";
    if (ntfRate >= 20) return "#f59e0b";
    return "#22c55e";
  };

  // Find best and worst shifts
  const bestShift = data?.byShift?.reduce((min, s) => s.ntfRate < min.ntfRate ? s : min, data.byShift[0]);
  const worstShift = data?.byShift?.reduce((max, s) => s.ntfRate > max.ntfRate ? s : max, data.byShift[0]);

  // Prepare radar data
  const radarData = data?.byShift?.map(s => ({
    shift: s.shiftName.split(' ')[0],
    ntfRate: s.ntfRate,
    fullMark: 50,
  })) || [];

  // Prepare hourly data
  const hourlyData = data?.byHour?.map(h => ({
    hour: `${h.hour}:00`,
    ntfRate: h.ntfRate,
    total: h.total,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Phân tích NTF theo Ca làm việc
            </h1>
            <p className="text-muted-foreground">So sánh NTF rate giữa các ca sáng, chiều, đêm</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {lines?.map(line => (
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

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardContent className="h-32 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không có dữ liệu
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Shift Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {data.byShift.map((shift) => (
                <Card key={shift.shift} className={shift === worstShift ? "border-red-500/50" : shift === bestShift ? "border-green-500/50" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {getShiftIcon(shift.shift)}
                        {shift.shiftName}
                      </span>
                      {shift === bestShift && <Badge className="bg-green-500">Tốt nhất</Badge>}
                      {shift === worstShift && <Badge variant="destructive">Cần cải thiện</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${getStatusColor(shift.ntfRate)}`}>
                      {shift.ntfRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {shift.ntfCount.toLocaleString()} NTF / {shift.total.toLocaleString()} tổng lỗi
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Real NG: {shift.realNgCount.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>So sánh NTF Rate theo Ca</CardTitle>
                  <CardDescription>Biểu đồ cột so sánh giữa các ca</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byShift}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="shiftName" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="ntfRate" radius={[4, 4, 0, 0]}>
                          {data.byShift.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getShiftColor(entry.shift)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Biểu đồ Radar</CardTitle>
                  <CardDescription>So sánh đa chiều giữa các ca</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="shift" />
                        <PolarRadiusAxis angle={30} domain={[0, 50]} />
                        <Radar name="NTF Rate" dataKey="ntfRate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hourly Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>NTF Rate theo Giờ trong ngày</CardTitle>
                <CardDescription>Phân tích xu hướng NTF theo từng giờ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'ntfRate' ? `${value.toFixed(1)}%` : value.toLocaleString(),
                          name === 'ntfRate' ? 'NTF Rate' : 'Tổng lỗi'
                        ]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="ntfRate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="NTF Rate" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-8 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span>Ca sáng (6h-14h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-orange-500" />
                    <span>Ca chiều (14h-22h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-500" />
                    <span>Ca đêm (22h-6h)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng Thống kê Chi tiết</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ca làm việc</TableHead>
                    <TableHead className="text-right">Tổng lỗi</TableHead>
                    <TableHead className="text-right">NTF</TableHead>
                    <TableHead className="text-right">Real NG</TableHead>
                    <TableHead className="text-right">NTF Rate</TableHead>
                    <TableHead>Đánh giá</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byShift.map((shift) => (
                    <TableRow key={shift.shift}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {getShiftIcon(shift.shift)}
                          {shift.shiftName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{shift.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-yellow-600">{shift.ntfCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{shift.realNgCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${getStatusColor(shift.ntfRate)}`}>
                          {shift.ntfRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {shift.ntfRate >= 30 ? (
                          <Badge variant="destructive">Nghiêm trọng</Badge>
                        ) : shift.ntfRate >= 20 ? (
                          <Badge className="bg-yellow-500">Cảnh báo</Badge>
                        ) : (
                          <Badge className="bg-green-500">Bình thường</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Phân tích & Khuyến nghị
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {worstShift && bestShift && worstShift.ntfRate - bestShift.ntfRate > 5 && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="font-medium">Chênh lệch NTF rate giữa các ca đáng chú ý</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {worstShift.shiftName} có NTF rate cao hơn {bestShift.shiftName} là{' '}
                      <span className="font-bold text-yellow-600">{(worstShift.ntfRate - bestShift.ntfRate).toFixed(1)}%</span>.
                      Cần xem xét các yếu tố như: nhân sự, điều kiện làm việc, quy trình kiểm tra.
                    </p>
                  </div>
                )}
                
                {data.byHour.some(h => h.ntfRate > 30) && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="font-medium">Một số khung giờ có NTF rate rất cao</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Các khung giờ có NTF rate &gt; 30%:{' '}
                      {data.byHour.filter(h => h.ntfRate > 30).map(h => `${h.hour}:00`).join(', ')}.
                      Cần tăng cường giám sát và đào tạo trong các khung giờ này.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">Khuyến nghị chung</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Rà soát quy trình kiểm tra tại ca có NTF rate cao nhất ({worstShift?.shiftName})</li>
                    <li>• Áp dụng best practice từ ca có NTF rate thấp nhất ({bestShift?.shiftName})</li>
                    <li>• Đào tạo thêm cho nhân viên kiểm tra trong các khung giờ có NTF cao</li>
                    <li>• Xem xét điều kiện ánh sáng, môi trường làm việc theo từng ca</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
