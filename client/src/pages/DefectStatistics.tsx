import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, Cell, PieChart, Pie } from "recharts";
import { AlertTriangle, TrendingUp, BarChart3, PieChartIcon, Calendar } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function DefectStatistics() {
  const [timeRange, setTimeRange] = useState("30");
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  
  // Calculate date range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));
    return { startDate, endDate };
  }, [timeRange]);

  // Queries
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: defectStats } = trpc.defect.getStatistics.useQuery({
    productionLineId: selectedLineId ? Number(selectedLineId) : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: ruleStats } = trpc.defect.getByRuleStatistics.useQuery({
    productionLineId: selectedLineId ? Number(selectedLineId) : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: categories } = trpc.defect.listCategories.useQuery();
  const { data: records } = trpc.defect.listRecords.useQuery({
    productionLineId: selectedLineId ? Number(selectedLineId) : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Calculate Pareto data for defect categories
  const paretoData = useMemo(() => {
    if (!defectStats || defectStats.length === 0) return [];
    
    const total = defectStats.reduce((sum, item) => sum + item.count, 0);
    let cumulative = 0;
    
    return defectStats.map((item, index) => {
      cumulative += item.count;
      const percentage = (item.count / total) * 100;
      const cumulativePercentage = (cumulative / total) * 100;
      
      return {
        name: item.category?.name || `Category ${item.categoryId}`,
        code: item.category?.code || "",
        count: item.count,
        percentage: percentage.toFixed(1),
        cumulativePercentage: cumulativePercentage.toFixed(1),
        cumulative: cumulativePercentage,
      };
    });
  }, [defectStats]);

  // Calculate Pareto data for rule violations
  const ruleParetoData = useMemo(() => {
    if (!ruleStats || ruleStats.length === 0) return [];
    
    const total = ruleStats.reduce((sum, item) => sum + item.count, 0);
    let cumulative = 0;
    
    return ruleStats.map((item) => {
      cumulative += item.count;
      const percentage = (item.count / total) * 100;
      const cumulativePercentage = (cumulative / total) * 100;
      
      return {
        name: item.rule,
        count: item.count,
        percentage: percentage.toFixed(1),
        cumulativePercentage: cumulativePercentage.toFixed(1),
        cumulative: cumulativePercentage,
      };
    });
  }, [ruleStats]);

  // Summary statistics
  const summary = useMemo(() => {
    if (!records) return { total: 0, open: 0, resolved: 0, categories: 0 };
    
    return {
      total: records.reduce((sum, r) => sum + r.quantity, 0),
      open: records.filter(r => r.status === "open" || r.status === "investigating").length,
      resolved: records.filter(r => r.status === "resolved" || r.status === "closed").length,
      categories: new Set(records.map(r => r.defectCategoryId)).size,
    };
  }, [records]);

  // Pie chart data for category distribution
  const pieData = useMemo(() => {
    if (!defectStats) return [];
    return defectStats.slice(0, 8).map((item, index) => ({
      name: item.category?.name || `Category ${item.categoryId}`,
      value: item.count,
      fill: COLORS[index % COLORS.length],
    }));
  }, [defectStats]);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thống kê Lỗi SPC</h1>
          <p className="text-muted-foreground">Phân tích Pareto và thống kê lỗi trong quy trình sản xuất</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedLineId || "all"} onValueChange={(v) => setSelectedLineId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tất cả dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dây chuyền</SelectItem>
              {productionLines?.map(line => (
                <SelectItem key={line.id} value={line.id.toString()}>{line.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số lỗi</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Trong {timeRange} ngày qua</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang mở</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{summary.open}</div>
            <p className="text-xs text-muted-foreground">Cần xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{summary.resolved}</div>
            <p className="text-xs text-muted-foreground">Hoàn thành</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loại lỗi</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.categories}</div>
            <p className="text-xs text-muted-foreground">Danh mục khác nhau</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="category-pareto" className="space-y-4">
        <TabsList>
          <TabsTrigger value="category-pareto">Pareto theo Loại lỗi</TabsTrigger>
          <TabsTrigger value="rule-pareto">Pareto theo Rule vi phạm</TabsTrigger>
          <TabsTrigger value="distribution">Phân bổ lỗi</TabsTrigger>
        </TabsList>

        <TabsContent value="category-pareto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ Pareto - Phân tích theo Loại lỗi</CardTitle>
              <CardDescription>
                Phân tích 80/20: Xác định các loại lỗi chiếm phần lớn tổng số lỗi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paretoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" domain={[0, 100]} unit="%" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">Mã: {data.code}</p>
                              <p className="text-sm text-blue-500">Số lượng: {data.count}</p>
                              <p className="text-sm text-gray-500">Tỷ lệ: {data.percentage}%</p>
                              <p className="text-sm text-red-500">Tích lũy: {data.cumulativePercentage}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Số lượng lỗi" fill="#3b82f6">
                      {paretoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Tích lũy (%)" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  Chưa có dữ liệu lỗi trong khoảng thời gian này
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pareto Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bảng phân tích Pareto</CardTitle>
              <CardDescription>Chi tiết số lượng và tỷ lệ tích lũy theo loại lỗi</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Mã lỗi</TableHead>
                    <TableHead>Tên lỗi</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Tỷ lệ (%)</TableHead>
                    <TableHead className="text-right">Tích lũy (%)</TableHead>
                    <TableHead>Nhóm 80/20</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paretoData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">{item.percentage}%</TableCell>
                      <TableCell className="text-right">{item.cumulativePercentage}%</TableCell>
                      <TableCell>
                        {parseFloat(item.cumulativePercentage) <= 80 ? (
                          <Badge variant="destructive">Nhóm A (80%)</Badge>
                        ) : parseFloat(item.cumulativePercentage) <= 95 ? (
                          <Badge variant="secondary">Nhóm B (15%)</Badge>
                        ) : (
                          <Badge variant="outline">Nhóm C (5%)</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paretoData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Chưa có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rule-pareto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ Pareto - Phân tích theo Rule vi phạm</CardTitle>
              <CardDescription>
                Xác định các rule SPC bị vi phạm nhiều nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ruleParetoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={ruleParetoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" domain={[0, 100]} unit="%" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm text-purple-500">Số lần vi phạm: {data.count}</p>
                              <p className="text-sm text-gray-500">Tỷ lệ: {data.percentage}%</p>
                              <p className="text-sm text-red-500">Tích lũy: {data.cumulativePercentage}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Số lần vi phạm" fill="#8b5cf6">
                      {ruleParetoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Tích lũy (%)" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  Chưa có dữ liệu vi phạm rule trong khoảng thời gian này
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ theo Loại lỗi</CardTitle>
                <CardDescription>Biểu đồ tròn thể hiện tỷ lệ các loại lỗi</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Chưa có dữ liệu
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Danh mục lỗi theo 5M1E</CardTitle>
                <CardDescription>Phân loại lỗi theo nhóm nguyên nhân</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Machine", "Material", "Method", "Man", "Environment", "Measurement"].map((group, index) => {
                    const count = defectStats?.filter(d => d.category?.category === group).reduce((sum, d) => sum + d.count, 0) || 0;
                    const total = defectStats?.reduce((sum, d) => sum + d.count, 0) || 1;
                    const percentage = (count / total) * 100;
                    
                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{group}</span>
                          <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
