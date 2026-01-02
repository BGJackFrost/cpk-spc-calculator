import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, Clock, RefreshCw, ChevronRight, Bell, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'wouter';

interface Alert {
  id: number;
  timestamp: Date;
  productCode: string;
  stationName: string;
  isDefect: boolean;
  defectType?: string;
  severity?: string;
  confidence: number;
  measurementValue?: number;
}

export default function AiDefectAlertsDashboardWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isPolling, setIsPolling] = useState(true);

  // Get production lines for monitoring
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Get recent defect predictions
  const { data: defectData, isLoading, refetch } = trpc.ai.predict.detectDefects.useQuery({
    productCode: productionLines?.[0]?.productId?.toString() || 'default',
    stationName: productionLines?.[0]?.name || 'default',
    measurementValue: Math.random() * 2 // Simulated measurement
  }, {
    enabled: !!productionLines && productionLines.length > 0,
    refetchInterval: isPolling ? 15000 : false
  });

  // Simulate receiving alerts from multiple sources
  useEffect(() => {
    if (defectData) {
      const newAlert: Alert = {
        id: Date.now(),
        timestamp: new Date(),
        productCode: productionLines?.[0]?.productId?.toString() || 'default',
        stationName: productionLines?.[0]?.name || 'default',
        isDefect: defectData.isDefect,
        defectType: defectData.defectType,
        severity: defectData.severity,
        confidence: defectData.confidence,
        measurementValue: defectData.measurementValue
      };
      
      setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
    }
  }, [defectData]);

  // Calculate stats
  const stats = {
    total: alerts.length,
    defects: alerts.filter(a => a.isDefect).length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-600 text-white">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500" />
            <div>
              <CardTitle>Cảnh báo Lỗi AI</CardTitle>
              <CardDescription>Phát hiện lỗi realtime</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsPolling(!isPolling)}
              className={isPolling ? 'text-green-500' : 'text-muted-foreground'}
            >
              {isPolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Link href="/defect-detection">
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Tổng</p>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-lg font-bold text-red-600">{stats.defects}</p>
            <p className="text-xs text-muted-foreground">Lỗi</p>
          </div>
          <div className="text-center p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <p className="text-lg font-bold text-orange-600">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-lg font-bold text-yellow-600">{stats.high}</p>
            <p className="text-xs text-muted-foreground">High</p>
          </div>
        </div>

        {/* Alerts List */}
        <ScrollArea className="h-64">
          {isLoading && alerts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
              <p className="text-sm">Không có cảnh báo</p>
              <p className="text-xs">Hệ thống đang hoạt động bình thường</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-all ${
                    alert.isDefect 
                      ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800' 
                      : 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {alert.isDefect ? (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {alert.isDefect ? alert.defectType || 'Lỗi phát hiện' : 'OK'}
                          </span>
                          {alert.isDefect && getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {alert.stationName}
                        </p>
                        {alert.measurementValue !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Giá trị: {alert.measurementValue.toFixed(3)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(alert.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isPolling ? 'Đang theo dõi...' : 'Đã tạm dừng'}</span>
          <span>Cập nhật mỗi 15s</span>
        </div>
      </CardContent>
    </Card>
  );
}
