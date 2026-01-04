import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CpkForecastingPage() {
  const [productCode, setProductCode] = useState('');
  const [stationName, setStationName] = useState('');
  const [historicalDays, setHistoricalDays] = useState(30);
  const [forecastDays, setForecastDays] = useState(7);
  const [forecastResult, setForecastResult] = useState<any>(null);

  const predictMutation = trpc.ai.predict.predictCpk.useMutation({
    onSuccess: (data) => {
      setForecastResult(data);
      toast.success('Dự đoán CPK thành công!');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const handlePredict = () => {
    if (!productCode || !stationName) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    predictMutation.mutate({
      productCode,
      stationName,
      historicalDays,
      forecastDays
    });
  };

  const chartData = forecastResult ? [
    ...forecastResult.historicalData.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString('vi-VN'),
      cpk: d.cpk,
      type: 'historical'
    })),
    ...forecastResult.predictions.map((p: any) => ({
      date: new Date(p.date).toLocaleDateString('vi-VN'),
      cpk: p.predictedCpk,
      upper: p.upperBound,
      lower: p.lowerBound,
      type: 'forecast'
    }))
  ] : [];

  const getTrendIcon = () => {
    if (!forecastResult) return null;
    const trend = forecastResult.trend;
    if (trend === 'increasing') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const getStatusIcon = () => {
    if (!forecastResult) return null;
    const avgPredicted = forecastResult.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / forecastResult.predictions.length;
    if (avgPredicted >= 1.67) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (avgPredicted >= 1.33) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dự đoán CPK</h1>
          <p className="text-muted-foreground">Dự đoán xu hướng CPK trong tương lai dựa trên dữ liệu lịch sử</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cấu hình Dự đoán</CardTitle>
            <CardDescription>Nhập thông tin để dự đoán CPK</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="historicalDays">Số ngày lịch sử</Label>
                <Select value={historicalDays.toString()} onValueChange={(v) => setHistoricalDays(parseInt(v))}>
                  <SelectTrigger id="historicalDays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="60">60 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forecastDays">Số ngày dự đoán</Label>
                <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                  <SelectTrigger id="forecastDays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="21">21 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handlePredict} disabled={predictMutation.isPending} className="w-full">
              {predictMutation.isPending ? 'Đang dự đoán...' : 'Dự đoán CPK'}
            </Button>
          </CardContent>
        </Card>

        {forecastResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPK Hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{forecastResult.currentCpk.toFixed(3)}</div>
                    {getStatusIcon()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPK Dự đoán TB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {(forecastResult.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / forecastResult.predictions.length).toFixed(3)}
                    </div>
                    {getTrendIcon()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Xu hướng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium capitalize">
                    {forecastResult.trend === 'increasing' && <span className="text-green-600">Tăng</span>}
                    {forecastResult.trend === 'decreasing' && <span className="text-red-600">Giảm</span>}
                    {forecastResult.trend === 'stable' && <span className="text-gray-600">Ổn định</span>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Độ tin cậy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(forecastResult.confidence * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ Dự đoán CPK</CardTitle>
                <CardDescription>Dữ liệu lịch sử và dự đoán tương lai với khoảng tin cậy</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={1.33} stroke="orange" strokeDasharray="3 3" label="CPK Min (1.33)" />
                    <ReferenceLine y={1.67} stroke="green" strokeDasharray="3 3" label="CPK Target (1.67)" />
                    
                    <Area
                      type="monotone"
                      dataKey="cpk"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="CPK Lịch sử"
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.1}
                      name="Giới hạn trên"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.1}
                      name="Giới hạn dưới"
                    />
                    <Line
                      type="monotone"
                      dataKey="cpk"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="CPK Dự đoán"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {forecastResult.recommendations && forecastResult.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Khuyến nghị</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {forecastResult.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
