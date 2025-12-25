/**
 * Low Stock Alert Component
 * Task: MMS-02
 * Hiển thị cảnh báo phụ tùng tồn kho thấp
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Package, AlertTriangle, ShoppingCart, TrendingDown, Clock, 
  ExternalLink, Bell, RefreshCw 
} from "lucide-react";

interface SparePartAlert {
  id: number;
  partCode: string;
  partName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  lastUsedDate: Date | null;
  avgMonthlyUsage: number;
  daysUntilStockout: number;
  severity: "warning" | "critical";
}

interface LowStockAlertProps {
  alerts: SparePartAlert[];
  onReorder?: (partId: number) => void;
  onRefresh?: () => void;
  onViewDetails?: (partId: number) => void;
  isLoading?: boolean;
}

export default function LowStockAlert({
  alerts,
  onReorder,
  onRefresh,
  onViewDetails,
  isLoading = false,
}: LowStockAlertProps) {
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts = alerts.filter(a => a.severity === "warning");

  const getStockPercentage = (current: number, min: number, reorder: number) => {
    const max = reorder * 2;
    return Math.min(100, (current / max) * 100);
  };

  const getStockColor = (severity: string) => {
    return severity === "critical" ? "bg-red-500" : "bg-yellow-500";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium">Tồn kho ổn định</p>
            <p className="text-muted-foreground">Không có phụ tùng nào cần đặt hàng</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cảnh báo nghiêm trọng!</AlertTitle>
          <AlertDescription>
            Có {criticalAlerts.length} phụ tùng dưới mức tồn kho tối thiểu cần đặt hàng ngay.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Cảnh báo Tồn kho Thấp
              </CardTitle>
              <CardDescription>
                {criticalAlerts.length} nghiêm trọng, {warningAlerts.length} cảnh báo
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.severity === "critical" 
                    ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
                    : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                        {alert.severity === "critical" ? "Nghiêm trọng" : "Cảnh báo"}
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {alert.partCode}
                      </span>
                    </div>
                    <h4 className="font-medium mb-2">{alert.partName}</h4>
                    
                    {/* Stock Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tồn kho hiện tại</span>
                        <span className="font-medium">
                          {alert.currentStock} / {alert.reorderPoint} (điểm đặt hàng)
                        </span>
                      </div>
                      <Progress 
                        value={getStockPercentage(alert.currentStock, alert.minStock, alert.reorderPoint)} 
                        className={`h-2 ${getStockColor(alert.severity)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Min: {alert.minStock}</span>
                        <span>Reorder: {alert.reorderPoint}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {alert.daysUntilStockout < 999 
                            ? `~${alert.daysUntilStockout} ngày` 
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <span>{alert.avgMonthlyUsage.toFixed(0)}/tháng</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>Đề xuất: {alert.suggestedOrderQty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      size="sm" 
                      onClick={() => onReorder?.(alert.id)}
                      className={alert.severity === "critical" ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Đặt hàng
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewDetails?.(alert.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
