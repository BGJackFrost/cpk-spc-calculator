/**
 * Radar Chart History Comparison Component
 * So sánh lịch sử Radar Chart theo thời gian để theo dõi xu hướng cải tiến
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, History, TrendingUp, TrendingDown, 
  ArrowRight, Play, Pause, SkipBack, SkipForward,
  Target, AlertTriangle, CheckCircle2
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { trpc } from "@/lib/trpc";
import { format, subDays, subWeeks, subMonths } from "date-fns";
import { vi } from "date-fns/locale";

interface HistoricalDataPoint {
  date: string;
  timestamp: number;
  cpk: number;
  cp: number;
  pp: number;
  ppk: number;
  ca: number;
  cr: number;
}

interface RadarChartHistoryComparisonProps {
  planId?: number;
  productionLineId?: number;
  onDateSelect?: (date: string) => void;
}

// Color palette for time periods
const PERIOD_COLORS = {
  current: "#3b82f6",
  previous: "#94a3b8",
  oldest: "#e2e8f0",
};

export default function RadarChartHistoryComparison({
  planId,
  productionLineId,
  onDateSelect,
}: RadarChartHistoryComparisonProps) {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days" | "1year">("30days");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<"overlay" | "side-by-side">("overlay");

  // Fetch historical data
  const { data: historyData, isLoading } = trpc.cpkHistory.getHistoricalTrend.useQuery(
    {
      planId: planId || 0,
      productionLineId,
      timeRange,
    },
    { enabled: !!planId }
  );

  // Generate mock data if no real data
  const mockHistoryData = useMemo((): HistoricalDataPoint[] => {
    if (historyData && historyData.length > 0) {
      return historyData.map((d: any) => ({
        date: d.date,
        timestamp: new Date(d.date).getTime(),
        cpk: d.cpk || 0,
        cp: d.cp || d.cpk * 1.05 || 0,
        pp: d.pp || d.cpk * 1.02 || 0,
        ppk: d.ppk || d.cpk * 0.98 || 0,
        ca: d.ca || 0.95,
        cr: d.cr || 0.65,
      }));
    }

    // Generate mock data
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : timeRange === "90days" ? 90 : 365;
    const data: HistoricalDataPoint[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = subDays(now, i);
      // Simulate improvement trend with some variation
      const baseCpk = 1.2 + (days - i) * 0.003 + Math.random() * 0.15 - 0.075;
      data.push({
        date: format(date, "yyyy-MM-dd"),
        timestamp: date.getTime(),
        cpk: Math.max(0.8, Math.min(2.0, baseCpk)),
        cp: Math.max(0.8, Math.min(2.0, baseCpk * 1.05)),
        pp: Math.max(0.8, Math.min(2.0, baseCpk * 1.02)),
        ppk: Math.max(0.8, Math.min(2.0, baseCpk * 0.98)),
        ca: Math.max(0.7, Math.min(1.0, 0.9 + Math.random() * 0.1)),
        cr: Math.max(0.5, Math.min(0.9, 0.7 - (days - i) * 0.001 + Math.random() * 0.1)),
      });
    }

    return data;
  }, [historyData, timeRange]);

  // Get data for selected dates or default to latest 3 periods
  const comparisonData = useMemo(() => {
    if (selectedDates.length > 0) {
      return mockHistoryData.filter(d => selectedDates.includes(d.date));
    }

    // Default: compare current, 1 week ago, 1 month ago
    const latest = mockHistoryData[mockHistoryData.length - 1];
    const weekAgo = mockHistoryData.find(d => {
      const diff = latest.timestamp - d.timestamp;
      return diff >= 6 * 24 * 60 * 60 * 1000 && diff <= 8 * 24 * 60 * 60 * 1000;
    }) || mockHistoryData[Math.max(0, mockHistoryData.length - 8)];
    const monthAgo = mockHistoryData.find(d => {
      const diff = latest.timestamp - d.timestamp;
      return diff >= 28 * 24 * 60 * 60 * 1000 && diff <= 32 * 24 * 60 * 60 * 1000;
    }) || mockHistoryData[0];

    return [monthAgo, weekAgo, latest].filter(Boolean);
  }, [mockHistoryData, selectedDates]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const metrics = [
      { key: "cpk", label: "CPK" },
      { key: "cp", label: "CP" },
      { key: "pp", label: "PP" },
      { key: "ppk", label: "PPK" },
      { key: "ca", label: "CA", scale: 2 },
      { key: "cr", label: "CR", invert: true, scale: 2 },
    ];

    return metrics.map(metric => {
      const dataPoint: any = { metric: metric.label };
      
      comparisonData.forEach((period, index) => {
        let value = period[metric.key as keyof HistoricalDataPoint] as number;
        
        // Normalize values
        if (metric.scale) value = value * metric.scale;
        if (metric.invert) value = (1 - value) * 2;
        
        const label = index === comparisonData.length - 1 ? "Hiện tại" :
                      index === comparisonData.length - 2 ? "Tuần trước" : "Tháng trước";
        dataPoint[label] = value;
      });
      
      return dataPoint;
    });
  }, [comparisonData]);

  // Calculate improvement metrics
  const improvementStats = useMemo(() => {
    if (comparisonData.length < 2) return null;

    const oldest = comparisonData[0];
    const latest = comparisonData[comparisonData.length - 1];

    const cpkChange = latest.cpk - oldest.cpk;
    const cpkChangePercent = (cpkChange / oldest.cpk) * 100;
    const crChange = oldest.cr - latest.cr; // CR lower is better
    const crChangePercent = (crChange / oldest.cr) * 100;

    return {
      cpkChange,
      cpkChangePercent,
      crChange,
      crChangePercent,
      improved: cpkChange > 0,
      oldestDate: oldest.date,
      latestDate: latest.date,
    };
  }, [comparisonData]);

  // Animation playback
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setPlayIndex(Math.max(0, playIndex - 1));
  };

  const handleNext = () => {
    setPlayIndex(Math.min(mockHistoryData.length - 1, playIndex + 1));
  };

  // Get CPK status
  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { label: "Xuất sắc", color: "text-green-600", bg: "bg-green-100" };
    if (cpk >= 1.33) return { label: "Tốt", color: "text-blue-600", bg: "bg-blue-100" };
    if (cpk >= 1.0) return { label: "Đạt", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Không đạt", color: "text-red-600", bg: "bg-red-100" };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            So sánh Lịch sử Radar Chart
          </h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi xu hướng cải tiến quy trình theo thời gian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 ngày</SelectItem>
              <SelectItem value="30days">30 ngày</SelectItem>
              <SelectItem value="90days">90 ngày</SelectItem>
              <SelectItem value="1year">1 năm</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={comparisonMode === "overlay" ? "default" : "outline"}
            size="sm"
            onClick={() => setComparisonMode("overlay")}
          >
            Chồng
          </Button>
          <Button
            variant={comparisonMode === "side-by-side" ? "default" : "outline"}
            size="sm"
            onClick={() => setComparisonMode("side-by-side")}
          >
            Song song
          </Button>
        </div>
      </div>

      {/* Improvement Summary */}
      {improvementStats && (
        <Card className={improvementStats.improved ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-red-200 bg-red-50/50 dark:bg-red-950/20"}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {improvementStats.improved ? (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                ) : (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">
                    Từ {format(new Date(improvementStats.oldestDate), "dd/MM/yyyy", { locale: vi })} đến {format(new Date(improvementStats.latestDate), "dd/MM/yyyy", { locale: vi })}
                  </p>
                  <p className={`text-lg font-semibold ${improvementStats.improved ? "text-green-600" : "text-red-600"}`}>
                    CPK {improvementStats.improved ? "tăng" : "giảm"} {Math.abs(improvementStats.cpkChange).toFixed(3)} ({improvementStats.cpkChangePercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {comparisonData[0]?.cpk.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tháng trước</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className={`h-6 w-6 ${improvementStats.improved ? "text-green-500" : "text-red-500"}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${getCpkStatus(comparisonData[comparisonData.length - 1]?.cpk || 0).color}`}>
                    {comparisonData[comparisonData.length - 1]?.cpk.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Hiện tại</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className={`grid ${comparisonMode === "side-by-side" ? "grid-cols-3" : "grid-cols-2"} gap-4`}>
        {/* Radar Chart Comparison */}
        {comparisonMode === "overlay" ? (
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                So sánh Radar theo thời gian
              </CardTitle>
              <CardDescription className="text-xs">
                Chồng các thời điểm để so sánh
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 2]} tick={{ fontSize: 10 }} />
                  {comparisonData.length >= 3 && (
                    <Radar
                      name="Tháng trước"
                      dataKey="Tháng trước"
                      stroke={PERIOD_COLORS.oldest}
                      fill={PERIOD_COLORS.oldest}
                      fillOpacity={0.1}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                    />
                  )}
                  {comparisonData.length >= 2 && (
                    <Radar
                      name="Tuần trước"
                      dataKey="Tuần trước"
                      stroke={PERIOD_COLORS.previous}
                      fill={PERIOD_COLORS.previous}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                    />
                  )}
                  <Radar
                    name="Hiện tại"
                    dataKey="Hiện tại"
                    stroke={PERIOD_COLORS.current}
                    fill={PERIOD_COLORS.current}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          // Side by side mode
          comparisonData.map((period, index) => (
            <Card key={period.date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {index === comparisonData.length - 1 ? "Hiện tại" :
                   index === comparisonData.length - 2 ? "Tuần trước" : "Tháng trước"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {format(new Date(period.date), "dd/MM/yyyy", { locale: vi })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={[
                    { metric: "CPK", value: period.cpk },
                    { metric: "CP", value: period.cp },
                    { metric: "PP", value: period.pp },
                    { metric: "PPK", value: period.ppk },
                    { metric: "CA", value: period.ca * 2 },
                    { metric: "CR", value: (1 - period.cr) * 2 },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 2]} tick={{ fontSize: 9 }} />
                    <Radar
                      dataKey="value"
                      stroke={index === comparisonData.length - 1 ? PERIOD_COLORS.current : 
                              index === comparisonData.length - 2 ? PERIOD_COLORS.previous : PERIOD_COLORS.oldest}
                      fill={index === comparisonData.length - 1 ? PERIOD_COLORS.current : 
                            index === comparisonData.length - 2 ? PERIOD_COLORS.previous : PERIOD_COLORS.oldest}
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <Badge className={getCpkStatus(period.cpk).bg + " " + getCpkStatus(period.cpk).color}>
                    CPK: {period.cpk.toFixed(2)} - {getCpkStatus(period.cpk).label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Trend Line Chart */}
        <Card className={comparisonMode === "overlay" ? "col-span-1" : "col-span-3"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Xu hướng CPK theo thời gian
            </CardTitle>
            <CardDescription className="text-xs">
              Biểu đồ đường thể hiện sự thay đổi của các chỉ số
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={comparisonMode === "overlay" ? 350 : 250}>
              <LineChart data={mockHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => format(new Date(value), "dd/MM")}
                />
                <YAxis domain={[0.8, 2]} tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd/MM/yyyy", { locale: vi })}
                />
                <Legend />
                <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "Mục tiêu 1.33", fontSize: 10 }} />
                <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Tối thiểu 1.0", fontSize: 10 }} />
                <Line type="monotone" dataKey="cpk" name="CPK" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cp" name="CP" stroke="#22c55e" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="ppk" name="PPK" stroke="#f59e0b" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Slider */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline Animation
          </CardTitle>
          <CardDescription className="text-xs">
            Kéo để xem sự thay đổi theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevious}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <Slider
                value={[playIndex]}
                max={mockHistoryData.length - 1}
                step={1}
                onValueChange={([value]) => setPlayIndex(value)}
              />
            </div>
            <div className="text-sm text-muted-foreground w-24 text-right">
              {mockHistoryData[playIndex] && format(new Date(mockHistoryData[playIndex].date), "dd/MM/yyyy")}
            </div>
          </div>
          
          {/* Current point info */}
          {mockHistoryData[playIndex] && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Ngày</p>
                  <p className="font-medium">{format(new Date(mockHistoryData[playIndex].date), "dd/MM/yyyy", { locale: vi })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPK</p>
                  <p className={`font-bold ${getCpkStatus(mockHistoryData[playIndex].cpk).color}`}>
                    {mockHistoryData[playIndex].cpk.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CP</p>
                  <p className="font-medium">{mockHistoryData[playIndex].cp.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PPK</p>
                  <p className="font-medium">{mockHistoryData[playIndex].ppk.toFixed(3)}</p>
                </div>
              </div>
              <Badge className={getCpkStatus(mockHistoryData[playIndex].cpk).bg}>
                {getCpkStatus(mockHistoryData[playIndex].cpk).label}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Chi tiết so sánh các thời điểm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Thời điểm</th>
                  <th className="text-right py-2 px-3">CPK</th>
                  <th className="text-right py-2 px-3">CP</th>
                  <th className="text-right py-2 px-3">PP</th>
                  <th className="text-right py-2 px-3">PPK</th>
                  <th className="text-right py-2 px-3">CA</th>
                  <th className="text-right py-2 px-3">CR</th>
                  <th className="text-center py-2 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((period, index) => {
                  const status = getCpkStatus(period.cpk);
                  const prevPeriod = comparisonData[index - 1];
                  const cpkDiff = prevPeriod ? period.cpk - prevPeriod.cpk : 0;
                  
                  return (
                    <tr key={period.date} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium">
                            {index === comparisonData.length - 1 ? "Hiện tại" :
                             index === comparisonData.length - 2 ? "Tuần trước" : "Tháng trước"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(period.date), "dd/MM/yyyy", { locale: vi })}
                          </p>
                        </div>
                      </td>
                      <td className={`text-right py-2 px-3 font-bold ${status.color}`}>
                        {period.cpk.toFixed(3)}
                        {cpkDiff !== 0 && (
                          <span className={`text-xs ml-1 ${cpkDiff > 0 ? "text-green-500" : "text-red-500"}`}>
                            ({cpkDiff > 0 ? "+" : ""}{cpkDiff.toFixed(3)})
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2 px-3">{period.cp.toFixed(3)}</td>
                      <td className="text-right py-2 px-3">{period.pp.toFixed(3)}</td>
                      <td className="text-right py-2 px-3">{period.ppk.toFixed(3)}</td>
                      <td className="text-right py-2 px-3">{(period.ca * 100).toFixed(1)}%</td>
                      <td className="text-right py-2 px-3">{(period.cr * 100).toFixed(1)}%</td>
                      <td className="text-center py-2 px-3">
                        <Badge className={status.bg + " " + status.color}>
                          {status.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
