/**
 * FloorPlanHeatMap - Component hiển thị bản đồ nhiệt yield rate theo vùng nhà xưởng
 * Với bộ lọc thời gian, production line và export PDF/Excel
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WidgetFilterBar, type WidgetFilters } from './WidgetFilterBar';
import { useToast } from '@/hooks/use-toast';

interface FloorPlanHeatMapProps {
  showControls?: boolean;
  compact?: boolean;
  showExport?: boolean;
}

export function FloorPlanHeatMap({ 
  showControls = true, 
  compact = false,
  showExport = true 
}: FloorPlanHeatMapProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<WidgetFilters>({
    periodDays: 7,
    productionLineId: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = trpc.heatMapYield.getFloorPlanYield.useQuery({
    days: filters.periodDays,
    productionLineId: filters.productionLineId,
  });

  const { data: problemZones } = trpc.heatMapYield.getTopProblemZones.useQuery({
    days: filters.periodDays,
    limit: 5,
  });

  const exportPdfMutation = trpc.heatMapYield.exportPdf.useMutation();
  const exportExcelMutation = trpc.heatMapYield.exportExcel.useMutation();

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const result = await exportPdfMutation.mutateAsync({
        days: filters.periodDays,
        productionLineId: filters.productionLineId,
      });
      
      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(result.html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({
        title: "Xuất PDF thành công",
        description: "Cửa sổ in đã được mở. Chọn 'Save as PDF' để lưu file.",
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất PDF",
        description: "Không thể xuất báo cáo PDF. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const result = await exportExcelMutation.mutateAsync({
        days: filters.periodDays,
        productionLineId: filters.productionLineId,
      });
      
      // Download Excel file
      const byteCharacters = atob(result.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Xuất Excel thành công",
        description: `File ${result.filename} đã được tải xuống.`,
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất Excel",
        description: "Không thể xuất báo cáo Excel. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'h-full' : ''}>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const zones = data?.zones || [];
  const summary = data?.summary;

  return (
    <Card className={compact ? 'h-full' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Heat Map Yield - Floor Plan
            </CardTitle>
            <CardDescription>
              Bản đồ nhiệt hiển thị yield rate theo vùng nhà xưởng
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Bar */}
        {showControls && (
          <div className="mb-4">
            <WidgetFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              showProductionLine={true}
              showExport={showExport}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
              isExporting={isExporting}
              compact={compact}
            />
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.totalZones}</div>
              <div className="text-xs text-muted-foreground">Tổng khu vực</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.averageYield.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Yield TB</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.excellentZones}</div>
              <div className="text-xs text-muted-foreground">Xuất sắc</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.problemZones}</div>
              <div className="text-xs text-muted-foreground">Có vấn đề</div>
            </div>
          </div>
        )}

        {/* Floor Plan Grid */}
        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg p-4 min-h-[300px]">
          <TooltipProvider>
            <div className="grid grid-cols-4 gap-2">
              {zones.map((zone) => (
                <Tooltip key={zone.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="relative p-3 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                      style={{ backgroundColor: zone.color }}
                    >
                      <div className="text-white text-sm font-medium truncate">{zone.name}</div>
                      <div className="text-white/90 text-xl font-bold">{zone.yieldRate.toFixed(1)}%</div>
                      <div className="text-white/70 text-xs">{zone.totalSamples} mẫu</div>
                      {zone.yieldRate < 90 && (
                        <AlertTriangle className="absolute top-1 right-1 h-4 w-4 text-white" />
                      )}
                      {zone.yieldRate >= 98 && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-white" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <div className="font-semibold">{zone.name}</div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Yield Rate:</span>{' '}
                        <span className="font-medium">{zone.yieldRate.toFixed(2)}%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">CPK TB:</span>{' '}
                        <span className="font-medium">{zone.avgCpk.toFixed(3)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tổng mẫu:</span>{' '}
                        <span className="font-medium">{zone.totalSamples}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Pass:</span>{' '}
                        <span className="font-medium text-green-600">{zone.passCount}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Công trạm:</span>{' '}
                        <span className="font-medium">{zone.workstationCount}</span>
                      </div>
                      <Badge variant={zone.yieldRate >= 90 ? 'default' : 'destructive'}>
                        {zone.statusLabel}
                      </Badge>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {zones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Không có dữ liệu yield trong khoảng thời gian đã chọn
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span>≥98% Xuất sắc</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }} />
            <span>95-98% Tốt</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
            <span>90-95% Cảnh báo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
            <span>85-90% Quan ngại</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span>&lt;85% Nghiêm trọng</span>
          </div>
        </div>

        {/* Problem Zones */}
        {problemZones && problemZones.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Top khu vực có vấn đề
            </h4>
            <div className="space-y-2">
              {problemZones.map((zone, index) => (
                <div key={zone.productionLineId} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <span className="text-sm">{zone.lineName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{zone.failCount}/{zone.totalSamples} fail</span>
                    <Badge variant="destructive">{zone.failRate.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FloorPlanHeatMap;
