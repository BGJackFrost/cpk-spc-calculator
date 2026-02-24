import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, FileSpreadsheet, FileText, 
  Plus, X, GitCompare, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ComparisonItem {
  id: string;
  productCode: string;
  stationName: string;
  result?: any;
  error?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CpkComparisonPage() {
  const [items, setItems] = useState<ComparisonItem[]>([
    { id: '1', productCode: '', stationName: '' },
    { id: '2', productCode: '', stationName: '' }
  ]);
  const [historicalDays, setHistoricalDays] = useState(30);
  const [forecastDays, setForecastDays] = useState(7);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonItem[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();

  const predictMutation = trpc.ai.predict.predictCpk.useMutation();

  const addItem = () => {
    if (items.length >= 8) {
      toast.error('Tối đa 8 mục so sánh');
      return;
    }
    setItems([...items, { id: Date.now().toString(), productCode: '', stationName: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 2) {
      toast.error('Cần ít nhất 2 mục để so sánh');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: 'productCode' | 'stationName', value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCompare = async () => {
    const validItems = items.filter(item => item.productCode && item.stationName);
    if (validItems.length < 2) {
      toast.error('Cần ít nhất 2 mục có đầy đủ thông tin để so sánh');
      return;
    }

    setIsComparing(true);
    setComparisonResults([]);

    try {
      const results = await Promise.all(
        validItems.map(async (item) => {
          try {
            const result = await predictMutation.mutateAsync({
              productCode: item.productCode,
              stationName: item.stationName,
              historicalDays,
              forecastDays
            });
            return { ...item, result, error: undefined };
          } catch (error: any) {
            return { ...item, result: null, error: error.message };
          }
        })
      );

      setComparisonResults(results);
      toast.success('So sánh hoàn tất!');
    } catch (error) {
      toast.error('Lỗi khi so sánh');
    } finally {
      setIsComparing(false);
    }
  };

  // Prepare chart data
  const barChartData = comparisonResults
    .filter(r => r.result)
    .map((r, idx) => ({
      name: `${r.productCode}\n${r.stationName}`,
      shortName: r.productCode.slice(0, 10),
      currentCpk: r.result.currentCpk,
      predictedCpk: r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length,
      trend: r.result.trend,
      confidence: r.result.confidence,
      color: COLORS[idx % COLORS.length]
    }));

  const radarChartData = comparisonResults
    .filter(r => r.result)
    .map((r, idx) => ({
      subject: r.productCode.slice(0, 10),
      cpk: r.result.currentCpk,
      predicted: r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length,
      confidence: r.result.confidence * 2,
      fullMark: 2
    }));

  // Prepare timeline data
  const timelineData: any[] = [];
  if (comparisonResults.length > 0 && comparisonResults[0]?.result) {
    const maxLength = Math.max(
      ...comparisonResults.filter(r => r.result).map(r => 
        r.result.historicalData.length + r.result.predictions.length
      )
    );

    for (let i = 0; i < maxLength; i++) {
      const point: any = { index: i };
      comparisonResults.filter(r => r.result).forEach((r, idx) => {
        const historical = r.result.historicalData;
        const predictions = r.result.predictions;
        
        if (i < historical.length) {
          point[`cpk_${idx}`] = historical[i].cpk;
        } else if (i - historical.length < predictions.length) {
          point[`cpk_${idx}`] = predictions[i - historical.length].predictedCpk;
        }
      });
      timelineData.push(point);
    }
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { color: 'bg-green-500', text: 'Xuất sắc' };
    if (cpk >= 1.33) return { color: 'bg-blue-500', text: 'Tốt' };
    if (cpk >= 1.0) return { color: 'bg-yellow-500', text: 'Cần cải thiện' };
    return { color: 'bg-red-500', text: 'Nguy hiểm' };
  };

  // Find weakest points
  const weakestPoints = comparisonResults
    .filter(r => r.result)
    .map(r => ({
      ...r,
      avgPredicted: r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length
    }))
    .sort((a, b) => a.avgPredicted - b.avgPredicted);

  const handleExportExcel = () => {
    if (comparisonResults.length === 0) {
      toast.error('Chưa có dữ liệu để xuất');
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = comparisonResults.filter(r => r.result).map((r, idx) => ({
      'STT': idx + 1,
      'Mã sản phẩm': r.productCode,
      'Công trạm': r.stationName,
      'CPK Hiện tại': r.result.currentCpk.toFixed(3),
      'CPK Dự đoán TB': (r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length).toFixed(3),
      'Xu hướng': r.result.trend === 'increasing' ? 'Tăng' : r.result.trend === 'decreasing' ? 'Giảm' : 'Ổn định',
      'Độ tin cậy': `${(r.result.confidence * 100).toFixed(1)}%`,
      'Đánh giá': getCpkStatus(r.result.currentCpk).text
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'So sánh tổng quan');

    // Weakest points sheet
    const weakestData = weakestPoints.slice(0, 5).map((r, idx) => ({
      'Thứ hạng': idx + 1,
      'Mã sản phẩm': r.productCode,
      'Công trạm': r.stationName,
      'CPK Dự đoán': r.avgPredicted.toFixed(3),
      'Cần hành động': r.avgPredicted < 1.33 ? 'Có' : 'Không'
    }));
    const wsWeakest = XLSX.utils.json_to_sheet(weakestData);
    XLSX.utils.book_append_sheet(wb, wsWeakest, 'Điểm yếu');

    XLSX.writeFile(wb, `CPK_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Đã xuất file Excel');
  };

  const handleExportPdf = async () => {
    if (comparisonResults.length === 0 || !chartRef.current) {
      toast.error('Chưa có dữ liệu để xuất');
      return;
    }

    try {
      toast.info('Đang tạo PDF...');
      
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;

      pdf.setFontSize(18);
      pdf.text('Báo cáo So sánh Dự đoán CPK', margin, 20);
      
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`, margin, 28);
      pdf.setTextColor(0, 0, 0);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', margin, 35, imgWidth, Math.min(imgHeight, 150));

      pdf.save(`CPK_Comparison_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Đã xuất file PDF');
    } catch (error) {
      toast.error('Lỗi khi xuất PDF');
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-purple-500" />
              So sánh Dự đoán CPK
            </h1>
            <p className="text-muted-foreground">So sánh dự đoán CPK giữa nhiều sản phẩm/trạm để phát hiện điểm yếu</p>
          </div>
          {comparisonResults.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Xuất Excel
              </Button>
              <Button variant="outline" onClick={handleExportPdf}>
                <FileText className="w-4 h-4 mr-2" />Xuất PDF
              </Button>
            </div>
          )}
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình So sánh</CardTitle>
            <CardDescription>Chọn các sản phẩm/trạm để so sánh (tối đa 8)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Số ngày lịch sử</Label>
                <Select value={historicalDays.toString()} onValueChange={(v) => setHistoricalDays(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="60">60 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số ngày dự đoán</Label>
                <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="21">21 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Mã sản phẩm"
                        value={item.productCode}
                        onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                      />
                      <Input
                        placeholder="Công trạm"
                        value={item.stationName}
                        onChange={(e) => updateItem(item.id, 'stationName', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 2}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={addItem} disabled={items.length >= 8}>
                <Plus className="h-4 w-4 mr-2" />Thêm mục
              </Button>
              <Button onClick={handleCompare} disabled={isComparing} className="flex-1">
                {isComparing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang so sánh...</>
                ) : (
                  <><GitCompare className="h-4 w-4 mr-2" />So sánh CPK</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {comparisonResults.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {comparisonResults.filter(r => r.result).map((r, idx) => {
                const avgPred = r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length;
                const status = getCpkStatus(avgPred);
                return (
                  <Card key={r.id} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium truncate">{r.productCode}</CardTitle>
                        {getTrendIcon(r.result.trend)}
                      </div>
                      <CardDescription className="truncate">{r.stationName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Hiện tại</p>
                          <p className="text-lg font-bold">{r.result.currentCpk.toFixed(3)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Dự đoán</p>
                          <p className="text-lg font-bold">{avgPred.toFixed(3)}</p>
                        </div>
                      </div>
                      <Badge className={`mt-2 ${status.color}`}>{status.text}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Weakest Points Alert */}
            {weakestPoints.length > 0 && weakestPoints[0].avgPredicted < 1.33 && (
              <Card className="border-red-500 bg-red-50 dark:bg-red-950">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-red-700 dark:text-red-300">Điểm yếu cần cải thiện</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weakestPoints.filter(r => r.avgPredicted < 1.33).slice(0, 3).map((r, idx) => (
                      <div key={r.id} className="flex items-center justify-between p-2 bg-white dark:bg-red-900 rounded">
                        <span className="font-medium">{r.productCode} - {r.stationName}</span>
                        <Badge variant="destructive">CPK: {r.avgPredicted.toFixed(3)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div ref={chartRef} className="space-y-6 bg-white dark:bg-gray-900 p-4 rounded-lg">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>So sánh CPK Hiện tại vs Dự đoán</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="shortName" />
                      <YAxis domain={[0, 2]} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={1.33} stroke="orange" strokeDasharray="3 3" label="Min 1.33" />
                      <ReferenceLine y={1.67} stroke="green" strokeDasharray="3 3" label="Target 1.67" />
                      <Bar dataKey="currentCpk" name="CPK Hiện tại" fill="#3b82f6" />
                      <Bar dataKey="predictedCpk" name="CPK Dự đoán" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Timeline Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng CPK theo thời gian</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={1.33} stroke="orange" strokeDasharray="3 3" />
                      {comparisonResults.filter(r => r.result).map((r, idx) => (
                        <Line
                          key={r.id}
                          type="monotone"
                          dataKey={`cpk_${idx}`}
                          name={r.productCode}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              {radarChartData.length >= 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Radar So sánh Tổng quan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarChartData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 2]} />
                        <Radar name="CPK Hiện tại" dataKey="cpk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="CPK Dự đoán" dataKey="predicted" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết So sánh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Sản phẩm</th>
                        <th className="text-left p-2">Công trạm</th>
                        <th className="text-right p-2">CPK Hiện tại</th>
                        <th className="text-right p-2">CPK Dự đoán</th>
                        <th className="text-center p-2">Xu hướng</th>
                        <th className="text-right p-2">Độ tin cậy</th>
                        <th className="text-center p-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResults.filter(r => r.result).map((r, idx) => {
                        const avgPred = r.result.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / r.result.predictions.length;
                        const status = getCpkStatus(avgPred);
                        return (
                          <tr key={r.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                {r.productCode}
                              </div>
                            </td>
                            <td className="p-2">{r.stationName}</td>
                            <td className="p-2 text-right font-mono">{r.result.currentCpk.toFixed(3)}</td>
                            <td className="p-2 text-right font-mono">{avgPred.toFixed(3)}</td>
                            <td className="p-2 text-center">{getTrendIcon(r.result.trend)}</td>
                            <td className="p-2 text-right">{(r.result.confidence * 100).toFixed(1)}%</td>
                            <td className="p-2 text-center">
                              <Badge className={status.color}>{status.text}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
