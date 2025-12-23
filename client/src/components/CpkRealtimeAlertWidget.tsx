/**
 * CPK Realtime Alert Widget
 * Hiển thị cảnh báo CPK realtime theo ca làm việc
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  Sun,
  Moon,
  Sunrise,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ShiftCpkData {
  shift: string;
  shiftName: string;
  avgCpk: number | null;
  minCpk: number | null;
  maxCpk: number | null;
  sampleCount: number;
}

interface CpkAlert {
  id: string;
  planId: number;
  planName: string;
  shift: string;
  cpk: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

const SHIFT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  night: Moon,
};

const SHIFT_COLORS = {
  morning: 'bg-amber-100 text-amber-800 border-amber-300',
  afternoon: 'bg-orange-100 text-orange-800 border-orange-300',
  night: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

export function CpkRealtimeAlertWidget({ className }: { className?: string }) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [cpkAlerts, setCpkAlerts] = useState<CpkAlert[]>([]);
  const [cpkThreshold, setCpkThreshold] = useState(1.0);
  
  // Lấy danh sách kế hoạch SPC
  const { data: spcPlans = [] } = trpc.spcPlan.list.useQuery();
  
  // Lấy cấu hình cảnh báo
  const { data: alertSettings } = trpc.settings.getAlertSettings.useQuery();
  
  // Lấy dữ liệu so sánh CPK theo ca
  const { data: shiftComparison, refetch: refetchShiftComparison, isLoading } = trpc.spc.compareShiftCpk.useQuery(
    { planId: selectedPlanId!, days: 7 },
    { enabled: !!selectedPlanId, refetchInterval: 60000 } // Refresh mỗi phút
  );
  
  // Mutation để trigger aggregation
  const aggregateMutation = trpc.spc.aggregatePlanAllPeriods.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật dữ liệu tổng hợp');
      refetchShiftComparison();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });
  
  // Cập nhật threshold từ settings
  useEffect(() => {
    if (alertSettings?.cpkWarningThreshold) {
      setCpkThreshold(alertSettings.cpkWarningThreshold / 100);
    }
  }, [alertSettings]);
  
  // Tự động chọn plan đầu tiên
  useEffect(() => {
    if (spcPlans.length > 0 && !selectedPlanId) {
      const activePlan = spcPlans.find((p: any) => p.status === 'active');
      if (activePlan) {
        setSelectedPlanId(activePlan.id);
      }
    }
  }, [spcPlans, selectedPlanId]);
  
  // Kiểm tra và tạo cảnh báo khi CPK thấp
  useEffect(() => {
    if (shiftComparison?.shifts) {
      const newAlerts: CpkAlert[] = [];
      const selectedPlan = spcPlans.find((p: any) => p.id === selectedPlanId);
      
      shiftComparison.shifts.forEach((shift: ShiftCpkData) => {
        if (shift.avgCpk !== null && shift.avgCpk < cpkThreshold) {
          const alertId = `${selectedPlanId}-${shift.shift}-${Date.now()}`;
          
          // Kiểm tra xem đã có alert tương tự chưa
          const existingAlert = cpkAlerts.find(a => 
            a.planId === selectedPlanId && 
            a.shift === shift.shift && 
            !a.acknowledged
          );
          
          if (!existingAlert) {
            newAlerts.push({
              id: alertId,
              planId: selectedPlanId!,
              planName: selectedPlan?.name || `Plan ${selectedPlanId}`,
              shift: shift.shift,
              cpk: shift.avgCpk,
              threshold: cpkThreshold,
              timestamp: new Date(),
              acknowledged: false,
            });
          }
        }
      });
      
      if (newAlerts.length > 0) {
        setCpkAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      }
    }
  }, [shiftComparison, cpkThreshold, selectedPlanId, spcPlans]);
  
  const handleAcknowledgeAlert = (alertId: string) => {
    setCpkAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };
  
  const handleRefresh = () => {
    if (selectedPlanId) {
      aggregateMutation.mutate({ planId: selectedPlanId });
    }
  };
  
  const getCpkStatus = (cpk: number | null) => {
    if (cpk === null) return { label: 'N/A', color: 'bg-gray-100 text-gray-600' };
    if (cpk >= 1.67) return { label: 'Xuất sắc', color: 'bg-green-100 text-green-800' };
    if (cpk >= 1.33) return { label: 'Tốt', color: 'bg-blue-100 text-blue-800' };
    if (cpk >= 1.0) return { label: 'Chấp nhận', color: 'bg-yellow-100 text-yellow-800' };
    if (cpk >= 0.67) return { label: 'Cần cải thiện', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Nguy hiểm', color: 'bg-red-100 text-red-800' };
  };
  
  const getCpkProgress = (cpk: number | null) => {
    if (cpk === null) return 0;
    return Math.min(100, (cpk / 2) * 100);
  };
  
  const unacknowledgedCount = cpkAlerts.filter(a => !a.acknowledged).length;
  
  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className={cn(
              "w-5 h-5",
              unacknowledgedCount > 0 && "text-red-500 animate-pulse"
            )} />
            Cảnh báo CPK Realtime
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unacknowledgedCount}
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={aggregateMutation.isPending || !selectedPlanId}
          >
            <RefreshCw className={cn(
              "w-4 h-4",
              aggregateMutation.isPending && "animate-spin"
            )} />
          </Button>
        </div>
        
        {/* Plan selector */}
        <div className="mt-2">
          <select
            className="w-full p-2 border rounded-md text-sm"
            value={selectedPlanId || ''}
            onChange={(e) => setSelectedPlanId(parseInt(e.target.value) || null)}
          >
            <option value="">Chọn kế hoạch SPC...</option>
            {spcPlans.map((plan: any) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} {plan.status === 'active' ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="shifts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shifts">So sánh Ca</TabsTrigger>
            <TabsTrigger value="alerts">
              Cảnh báo
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unacknowledgedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="shifts" className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải dữ liệu...
              </div>
            ) : !selectedPlanId ? (
              <div className="text-center py-8 text-muted-foreground">
                Vui lòng chọn kế hoạch SPC
              </div>
            ) : !shiftComparison?.shifts ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có dữ liệu. Nhấn nút làm mới để cập nhật.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Shift comparison cards */}
                {shiftComparison.shifts.map((shift: ShiftCpkData) => {
                  const ShiftIcon = SHIFT_ICONS[shift.shift as keyof typeof SHIFT_ICONS] || Clock;
                  const status = getCpkStatus(shift.avgCpk);
                  const isLow = shift.avgCpk !== null && shift.avgCpk < cpkThreshold;
                  
                  return (
                    <div
                      key={shift.shift}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isLow ? "bg-red-50 border-red-300" : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ShiftIcon className="w-4 h-4" />
                          <span className="font-medium">{shift.shiftName}</span>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>CPK Trung bình:</span>
                          <span className={cn(
                            "font-mono font-bold",
                            isLow && "text-red-600"
                          )}>
                            {shift.avgCpk?.toFixed(3) || 'N/A'}
                          </span>
                        </div>
                        
                        <Progress 
                          value={getCpkProgress(shift.avgCpk)} 
                          className={cn(
                            "h-2",
                            isLow && "[&>div]:bg-red-500"
                          )}
                        />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Min: {shift.minCpk?.toFixed(3) || 'N/A'}</span>
                          <span>Max: {shift.maxCpk?.toFixed(3) || 'N/A'}</span>
                          <span>Mẫu: {shift.sampleCount}</span>
                        </div>
                      </div>
                      
                      {isLow && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          CPK dưới ngưỡng {cpkThreshold}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Best/Worst shift summary */}
                {shiftComparison.bestShift && shiftComparison.worstShift && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="p-2 rounded bg-green-50 border border-green-200">
                      <div className="text-xs text-green-600 font-medium">Ca tốt nhất</div>
                      <div className="font-bold text-green-800">
                        {shiftComparison.bestShift.shiftName}
                      </div>
                      <div className="text-sm text-green-700">
                        CPK: {shiftComparison.bestShift.avgCpk?.toFixed(3)}
                      </div>
                    </div>
                    
                    <div className="p-2 rounded bg-orange-50 border border-orange-200">
                      <div className="text-xs text-orange-600 font-medium">Ca cần cải thiện</div>
                      <div className="font-bold text-orange-800">
                        {shiftComparison.worstShift.shiftName}
                      </div>
                      <div className="text-sm text-orange-700">
                        CPK: {shiftComparison.worstShift.avgCpk?.toFixed(3)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-4">
            <ScrollArea className="h-[300px]">
              {cpkAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Không có cảnh báo CPK</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cpkAlerts.map((alert) => {
                    const ShiftIcon = SHIFT_ICONS[alert.shift as keyof typeof SHIFT_ICONS] || Clock;
                    
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          alert.acknowledged 
                            ? "bg-muted/50 opacity-60" 
                            : "bg-red-50 border-red-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3" />
                            </Badge>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{alert.planName}</span>
                                <Badge className={SHIFT_COLORS[alert.shift as keyof typeof SHIFT_COLORS]}>
                                  <ShiftIcon className="w-3 h-3 mr-1" />
                                  {alert.shift === 'morning' ? 'Ca sáng' : 
                                   alert.shift === 'afternoon' ? 'Ca chiều' : 'Ca đêm'}
                                </Badge>
                              </div>
                              
                              <p className="text-sm mt-1">
                                CPK <span className="font-mono font-bold text-red-600">{alert.cpk.toFixed(3)}</span> 
                                {' '}dưới ngưỡng {alert.threshold}
                              </p>
                              
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(alert.timestamp).toLocaleString('vi-VN')}
                              </div>
                            </div>
                          </div>
                          
                          {!alert.acknowledged && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              title="Xác nhận"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Flashing indicator for critical alerts */}
      {unacknowledgedCount > 0 && (
        <div className="absolute top-0 right-0 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
      )}
    </Card>
  );
}

export default CpkRealtimeAlertWidget;
