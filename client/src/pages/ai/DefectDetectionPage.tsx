import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { AlertCircle, CheckCircle2, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function DefectDetectionPage() {
  const [productCode, setProductCode] = useState('');
  const [stationName, setStationName] = useState('');
  const [measurementValue, setMeasurementValue] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const detectMutation = trpc.ai.predict.detectDefects.useMutation({
    onSuccess: (data) => {
      setDetectionResult(data);
      if (data.isDefect) {
        toast.error(`Phát hiện lỗi: ${data.defectType}`);
      } else {
        toast.success('Không phát hiện lỗi');
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const handleDetect = () => {
    if (!productCode || !stationName || !measurementValue) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    detectMutation.mutate({
      productCode,
      stationName,
      measurementValue: parseFloat(measurementValue)
    });
  };

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (productCode && stationName && measurementValue) {
        handleDetect();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, productCode, stationName, measurementValue]);

  const chartData = detectionResult ? [
    ...detectionResult.historicalData.map((d: any) => ({
      index: d.index,
      value: d.value,
      isDefect: d.isDefect,
      type: 'historical'
    })),
    {
      index: detectionResult.historicalData.length,
      value: detectionResult.measurementValue,
      isDefect: detectionResult.isDefect,
      type: 'current'
    }
  ] : [];

  const getDefectColor = (isDefect: boolean) => isDefect ? '#ef4444' : '#10b981';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Phát hiện Lỗi Realtime</h1>
          <p className="text-muted-foreground">Giám sát và phát hiện lỗi sản xuất theo thời gian thực</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cấu hình Giám sát</CardTitle>
            <CardDescription>Nhập thông tin để phát hiện lỗi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productCode">Mã sản phẩm</Label>
                <Input
                  id="productCode"
                  placeholder="VD: PCB-001"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stationName">Công trạm</Label>
                <Input
                  id="stationName"
                  placeholder="VD: Solder Paste Printing"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurementValue">Giá trị đo</Label>
                <Input
                  id="measurementValue"
                  type="number"
                  step="0.001"
                  placeholder="VD: 1.234"
                  value={measurementValue}
                  onChange={(e) => setMeasurementValue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={handleDetect} disabled={detectMutation.isPending} className="flex-1">
                {detectMutation.isPending ? 'Đang phát hiện...' : 'Phát hiện Lỗi'}
              </Button>

              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Tắt Auto' : 'Bật Auto'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {detectionResult && (
          <>
            <Card className={detectionResult.isDefect ? 'border-red-500' : 'border-green-500'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {detectionResult.isDefect ? (
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    )}
                    <CardTitle>
                      {detectionResult.isDefect ? 'Phát hiện Lỗi' : 'Không có Lỗi'}
                    </CardTitle>
                  </div>
                  <Badge variant={detectionResult.isDefect ? 'destructive' : 'default'}>
                    Độ tin cậy: {(detectionResult.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Giá trị đo</p>
                    <p className="text-2xl font-bold">{detectionResult.measurementValue.toFixed(3)}</p>
                  </div>

                  {detectionResult.isDefect && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Loại lỗi</p>
                        <p className="text-lg font-medium text-red-600">{detectionResult.defectType}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Mức độ nghiêm trọng</p>
                        <Badge variant="destructive">{detectionResult.severity}</Badge>
                      </div>
                    </>
                  )}
                </div>

                {detectionResult.isDefect && detectionResult.reason && (
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Lý do:</p>
                    <p className="text-sm text-red-800 dark:text-red-200">{detectionResult.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ Phát hiện Lỗi</CardTitle>
                <CardDescription>Dữ liệu lịch sử và điểm đo hiện tại (màu đỏ = lỗi, xanh = OK)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" name="Mẫu" />
                    <YAxis dataKey="value" name="Giá trị" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    
                    {detectionResult.usl && (
                      <ReferenceLine y={detectionResult.usl} stroke="red" strokeDasharray="3 3" label="USL" />
                    )}
                    {detectionResult.lsl && (
                      <ReferenceLine y={detectionResult.lsl} stroke="red" strokeDasharray="3 3" label="LSL" />
                    )}
                    {detectionResult.ucl && (
                      <ReferenceLine y={detectionResult.ucl} stroke="orange" strokeDasharray="3 3" label="UCL" />
                    )}
                    {detectionResult.lcl && (
                      <ReferenceLine y={detectionResult.lcl} stroke="orange" strokeDasharray="3 3" label="LCL" />
                    )}
                    
                    <Scatter name="Dữ liệu" data={chartData}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getDefectColor(entry.isDefect)} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {detectionResult.recommendations && detectionResult.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Khuyến nghị Xử lý</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {detectionResult.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Activity className="h-5 w-5 text-primary mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tổng mẫu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{detectionResult.historicalData.length + 1}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Số lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {detectionResult.historicalData.filter((d: any) => d.isDefect).length + (detectionResult.isDefect ? 1 : 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tỷ lệ lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((detectionResult.historicalData.filter((d: any) => d.isDefect).length + (detectionResult.isDefect ? 1 : 0)) / (detectionResult.historicalData.length + 1) * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPK hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {detectionResult.currentCpk ? detectionResult.currentCpk.toFixed(3) : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
