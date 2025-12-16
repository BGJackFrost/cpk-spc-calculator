import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Package, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function LowStockWidget() {
  const { data: alerts, isLoading } = trpc.spareParts.getLowStockAlerts.useQuery();

  const criticalCount = alerts?.filter(a => a.alertLevel === "critical").length || 0;
  const warningCount = alerts?.filter(a => a.alertLevel === "warning").length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cảnh báo tồn kho
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cảnh báo tồn kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-3">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">Tồn kho ổn định</p>
            <p className="text-xs text-muted-foreground">Không có phụ tùng nào cần đặt hàng</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={criticalCount > 0 ? "border-red-200 bg-red-50/50" : "border-yellow-200 bg-yellow-50/50"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? "text-red-500" : "text-yellow-500"}`} />
            Cảnh báo tồn kho
          </CardTitle>
          <div className="flex gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} nghiêm trọng
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                {warningCount} cảnh báo
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>Phụ tùng cần đặt hàng bổ sung</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {alerts.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  item.alertLevel === "critical" ? "bg-red-100" : "bg-yellow-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.partNumber} • {item.category}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <p className={`text-sm font-bold ${item.alertLevel === "critical" ? "text-red-600" : "text-yellow-600"}`}>
                    {item.currentStock} {item.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Min: {item.minStock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t">
          <Link href="/spare-parts">
            <Button variant="outline" size="sm" className="w-full">
              Xem tất cả phụ tùng
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
