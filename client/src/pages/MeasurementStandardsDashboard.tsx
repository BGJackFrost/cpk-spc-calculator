import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Cog,
  Factory,
  Loader2,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

interface MeasurementStandard {
  id: number;
  productId: number | null;
  workstationId: number | null;
  machineId: number | null;
  measurementName: string;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  unit: string | null;
  sampleSize: number | null;
  sampleFrequency: number | null;
  samplingMethod: string | null;
  appliedSpcRules: string | null;
  cpkWarningThreshold: number | null;
  cpkCriticalThreshold: number | null;
  notes: string | null;
  isActive: number;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function MeasurementStandardsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // Fetch data
  const { data: standards = [], isLoading, refetch } = trpc.measurementStandard.list.useQuery();
  const { data: products = [] } = trpc.product.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();
  const { data: machines = [] } = trpc.machine.listAll.useQuery();
  const { data: spcRules = [] } = trpc.rules.getSpcRules.useQuery();

  // Calculate statistics
  const stats = useMemo(() => {
    const total = standards.length;
    const active = standards.filter((s: MeasurementStandard) => s.isActive === 1).length;
    const inactive = total - active;
    
    // Count by product
    const byProduct = standards.reduce((acc: Record<number, number>, s: MeasurementStandard) => {
      if (s.productId) {
        acc[s.productId] = (acc[s.productId] || 0) + 1;
      }
      return acc;
    }, {});

    // Count by workstation
    const byWorkstation = standards.reduce((acc: Record<number, number>, s: MeasurementStandard) => {
      if (s.workstationId) {
        acc[s.workstationId] = (acc[s.workstationId] || 0) + 1;
      }
      return acc;
    }, {});

    // Count standards with SPC rules configured
    const withSpcRules = standards.filter((s: MeasurementStandard) => {
      if (!s.appliedSpcRules) return false;
      try {
        const rules = JSON.parse(s.appliedSpcRules);
        return Array.isArray(rules) && rules.length > 0;
      } catch {
        return false;
      }
    }).length;

    // Count standards with complete configuration
    const complete = standards.filter((s: MeasurementStandard) => 
      s.usl !== null && s.lsl !== null && s.sampleSize !== null && s.sampleFrequency !== null
    ).length;

    // Count standards needing attention (missing critical fields)
    const needsAttention = standards.filter((s: MeasurementStandard) => 
      s.isActive === 1 && (s.usl === null || s.lsl === null || s.sampleSize === null)
    ).length;

    return {
      total,
      active,
      inactive,
      byProduct,
      byWorkstation,
      withSpcRules,
      complete,
      needsAttention,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }, [standards]);

  // Filter standards
  const filteredStandards = useMemo(() => {
    return standards.filter((s: MeasurementStandard) => {
      const matchesSearch = s.measurementName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && s.isActive === 1) ||
        (statusFilter === "inactive" && s.isActive === 0) ||
        (statusFilter === "incomplete" && (s.usl === null || s.lsl === null || s.sampleSize === null));
      const matchesProduct = productFilter === "all" || s.productId?.toString() === productFilter;
      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [standards, searchTerm, statusFilter, productFilter]);

  // Get top products by standard count
  const topProducts = useMemo(() => {
    return Object.entries(stats.byProduct)
      .map(([id, count]) => ({
        id: parseInt(id),
        name: products.find((p: any) => p.id === parseInt(id))?.name || `Product ${id}`,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stats.byProduct, products]);

  // Get top workstations by standard count
  const topWorkstations = useMemo(() => {
    return Object.entries(stats.byWorkstation)
      .map(([id, count]) => ({
        id: parseInt(id),
        name: workstations.find((w: any) => w.id === parseInt(id))?.name || `Workstation ${id}`,
        count: count as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stats.byWorkstation, workstations]);

  const getProductName = (id: number | null) => {
    if (!id) return "-";
    return products.find((p: any) => p.id === id)?.name || "-";
  };

  const getWorkstationName = (id: number | null) => {
    if (!id) return "-";
    return workstations.find((w: any) => w.id === id)?.name || "-";
  };

  const getMachineName = (id: number | null) => {
    if (!id) return "-";
    return machines.find((m: any) => m.id === id)?.name || "-";
  };

  const formatValue = (value: number | null, decimals: number = 2) => {
    if (value === null) return "-";
    return (value / Math.pow(10, decimals)).toFixed(decimals);
  };

  const getSpcRulesCount = (appliedRules: string | null) => {
    if (!appliedRules) return 0;
    try {
      const rules = JSON.parse(appliedRules);
      return Array.isArray(rules) ? rules.length : 0;
    } catch {
      return 0;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Tiêu chuẩn Đo lường</h1>
            <p className="text-muted-foreground">
              Tổng quan và thống kê các tiêu chuẩn đo lường trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Link href="/measurement-standards">
              <Button>
                Quản lý tiêu chuẩn
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số tiêu chuẩn</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} đang hoạt động
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cấu hình hoàn chỉnh</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.complete}</div>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={stats.completionRate} className="h-2" />
                <span className="text-xs text-muted-foreground">{stats.completionRate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Có SPC Rules</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withSpcRules}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.withSpcRules / stats.total) * 100) : 0}% tiêu chuẩn
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần xem xét</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.needsAttention}</div>
              <p className="text-xs text-muted-foreground">
                Thiếu thông tin quan trọng
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Product */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Phân bố theo Sản phẩm
              </CardTitle>
              <CardDescription>Top 5 sản phẩm có nhiều tiêu chuẩn nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{product.name}</span>
                          <span className="text-sm text-muted-foreground">{product.count}</span>
                        </div>
                        <Progress 
                          value={(product.count / (topProducts[0]?.count || 1)) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Workstation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Phân bố theo Công trạm
              </CardTitle>
              <CardDescription>Top 5 công trạm có nhiều tiêu chuẩn nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {topWorkstations.length > 0 ? (
                <div className="space-y-4">
                  {topWorkstations.map((ws, index) => (
                    <div key={ws.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{ws.name}</span>
                          <span className="text-sm text-muted-foreground">{ws.count}</span>
                        </div>
                        <Progress 
                          value={(ws.count / (topWorkstations[0]?.count || 1)) * 100} 
                          className="h-2 bg-blue-100 [&>div]:bg-blue-500" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Standards List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Danh sách Tiêu chuẩn</CardTitle>
                <CardDescription>Tất cả tiêu chuẩn đo lường trong hệ thống</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Tạm dừng</SelectItem>
                    <SelectItem value="incomplete">Chưa hoàn chỉnh</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-48">
                    <Package className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên tiêu chuẩn</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Công trạm</TableHead>
                  <TableHead>USL / LSL</TableHead>
                  <TableHead>Mẫu</TableHead>
                  <TableHead>SPC Rules</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStandards.length > 0 ? (
                  filteredStandards.map((std: MeasurementStandard) => (
                    <TableRow key={std.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          {std.measurementName}
                        </div>
                      </TableCell>
                      <TableCell>{getProductName(std.productId)}</TableCell>
                      <TableCell>{getWorkstationName(std.workstationId)}</TableCell>
                      <TableCell>
                        {std.usl !== null && std.lsl !== null ? (
                          <span className="text-sm">
                            {formatValue(std.usl)} / {formatValue(std.lsl)} {std.unit || ''}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600">
                            Chưa cấu hình
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {std.sampleSize ? (
                          <span className="text-sm">
                            n={std.sampleSize}, {std.sampleFrequency}min
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSpcRulesCount(std.appliedSpcRules) > 0 ? (
                          <Badge variant="secondary">
                            {getSpcRulesCount(std.appliedSpcRules)} rules
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={std.isActive === 1 ? "default" : "secondary"}>
                          {std.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy tiêu chuẩn nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
