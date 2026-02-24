import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Line
} from "recharts";
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw, Loader2 } from "lucide-react";

interface NtfPredictionProps {
  productionLineId?: number;
}

export default function NtfPrediction({ productionLineId }: NtfPredictionProps) {
  const [days, setDays] = useState(30);

  const predictMutation = trpc.ntfConfig.predictNtfRate.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const handlePredict = () => {
    predictMutation.mutate({ productionLineId, days });
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge variant="destructive">Rủi ro Nghiêm trọng</Badge>;
      case 'high':
        return <Badge className="bg-red-500">Rủi ro Cao</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Rủi ro Trung bình</Badge>;
      default:
        return <Badge className="bg-green-500">Rủi ro Thấp</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-5 h-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-5 h-5 text-green-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'Đang tăng';
      case 'decreasing':
        return 'Đang giảm';
      default:
        return 'Ổn định';
    }
  };

  // Combine historical and prediction data for chart
  const chartData = predictMutation.data ? [
    ...predictMutation.data.historicalData.slice(-14).map(d => ({
      date: d.date,
      actual: d.ntfRate,
      predicted: null,
    })),
    ...predictMutation.data.prediction.predictions.map((p: any) => ({
      date: p.date,
      actual: null,
      predicted: p.predictedNtfRate,
      confidence: p.confidence,
    })),
  ] : [];

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>Dự đoán NTF Rate (AI)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="60">60 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePredict} disabled={predictMutation.isPending}>
              {predictMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Dự đoán
            </Button>
          </div>
        </div>
        <CardDescription>
          Sử dụng AI để phân tích xu hướng và dự đoán NTF rate 7 ngày tới
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!predictMutation.data ? (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nhấn "Dự đoán" để AI phân tích dữ liệu và đưa ra dự đoán</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Xu hướng</span>
                    {getTrendIcon(predictMutation.data.prediction.trend)}
                  </div>
                  <div className="text-xl font-bold mt-1">
                    {getTrendText(predictMutation.data.prediction.trend)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Mức độ rủi ro</div>
                  <div className="mt-2">
                    {getRiskBadge(predictMutation.data.prediction.riskLevel)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Dự đoán trung bình</div>
                  <div className="text-xl font-bold mt-1">
                    {(predictMutation.data.prediction.predictions.reduce((sum: number, p: any) => sum + p.predictedNtfRate, 0) / 7).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      value !== null && typeof value === 'number' ? `${value.toFixed(1)}%` : '-',
                      name === 'actual' ? 'Thực tế' : 'Dự đoán'
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={30} stroke="#dc2626" strokeDasharray="5 5" label={{ value: 'Critical', fill: '#dc2626', fontSize: 10 }} />
                  <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="url(#actualGradient)" strokeWidth={2} connectNulls={false} />
                  <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#8b5cf6' }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Early Warnings */}
            {predictMutation.data.prediction.earlyWarnings?.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Cảnh báo sớm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {predictMutation.data.prediction.earlyWarnings.map((warning: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {predictMutation.data.prediction.recommendations?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Khuyến nghị
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {predictMutation.data.prediction.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">{index + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Key Factors */}
            {predictMutation.data.prediction.keyFactors?.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Yếu tố ảnh hưởng chính:</p>
                <div className="flex flex-wrap gap-2">
                  {predictMutation.data.prediction.keyFactors.map((factor: string, index: number) => (
                    <Badge key={index} variant="outline">{factor}</Badge>
                  ))}
                </div>
              </div>
            )}

            {predictMutation.data.fallback && (
              <p className="text-xs text-muted-foreground">
                * Dự đoán dựa trên phương pháp Moving Average do AI không khả dụng
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
