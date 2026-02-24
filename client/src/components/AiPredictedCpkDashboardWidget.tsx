import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Loader2, Brain, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Link } from 'wouter';

export default function AiPredictedCpkDashboardWidget() {
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  
  // Get list of production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  
  // Get CPK predictions for all lines
  const { data: predictions, isLoading, refetch } = trpc.ai.predict.batchPredict.useQuery({
    items: productionLines?.slice(0, 5).map(line => ({
      productCode: line.productId?.toString() || 'default',
      stationName: line.name,
      historicalDays: 14,
      forecastDays: 7
    })) || []
  }, {
    enabled: !!productionLines && productionLines.length > 0,
    refetchInterval: 60000 // Refresh every minute
  });

  // Calculate summary stats
  const summaryStats = predictions ? {
    totalLines: predictions.length,
    atRisk: predictions.filter((p: any) => p.predictions?.some((pred: any) => pred.predictedCpk < 1.33)).length,
    improving: predictions.filter((p: any) => p.trend === 'increasing').length,
    declining: predictions.filter((p: any) => p.trend === 'decreasing').length,
  } : { totalLines: 0, atRisk: 0, improving: 0, declining: 0 };

  // Prepare chart data
  const chartData = predictions?.slice(0, 5).map((p: any, index: number) => ({
    name: productionLines?.[index]?.name || `Line ${index + 1}`,
    currentCpk: p.currentCpk || 1.5,
    predictedCpk: p.predictions?.[0]?.predictedCpk || 1.5,
    trend: p.trend,
    confidence: p.confidence || 0.85,
  })) || [];

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Dự đoán CPK</CardTitle>
          </div>
          <CardDescription>Dự đoán CPK cho các dây chuyền sản xuất</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <div>
              <CardTitle>AI Dự đoán CPK</CardTitle>
              <CardDescription>Dự đoán CPK cho các dây chuyền sản xuất</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/cpk-forecasting">
              <Button variant="outline" size="sm">
                Xem chi tiết <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{summaryStats.totalLines}</p>
            <p className="text-xs text-muted-foreground">Dây chuyền</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{summaryStats.atRisk}</p>
            <p className="text-xs text-muted-foreground">Có nguy cơ</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{summaryStats.improving}</p>
            <p className="text-xs text-muted-foreground">Đang tăng</p>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{summaryStats.declining}</p>
            <p className="text-xs text-muted-foreground">Đang giảm</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 2]} tick={{ fontSize: 10 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-blue-600">Hiện tại: {data.currentCpk?.toFixed(3)}</p>
                          <p className="text-sm text-purple-600">Dự đoán: {data.predictedCpk?.toFixed(3)}</p>
                          <p className="text-xs text-muted-foreground">Độ tin cậy: {(data.confidence * 100).toFixed(0)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={1.33} stroke="orange" strokeDasharray="3 3" label={{ value: 'Min 1.33', fontSize: 10 }} />
                <Area type="monotone" dataKey="currentCpk" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCurrent)" />
                <Area type="monotone" dataKey="predictedCpk" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPredicted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Không có dữ liệu dự đoán
          </div>
        )}

        {/* Line Details */}
        <div className="space-y-2">
          {chartData.slice(0, 3).map((line, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {getTrendIcon(line.trend)}
                <span className="text-sm font-medium">{line.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-mono">
                    <span className="text-muted-foreground">Hiện:</span> {line.currentCpk?.toFixed(3)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">
                    <span className="text-muted-foreground">Dự đoán:</span>{' '}
                    <span className={line.predictedCpk < 1.33 ? 'text-red-500' : 'text-green-500'}>
                      {line.predictedCpk?.toFixed(3)}
                    </span>
                  </p>
                </div>
                {line.predictedCpk < 1.33 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
