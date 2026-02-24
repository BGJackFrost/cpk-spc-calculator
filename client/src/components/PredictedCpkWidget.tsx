import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PredictedCpkWidgetProps {
  productCode: string;
  stationName: string;
  forecastDays?: number;
}

export default function PredictedCpkWidget({ productCode, stationName, forecastDays = 7 }: PredictedCpkWidgetProps) {
  const { data, isLoading, error } = trpc.ai.predict.predictCpk.useQuery({
    productCode,
    stationName,
    historicalDays: 30,
    forecastDays
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dự đoán CPK</CardTitle>
          <CardDescription>{productCode} - {stationName}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dự đoán CPK</CardTitle>
          <CardDescription>{productCode} - {stationName}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Không thể tải dữ liệu
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    ...data.historicalData.slice(-7).map((d: any) => ({
      date: new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      cpk: d.cpk,
      type: 'historical'
    })),
    ...data.predictions.map((p: any) => ({
      date: new Date(p.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      cpk: p.predictedCpk,
      type: 'forecast'
    }))
  ];

  const avgPredicted = data.predictions.reduce((sum: number, p: any) => sum + p.predictedCpk, 0) / data.predictions.length;

  const getTrendIcon = () => {
    if (data.trend === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (data.trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dự đoán CPK</CardTitle>
            <CardDescription>{productCode} - {stationName}</CardDescription>
          </div>
          {getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Hiện tại</p>
            <p className="text-2xl font-bold">{data.currentCpk.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dự đoán TB</p>
            <p className="text-2xl font-bold">{avgPredicted.toFixed(3)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
            <Tooltip />
            <ReferenceLine y={1.33} stroke="orange" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="cpk" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="text-xs text-muted-foreground">
          Xu hướng: <span className="font-medium capitalize">{data.trend === 'increasing' ? 'Tăng' : data.trend === 'decreasing' ? 'Giảm' : 'Ổn định'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
