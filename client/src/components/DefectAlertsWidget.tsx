import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DefectAlertsWidgetProps {
  productCode: string;
  stationName: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function DefectAlertsWidget({ 
  productCode, 
  stationName, 
  autoRefresh = true,
  refreshInterval = 10000
}: DefectAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<any[]>([]);

  const { data, isLoading, error, refetch } = trpc.ai.predict.detectDefects.useQuery({
    productCode,
    stationName,
    measurementValue: 0
  }, {
    enabled: false
  });

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    refetch();

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    if (data && data.isDefect) {
      setAlerts(prev => [
        {
          id: Date.now(),
          timestamp: new Date(),
          ...data
        },
        ...prev.slice(0, 9)
      ]);
    }
  }, [data]);

  const defectCount = alerts.filter(a => a.isDefect).length;
  const totalAlerts = alerts.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cảnh báo Lỗi</CardTitle>
            <CardDescription>{productCode} - {stationName}</CardDescription>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Lỗi</p>
              <p className="text-xl font-bold text-red-600">{defectCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">OK</p>
              <p className="text-xl font-bold text-green-600">{totalAlerts - defectCount}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="h-48">
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Chưa có cảnh báo
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.isDefect ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {alert.isDefect ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm font-medium">
                          {alert.isDefect ? alert.defectType : 'OK'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Giá trị: {alert.measurementValue?.toFixed(3)}
                      </p>
                      {alert.isDefect && alert.severity && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          {alert.severity}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(alert.timestamp).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {autoRefresh && (
          <div className="text-xs text-muted-foreground text-center">
            Tự động cập nhật mỗi {refreshInterval / 1000}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}
