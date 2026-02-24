/**
 * DefectParetoChart - Component hiển thị biểu đồ Pareto cho defects
 * Hỗ trợ phân tích 80/20 (80% lỗi từ 20% nguyên nhân)
 * Với bộ lọc thời gian, production line và export PDF/Excel
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, AlertCircle } from 'lucide-react';
import { WidgetFilterBar, type WidgetFilters } from './WidgetFilterBar';
import { useToast } from '@/hooks/use-toast';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DefectParetoChartProps {
  showControls?: boolean;
  compact?: boolean;
  productionLineId?: number;
  showExport?: boolean;
}

export function DefectParetoChart({ 
  showControls = true, 
  compact = false, 
  productionLineId: initialLineId,
  showExport = true 
}: DefectParetoChartProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<WidgetFilters>({
    periodDays: 30,
    productionLineId: initialLineId,
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = trpc.paretoChart.getDefectPareto.useQuery({
    days: filters.periodDays,
    productionLineId: filters.productionLineId,
    limit: 10,
  });

  const { data: dashboardSummary } = trpc.paretoChart.getDashboardSummary.useQuery({
    days: filters.periodDays,
  });

  const exportPdfMutation = trpc.paretoChart.exportPdf.useMutation();
  const exportExcelMutation = trpc.paretoChart.exportExcel.useMutation();

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const result = await exportPdfMutation.mutateAsync({
        days: filters.periodDays,
        productionLineId: filters.productionLineId,
        limit: 10,
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
        limit: 10,
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

  const paretoData = data?.data || [];
  const summary = data?.summary;

  return (
    <Card className={compact ? 'h-full' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pareto Chart - Top Defects
            </CardTitle>
            <CardDescription>
              Phân tích 80/20: {summary?.itemsIn80Percent || 0} loại lỗi chiếm 80% tổng số
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
              <div className="text-2xl font-bold">{summary.totalDefects}</div>
              <div className="text-xs text-muted-foreground">Tổng lỗi</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.totalCategories}</div>
              <div className="text-xs text-muted-foreground">Loại lỗi</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{summary.itemsIn80Percent}</div>
              <div className="text-xs text-muted-foreground">Trong 80%</div>
            </div>
            <div className="text-center p-2 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.percentageOfCategories.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">% Categories</div>
            </div>
          </div>
        )}

        {/* Dashboard Summary */}
        {dashboardSummary && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <div className="flex-1">
              <span className="text-sm">Top lỗi: </span>
              <span className="font-medium">{dashboardSummary.topCategory}</span>
              <span className="text-muted-foreground text-sm"> ({dashboardSummary.topCategoryCount} lần)</span>
            </div>
          </div>
        )}

        {/* Pareto Chart */}
        {paretoData.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="categoryName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left"
                  label={{ value: 'Số lượng', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]}
                  label={{ value: '% Tích lũy', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.categoryName}</p>
                          <p className="text-sm">Số lượng: <span className="font-medium">{data.count}</span></p>
                          <p className="text-sm">Tỷ lệ: <span className="font-medium">{data.percentage.toFixed(1)}%</span></p>
                          <p className="text-sm">Tích lũy: <span className="font-medium">{data.cumulativePercentage.toFixed(1)}%</span></p>
                          {data.isIn80Percent && (
                            <Badge variant="destructive" className="mt-1">Trong 80%</Badge>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="right" y={80} stroke="#f97316" strokeDasharray="5 5" label="80%" />
                <Bar 
                  yAxisId="left" 
                  dataKey="count" 
                  name="Số lượng"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="cumulativePercentage" 
                  name="% Tích lũy"
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Không có dữ liệu lỗi trong khoảng thời gian đã chọn
          </div>
        )}

        {/* Top Defects Table */}
        {paretoData.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Chi tiết top lỗi (Nhóm A - 80%)</h4>
            <div className="space-y-2">
              {paretoData.filter(d => d.isIn80Percent).map((defect, index) => (
                <div 
                  key={defect.categoryId} 
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: `${defect.color}20` }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: defect.color }}
                    />
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <span className="text-sm">{defect.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{defect.count} lỗi</span>
                    <Badge variant="outline">{defect.percentage.toFixed(1)}%</Badge>
                    <span className="text-muted-foreground">→ {defect.cumulativePercentage.toFixed(1)}%</span>
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

export default DefectParetoChart;
