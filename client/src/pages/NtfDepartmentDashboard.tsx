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
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { 
  Building2, TrendingUp, TrendingDown, Users, Factory, 
  AlertTriangle, CheckCircle, ArrowRight
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function NtfDepartmentDashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Get department list
  const { data: departments } = trpc.organization.listDepartments.useQuery();

  // Get department NTF analysis
  const { data, isLoading } = trpc.ceoDashboard.getDepartmentAnalysis.useQuery(
    { days, departmentId: selectedDepartment === "all" ? undefined : Number(selectedDepartment) },
    { retry: false }
  );

  const getStatusColor = (rate: number) => {
    if (rate >= 30) return 'text-red-500';
    if (rate >= 20) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBadge = (rate: number) => {
    if (rate >= 30) return <Badge variant="destructive">Cao</Badge>;
    if (rate >= 20) return <Badge className="bg-yellow-500">Trung bình</Badge>;
    return <Badge className="bg-green-500">Tốt</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-500" />
              Dashboard NTF theo Bộ phận
            </h1>
            <p className="text-muted-foreground">Phân tích NTF rate theo từng bộ phận/phòng ban</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn bộ phận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bộ phận</SelectItem>
                {departments?.map((dept: any) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
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
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-32 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Không có dữ liệu NTF theo bộ phận</p>
              <p className="text-sm mt-2">Hãy đảm bảo đã cấu hình bộ phận trong hệ thống</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng bộ phận</p>
                      <p className="text-2xl font-bold">{data.summary?.totalDepartments || 0}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">NTF Rate TB</p>
                      <p className={`text-2xl font-bold ${getStatusColor(data.summary?.avgNtfRate || 0)}`}>
                        {(data.summary?.avgNtfRate || 0).toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">BP tốt nhất</p>
                      <p className="text-lg font-bold text-green-500 truncate max-w-[150px]">
                        {data.summary?.bestDepartment || 'N/A'}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">BP cần cải thiện</p>
                      <p className="text-lg font-bold text-red-500 truncate max-w-[150px]">
                        {data.summary?.worstDepartment || 'N/A'}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar Chart - NTF by Department */}
              <Card>
                <CardHeader>
                  <CardTitle>NTF Rate theo Bộ phận</CardTitle>
                  <CardDescription>So sánh NTF rate giữa các bộ phận</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.departments || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                        />
                        <Bar dataKey="ntfRate" radius={[0, 4, 4, 0]}>
                          {(data.departments || []).map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.ntfRate >= 30 ? '#ef4444' : entry.ntfRate >= 20 ? '#f59e0b' : '#22c55e'} 
                            />
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
                  <CardTitle>Radar Chart - Đa chiều</CardTitle>
                  <CardDescription>So sánh các chỉ số giữa bộ phận</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={data.departments?.slice(0, 6) || []}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={{ fontSize: 10 }} />
                        <Radar 
                          name="NTF Rate" 
                          dataKey="ntfRate" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.5} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết theo Bộ phận</CardTitle>
                <CardDescription>Bảng thống kê NTF theo từng bộ phận</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Bộ phận</th>
                        <th className="text-right p-3">Tổng lỗi</th>
                        <th className="text-right p-3">NTF</th>
                        <th className="text-right p-3">Real NG</th>
                        <th className="text-right p-3">NTF Rate</th>
                        <th className="text-center p-3">Trạng thái</th>
                        <th className="text-center p-3">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.departments || []).map((dept: any) => (
                        <tr key={dept.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{dept.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">{dept.total.toLocaleString()}</td>
                          <td className="p-3 text-right">{dept.ntfCount.toLocaleString()}</td>
                          <td className="p-3 text-right">{dept.realNgCount.toLocaleString()}</td>
                          <td className={`p-3 text-right font-medium ${getStatusColor(dept.ntfRate)}`}>
                            {dept.ntfRate.toFixed(1)}%
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(dept.ntfRate)}
                          </td>
                          <td className="p-3 text-center">
                            <Link href={`/ntf-line/${dept.id}`}>
                              <Button variant="ghost" size="sm">
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng NTF theo Bộ phận</CardTitle>
                <CardDescription>Biểu đồ trend NTF rate {days} ngày qua</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      {(data.departments || []).slice(0, 5).map((dept: any, index: number) => (
                        <Line 
                          key={dept.id}
                          type="monotone" 
                          dataKey={dept.name} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Khuyến nghị cải thiện</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.recommendations || []).map((rec: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-500 dark:bg-red-950' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950' :
                      'bg-blue-50 border-blue-500 dark:bg-blue-950'
                    }`}>
                      <div className="flex items-start gap-3">
                        {rec.priority === 'high' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        ) : rec.priority === 'medium' ? (
                          <TrendingUp className="w-5 h-5 text-yellow-500 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{rec.department}</p>
                          <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!data.recommendations || data.recommendations.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Không có khuyến nghị nào. Tất cả bộ phận đang hoạt động tốt!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
