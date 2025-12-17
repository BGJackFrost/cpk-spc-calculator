import { useState } from "react";
import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { ArrowLeft, Factory, Cpu, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

export default function NtfLineDetail() {
  const params = useParams();
  const lineId = parseInt(params.id || "0");
  const [days, setDays] = useState(30);

  const { data, isLoading } = trpc.ntfConfig.getLineDetail.useQuery({ 
    productionLineId: lineId, 
    days 
  }, {
    enabled: lineId > 0,
  });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ntf':
        return <Badge className="bg-yellow-500">NTF</Badge>;
      case 'real_ng':
        return <Badge variant="destructive">Real NG</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!lineId) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">ID dây chuyền không hợp lệ</p>
          <Link href="/ntf-dashboard">
            <Button variant="link">Quay lại Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ntf-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Factory className="w-6 h-6" />
                {data?.line?.name || `Dây chuyền #${lineId}`}
              </h1>
              <p className="text-muted-foreground">Chi tiết NTF rate theo máy và thời gian</p>
            </div>
          </div>
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

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-24 animate-pulse bg-muted" /></Card>
            ))}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không tìm thấy dữ liệu cho dây chuyền này
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">NTF Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getStatusColor(data.stats.ntfRate)}`}>
                    {data.stats.ntfRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.stats.total.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">NTF</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">{data.stats.ntfCount.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Real NG</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{data.stats.realNgCount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng NTF Rate</CardTitle>
                  <CardDescription>Biểu đồ NTF rate theo ngày</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trend}>
                        <defs>
                          <linearGradient id="lineDetailGradient" x1="0" y1="0" x2="0" y2="1">
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
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Area type="monotone" dataKey="ntfRate" stroke="#f59e0b" fill="url(#lineDetailGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Machine Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>NTF Rate theo Máy</CardTitle>
                  <CardDescription>So sánh NTF rate giữa các máy</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byMachine.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <YAxis 
                          type="category" 
                          dataKey="machineName" 
                          width={100}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="ntfRate" radius={[0, 4, 4, 0]}>
                          {data.byMachine.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.ntfRate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Machine Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Chi tiết theo Máy
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Máy</TableHead>
                    <TableHead className="text-right">Tổng lỗi</TableHead>
                    <TableHead className="text-right">NTF</TableHead>
                    <TableHead className="text-right">NTF Rate</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byMachine.map((machine, index) => (
                    <TableRow key={machine.machineId || index}>
                      <TableCell className="font-medium">{machine.machineName}</TableCell>
                      <TableCell className="text-right">{machine.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-yellow-600">{machine.ntfCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${getStatusColor(machine.ntfRate)}`}>
                          {machine.ntfRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {machine.ntfRate >= 30 ? (
                          <Badge variant="destructive">Nghiêm trọng</Badge>
                        ) : machine.ntfRate >= 20 ? (
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

            {/* Recent Defects */}
            <Card>
              <CardHeader>
                <CardTitle>Lỗi gần đây</CardTitle>
                <CardDescription>100 lỗi mới nhất</CardDescription>
              </CardHeader>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentDefects.map((defect: any, index: number) => (
                      <TableRow key={defect.id || index}>
                        <TableCell>{new Date(defect.createdAt).toLocaleString('vi-VN')}</TableCell>
                        <TableCell>{defect.machineName || '-'}</TableCell>
                        <TableCell>{defect.categoryName || '-'}</TableCell>
                        <TableCell>{defect.ruleViolated || '-'}</TableCell>
                        <TableCell>{getStatusBadge(defect.verificationStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
