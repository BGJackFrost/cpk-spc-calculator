import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Key,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subYears, parseISO, isWithinInterval } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Pricing configuration
const LICENSE_PRICES: Record<string, number> = {
  trial: 0,
  standard: 5000000, // 5 triệu VND
  professional: 15000000, // 15 triệu VND
  enterprise: 50000000, // 50 triệu VND
};

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function LicenseRevenue() {
  const [timeRange, setTimeRange] = useState<string>("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Queries
  const licensesQuery = trpc.license.list.useQuery();
  const customersQuery = trpc.licenseCustomer.list.useQuery();
  
  const licenses = licensesQuery.data || [];
  const customers = customersQuery.data || [];
  
  // Calculate revenue data
  const revenueData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (timeRange) {
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "quarter":
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case "year":
        startDate = startOfYear(new Date(selectedYear, 0, 1));
        endDate = endOfYear(new Date(selectedYear, 0, 1));
        break;
      case "all":
        startDate = new Date(2020, 0, 1);
        break;
      default:
        startDate = startOfYear(now);
    }
    
    // Filter licenses by date range
    const filteredLicenses = licenses.filter(lic => {
      if (!lic.issuedAt) return false;
      const issuedDate = new Date(lic.issuedAt);
      return isWithinInterval(issuedDate, { start: startDate, end: endDate });
    });
    
    // Calculate total revenue
    const totalRevenue = filteredLicenses.reduce((sum, lic) => {
      return sum + (LICENSE_PRICES[lic.licenseType || "trial"] || 0);
    }, 0);
    
    // Revenue by type
    const byType: Record<string, { count: number; revenue: number }> = {
      trial: { count: 0, revenue: 0 },
      standard: { count: 0, revenue: 0 },
      professional: { count: 0, revenue: 0 },
      enterprise: { count: 0, revenue: 0 },
    };
    
    filteredLicenses.forEach(lic => {
      const type = lic.licenseType || "trial";
      byType[type].count++;
      byType[type].revenue += LICENSE_PRICES[type] || 0;
    });
    
    // Monthly revenue for chart
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYear, i, 1);
      const monthKey = format(monthDate, "MM/yyyy");
      monthlyRevenue[monthKey] = 0;
    }
    
    filteredLicenses.forEach(lic => {
      if (!lic.issuedAt) return;
      const monthKey = format(new Date(lic.issuedAt), "MM/yyyy");
      if (monthlyRevenue[monthKey] !== undefined) {
        monthlyRevenue[monthKey] += LICENSE_PRICES[lic.licenseType || "trial"] || 0;
      }
    });
    
    const monthlyChartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue,
      displayRevenue: (revenue / 1000000).toFixed(1)
    }));
    
    // Revenue by customer
    const byCustomer: Record<string, { count: number; revenue: number }> = {};
    filteredLicenses.forEach(lic => {
      const company = lic.companyName || "Không xác định";
      if (!byCustomer[company]) {
        byCustomer[company] = { count: 0, revenue: 0 };
      }
      byCustomer[company].count++;
      byCustomer[company].revenue += LICENSE_PRICES[lic.licenseType || "trial"] || 0;
    });
    
    const topCustomers = Object.entries(byCustomer)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));
    
    // Compare with previous period
    let prevStartDate: Date;
    let prevEndDate: Date;
    
    switch (timeRange) {
      case "month":
        prevStartDate = startOfMonth(subMonths(now, 1));
        prevEndDate = endOfMonth(subMonths(now, 1));
        break;
      case "quarter":
        prevStartDate = startOfQuarter(subMonths(now, 3));
        prevEndDate = endOfQuarter(subMonths(now, 3));
        break;
      case "year":
        prevStartDate = startOfYear(new Date(selectedYear - 1, 0, 1));
        prevEndDate = endOfYear(new Date(selectedYear - 1, 0, 1));
        break;
      default:
        prevStartDate = startOfYear(subYears(now, 1));
        prevEndDate = endOfYear(subYears(now, 1));
    }
    
    const prevLicenses = licenses.filter(lic => {
      if (!lic.issuedAt) return false;
      const issuedDate = new Date(lic.issuedAt);
      return isWithinInterval(issuedDate, { start: prevStartDate, end: prevEndDate });
    });
    
    const prevRevenue = prevLicenses.reduce((sum, lic) => {
      return sum + (LICENSE_PRICES[lic.licenseType || "trial"] || 0);
    }, 0);
    
    const growthRate = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : totalRevenue > 0 ? 100 : 0;
    
    // Pie chart data
    const pieData = Object.entries(byType)
      .filter(([_, data]) => data.revenue > 0)
      .map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: data.revenue,
        count: data.count
      }));
    
    return {
      totalRevenue,
      totalLicenses: filteredLicenses.length,
      byType,
      monthlyChartData,
      topCustomers,
      growthRate,
      prevRevenue,
      pieData
    };
  }, [licenses, timeRange, selectedYear]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };
  
  const handleExport = () => {
    const headers = ["Tháng", "Doanh thu (VND)"];
    const rows = revenueData.monthlyChartData.map(d => [d.month, d.revenue]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_revenue_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Báo cáo Doanh thu License
            </h1>
            <p className="text-muted-foreground">Phân tích doanh thu từ việc bán license</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Tháng này</SelectItem>
                <SelectItem value="quarter">Quý này</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
            {timeRange === "year" && (
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Doanh thu</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm">
                {revenueData.growthRate > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">+{revenueData.growthRate.toFixed(1)}%</span>
                  </>
                ) : revenueData.growthRate < 0 ? (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">{revenueData.growthRate.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-500">0%</span>
                  </>
                )}
                <span className="text-muted-foreground">so với kỳ trước</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">License đã bán</p>
                  <p className="text-2xl font-bold">{revenueData.totalLicenses}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Trung bình: {revenueData.totalLicenses > 0 
                  ? formatCurrency(revenueData.totalRevenue / revenueData.totalLicenses)
                  : formatCurrency(0)}/license
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Khách hàng</p>
                  <p className="text-2xl font-bold">{revenueData.topCustomers.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Có giao dịch trong kỳ
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kỳ trước</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenueData.prevRevenue)}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Calendar className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Doanh thu kỳ trước
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="byType">Theo loại</TabsTrigger>
            <TabsTrigger value="byCustomer">Theo khách hàng</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Doanh thu theo tháng</CardTitle>
                <CardDescription>Biểu đồ doanh thu license năm {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData.monthlyChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis 
                        className="text-xs"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                        labelFormatter={(label) => `Tháng ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* By Type Tab */}
          <TabsContent value="byType" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ doanh thu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueData.pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {revenueData.pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết theo loại</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại License</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(revenueData.byType).map(([type, data]) => (
                        <TableRow key={type}>
                          <TableCell>
                            <Badge className={
                              type === "enterprise" ? "bg-amber-500" :
                              type === "professional" ? "bg-purple-500" :
                              type === "standard" ? "bg-blue-500" : "bg-gray-500"
                            }>
                              {type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(LICENSE_PRICES[type])}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(data.revenue)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell>Tổng cộng</TableCell>
                        <TableCell className="text-right">{revenueData.totalLicenses}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">{formatCurrency(revenueData.totalRevenue)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* By Customer Tab */}
          <TabsContent value="byCustomer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Khách hàng</CardTitle>
                <CardDescription>Khách hàng có doanh thu cao nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.topCustomers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        className="text-xs"
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết khách hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="text-right">Số License</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Tỷ lệ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueData.topCustomers.map((customer, idx) => (
                      <TableRow key={customer.name}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell className="text-right">{customer.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.revenue)}</TableCell>
                        <TableCell className="text-right">
                          {revenueData.totalRevenue > 0 
                            ? ((customer.revenue / revenueData.totalRevenue) * 100).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
