import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  TrendingUp,
  Calendar,
  Users,
  Shield
} from "lucide-react";
import { toast } from "sonner";

const LICENSE_TYPE_COLORS: Record<string, string> = {
  trial: "#94a3b8",
  standard: "#3b82f6",
  professional: "#8b5cf6",
  enterprise: "#f59e0b",
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  trial: "Dùng thử",
  standard: "Tiêu chuẩn",
  professional: "Chuyên nghiệp",
  enterprise: "Doanh nghiệp",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#eab308",
  expired: "#ef4444",
  revoked: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  pending: "Chờ kích hoạt",
  expired: "Hết hạn",
  revoked: "Đã thu hồi",
};

// Simple Pie Chart Component
function PieChart({ 
  data, 
  colors, 
  labels,
  title 
}: { 
  data: { key: string; value: number }[];
  colors: Record<string, string>;
  labels: Record<string, string>;
  title: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <div className="text-4xl mb-2">📊</div>
        <div>Chưa có dữ liệu</div>
      </div>
    );
  }

  let currentAngle = 0;
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    // Calculate path for pie segment
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (startAngle + angle - 90) * (Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    
    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    return {
      key: item.key,
      value: item.value,
      percentage,
      path,
      color: colors[item.key] || "#94a3b8",
      label: labels[item.key] || item.key,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="transition-all hover:opacity-80"
            >
              <title>{segment.label}: {segment.value} ({segment.percentage.toFixed(1)}%)</title>
            </path>
          ))}
          <circle cx="100" cy="100" r="40" fill="white" />
          <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-foreground">
            {total}
          </text>
          <text x="100" y="115" textAnchor="middle" className="text-xs fill-muted-foreground">
            Tổng
          </text>
        </svg>
        
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">{segment.label}:</span>
              <span className="font-medium">{segment.value}</span>
              <span className="text-xs text-muted-foreground">
                ({segment.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bar Chart for Monthly Activations
function BarChart({ data }: { data: { month: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <div className="text-4xl mb-2">📈</div>
        <div>Chưa có dữ liệu kích hoạt</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48">
        {data.map((item, index) => {
          const height = (item.count / maxCount) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium">{item.count}</span>
              <div 
                className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`${item.month}: ${item.count} kích hoạt`}
              />
              <span className="text-xs text-muted-foreground rotate-45 origin-left">
                {item.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LicenseDashboard() {
  const { data: stats, isLoading, refetch } = trpc.license.getDashboardStats.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const typeData = stats?.byType?.map(item => ({
    key: item.licenseType || "unknown",
    value: Number(item.count) || 0,
  })) || [];

  const statusData = stats?.byStatus?.map(item => ({
    key: item.status || "unknown",
    value: Number(item.count) || 0,
  })) || [];

  const activationData = stats?.activationsByMonth?.map(item => ({
    month: item.month || "",
    count: Number(item.count) || 0,
  })) || [];

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="h-6 w-6" />
              Dashboard License
            </h1>
            <p className="text-muted-foreground">
              Tổng quan tình trạng license hệ thống
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tổng License
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tất cả license trong hệ thống
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Sắp hết hạn (7 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats?.expiringIn7Days || 0}</div>
              <p className="text-xs text-orange-600/70 mt-1">
                Cần gia hạn ngay
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Sắp hết hạn (30 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats?.expiringIn30Days || 0}</div>
              <p className="text-xs text-yellow-600/70 mt-1">
                Cần theo dõi
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Đã hết hạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.expired || 0}</div>
              <p className="text-xs text-red-600/70 mt-1">
                Cần xử lý
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Phân bố theo loại License
              </CardTitle>
              <CardDescription>
                Tỷ lệ các loại license trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={typeData}
                colors={LICENSE_TYPE_COLORS}
                labels={LICENSE_TYPE_LABELS}
                title=""
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Phân bố theo trạng thái
              </CardTitle>
              <CardDescription>
                Tỷ lệ trạng thái license hiện tại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={statusData}
                colors={STATUS_COLORS}
                labels={STATUS_LABELS}
                title=""
              />
            </CardContent>
          </Card>
        </div>

        {/* Monthly Activations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Kích hoạt theo tháng
            </CardTitle>
            <CardDescription>
              Số lượng license được kích hoạt trong 12 tháng qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={activationData} />
          </CardContent>
        </Card>

        {/* Quick Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chi tiết thống kê
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {typeData.map((item, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: LICENSE_TYPE_COLORS[item.key] }}
                    />
                    <span className="text-sm font-medium">
                      {LICENSE_TYPE_LABELS[item.key] || item.key}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {stats?.total ? ((item.value / stats.total) * 100).toFixed(1) : 0}% tổng số
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
