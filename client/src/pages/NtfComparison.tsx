import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { ArrowUpDown, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

export default function NtfComparison() {
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState<'ntfRate' | 'total' | 'ntfCount'>('ntfRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: comparisonData, isLoading } = trpc.ntfConfig.getComparisonData.useQuery({ days });

  const sortedData = comparisonData ? [...comparisonData].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  }) : [];

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusBadge = (ntfRate: number) => {
    if (ntfRate >= 30) return <Badge variant="destructive">Nghiêm trọng</Badge>;
    if (ntfRate >= 20) return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
    return <Badge className="bg-green-500">Bình thường</Badge>;
  };

  const getBarColor = (ntfRate: number) => {
    if (ntfRate >= 30) return "#dc2626";
    if (ntfRate >= 20) return "#f59e0b";
    return "#22c55e";
  };

  // Prepare radar chart data
  const radarData = sortedData.slice(0, 6).map(line => ({
    name: line.productionLineName.length > 15 ? line.productionLineName.substring(0, 15) + '...' : line.productionLineName,
    ntfRate: line.ntfRate,
    total: Math.min(line.total / 10, 100), // Normalize for radar
    realNgRate: line.total > 0 ? (line.realNgCount / line.total) * 100 : 0,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">So sánh NTF Rate theo Dây chuyền</h1>
            <p className="text-muted-foreground">Phân tích và so sánh tỉ lệ NTF giữa các dây chuyền sản xuất</p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[150px]">
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

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardContent className="h-[400px] animate-pulse bg-muted" /></Card>
            <Card><CardContent className="h-[400px] animate-pulse bg-muted" /></Card>
          </div>
        ) : sortedData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Chưa có dữ liệu để hiển thị
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng dây chuyền</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sortedData.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">NTF Rate trung bình</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(sortedData.reduce((sum, d) => sum + d.ntfRate, 0) / sortedData.length).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    NTF cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {sortedData.length > 0 ? Math.max(...sortedData.map(d => d.ntfRate)).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sortedData.find(d => d.ntfRate === Math.max(...sortedData.map(x => x.ntfRate)))?.productionLineName}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    NTF thấp nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {sortedData.length > 0 ? Math.min(...sortedData.map(d => d.ntfRate)).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sortedData.find(d => d.ntfRate === Math.min(...sortedData.map(x => x.ntfRate)))?.productionLineName}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>NTF Rate theo Dây chuyền</CardTitle>
                  <CardDescription>Biểu đồ cột so sánh NTF rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedData.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <YAxis 
                          type="category" 
                          dataKey="productionLineName" 
                          width={120}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="ntfRate" radius={[0, 4, 4, 0]}>
                          {sortedData.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.ntfRate)} />
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
                  <CardTitle>Phân tích đa chiều</CardTitle>
                  <CardDescription>So sánh NTF Rate, Real NG Rate và Tổng lỗi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="NTF Rate" dataKey="ntfRate" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                        <Radar name="Real NG Rate" dataKey="realNgRate" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bảng xếp hạng chi tiết</CardTitle>
                <CardDescription>Click vào tiêu đề cột để sắp xếp</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Dây chuyền</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('total')}>
                      <div className="flex items-center gap-1">
                        Tổng lỗi
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('ntfCount')}>
                      <div className="flex items-center gap-1">
                        NTF
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Real NG</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('ntfRate')}>
                      <div className="flex items-center gap-1">
                        NTF Rate
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((line, index) => (
                    <TableRow key={line.productionLineId || index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{line.productionLineName}</TableCell>
                      <TableCell>{line.total.toLocaleString()}</TableCell>
                      <TableCell className="text-yellow-600">{line.ntfCount.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">{line.realNgCount.toLocaleString()}</TableCell>
                      <TableCell className="text-blue-600">{line.pendingCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${line.ntfRate >= 30 ? 'text-red-500' : line.ntfRate >= 20 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {line.ntfRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(line.ntfRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
