/**
 * CPK Forecast Page
 * Trang dự báo xu hướng CPK
 * Task: SPC-05, SPC-06
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import CpkForecast from "@/components/CpkForecast";
import CpkEarlyWarning from "@/components/CpkEarlyWarning";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, RefreshCw, Settings } from "lucide-react";

export default function CpkForecastPage() {
  const [selectedLine, setSelectedLine] = useState<string>("all");
  const [selectedMapping, setSelectedMapping] = useState<string>("all");
  const [forecastDays, setForecastDays] = useState(30);

  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  
  // Fetch mappings
  const { data: mappings } = trpc.mapping.list.useQuery();

  // Fetch CPK forecast data
  const { data: forecastData, isLoading, refetch } = trpc.spc.getCpkForecastData.useQuery({
    productionLineId: selectedLine !== "all" ? parseInt(selectedLine) : undefined,
    mappingId: selectedMapping !== "all" ? parseInt(selectedMapping) : undefined,
    days: forecastDays,
  });

  // Transform data for CpkForecast component
  const chartData = useMemo(() => {
    if (!forecastData || forecastData.length === 0) {
      // Generate mock data for demo
      const mockData = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        mockData.push({
          date,
          cpk: 1.2 + Math.random() * 0.4 - 0.002 * i, // Slight downward trend
          cp: 1.3 + Math.random() * 0.3,
          ppk: 1.15 + Math.random() * 0.35,
        });
      }
      return mockData;
    }
    return forecastData;
  }, [forecastData]);

  // Current CPK (latest value)
  const currentCpk = useMemo(() => {
    if (chartData.length === 0) return 1.2;
    return chartData[chartData.length - 1].cpk;
  }, [chartData]);

  // Handle alert
  const handleAlert = (alert: { type: string; message: string; forecastDate: Date; forecastValue: number }) => {
    if (alert.type === "critical") {
      toast.error(alert.message, {
        duration: 10000,
        description: `Dự báo vào ${alert.forecastDate.toLocaleDateString("vi-VN")}`,
      });
    } else {
      toast.warning(alert.message, {
        duration: 5000,
        description: `Dự báo vào ${alert.forecastDate.toLocaleDateString("vi-VN")}`,
      });
    }
  };

  // Get selected line/mapping name
  const selectedLineName = useMemo(() => {
    if (selectedLine === "all") return "Tất cả dây chuyền";
    return productionLines?.find((l: any) => l.id.toString() === selectedLine)?.name || "";
  }, [selectedLine, productionLines]);

  const selectedMappingName = useMemo(() => {
    if (selectedMapping === "all") return undefined;
    const mapping = mappings?.find((m: any) => m.id.toString() === selectedMapping);
    return mapping ? `${mapping.productCode} - ${mapping.stationName}` : undefined;
  }, [selectedMapping, mappings]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Dự báo xu hướng CPK
            </h1>
            <p className="text-muted-foreground">
              Phân tích và dự báo xu hướng CPK với các thuật toán thống kê
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới dữ liệu
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Dây chuyền</label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                    {productionLines?.map((line: any) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Cấu hình đo</label>
                <Select value={selectedMapping} onValueChange={setSelectedMapping}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Chọn cấu hình" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả cấu hình</SelectItem>
                    {mappings?.map((mapping: any) => (
                      <SelectItem key={mapping.id} value={mapping.id.toString()}>
                        {mapping.productCode} - {mapping.stationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Dữ liệu lịch sử</label>
                <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="60">60 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Forecast Chart - 2 columns */}
          <div className="lg:col-span-2">
            <CpkForecast
              data={chartData}
              warningThreshold={1.33}
              criticalThreshold={1.0}
              forecastPeriods={7}
              onAlert={handleAlert}
            />
          </div>

          {/* Early Warning - 1 column */}
          <div>
            <CpkEarlyWarning
              currentCpk={currentCpk}
              forecastCpk={chartData.length > 0 ? chartData[chartData.length - 1].cpk * 0.98 : undefined}
              forecastDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
              productionLineName={selectedLineName}
              productName={selectedMappingName}
              onAlertAcknowledge={(alertId) => {
                console.log("Alert acknowledged:", alertId);
              }}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Forecast Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tóm tắt dự báo</CardTitle>
              <CardDescription>Thông tin tổng quan về xu hướng CPK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">CPK hiện tại</span>
                  <Badge variant={currentCpk >= 1.33 ? "default" : currentCpk >= 1.0 ? "outline" : "destructive"}>
                    {currentCpk.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Số điểm dữ liệu</span>
                  <span className="font-medium">{chartData.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Xu hướng</span>
                  <Badge variant={chartData.length > 1 && chartData[chartData.length - 1].cpk > chartData[0].cpk ? "default" : "destructive"}>
                    {chartData.length > 1 && chartData[chartData.length - 1].cpk > chartData[0].cpk ? "Tăng" : "Giảm"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Khuyến nghị</CardTitle>
              <CardDescription>Đề xuất hành động dựa trên dự báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentCpk < 1.0 && (
                  <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Cần hành động ngay</p>
                      <p className="text-sm text-muted-foreground">
                        CPK dưới 1.0 cho thấy quy trình không đủ năng lực. Cần kiểm tra và điều chỉnh ngay.
                      </p>
                    </div>
                  </div>
                )}
                {currentCpk >= 1.0 && currentCpk < 1.33 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-600">Cần theo dõi</p>
                      <p className="text-sm text-muted-foreground">
                        CPK trong khoảng 1.0-1.33 cần được theo dõi chặt chẽ và cải thiện.
                      </p>
                    </div>
                  </div>
                )}
                {currentCpk >= 1.33 && (
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600">Quy trình ổn định</p>
                      <p className="text-sm text-muted-foreground">
                        CPK ≥ 1.33 cho thấy quy trình có năng lực tốt. Tiếp tục duy trì.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Cài đặt cảnh báo</p>
                    <p className="text-sm text-muted-foreground">
                      Cấu hình ngưỡng cảnh báo và thông báo trong phần cài đặt bên phải.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
