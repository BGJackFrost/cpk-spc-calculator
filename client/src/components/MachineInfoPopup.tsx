import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { X, ExternalLink, Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface MachineInfoPopupProps {
  machineId: number;
  machineName: string;
  machineCode?: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function MachineInfoPopup({ machineId, machineName, machineCode, position, onClose }: MachineInfoPopupProps) {
  const today = new Date().toISOString().split('T')[0];
  const { data: yieldStats, isLoading } = trpc.aviAoiEnhancement.yieldStats.getByMachine.useQuery({
    machineId,
    startDate: today,
    endDate: today,
  });

  const yieldRate = parseFloat(yieldStats?.avgYieldRate || '0');
  const statusColor = yieldRate >= 95 ? 'bg-green-500' : yieldRate >= 85 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card className="absolute z-50 w-72 shadow-lg border-2" style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%) translateY(-10px)' }}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
          <CardTitle className="text-sm font-medium">{machineName}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {machineCode && <div className="text-xs text-muted-foreground">Mã máy: {machineCode}</div>}

        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded p-2 text-center">
                <div className="text-lg font-bold">{yieldStats?.totalInspections || 0}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <div className={`text-lg font-bold ${yieldRate >= 95 ? 'text-green-600' : yieldRate >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {yieldRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Yield</div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">{yieldStats?.totalOk || 0}</span>
                <span className="text-muted-foreground text-xs">OK</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium">{yieldStats?.totalNg || 0}</span>
                <span className="text-muted-foreground text-xs">NG</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{yieldStats?.totalNtf || 0}</span>
                <span className="text-muted-foreground text-xs">NTF</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">First Pass Yield:</span>
              <Badge variant={parseFloat(yieldStats?.avgFirstPassYield || '0') >= 90 ? 'default' : 'destructive'}>
                {parseFloat(yieldStats?.avgFirstPassYield || '0').toFixed(1)}%
              </Badge>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Link href={`/avi-aoi-history?machineId=${machineId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-1" />
              Lịch sử
            </Button>
          </Link>
          <Link href={`/avi-aoi-dashboard?machineId=${machineId}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-1" />
              Chi tiết
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default MachineInfoPopup;
