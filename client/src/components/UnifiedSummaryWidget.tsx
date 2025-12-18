import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Target,
  Gauge,
} from "lucide-react";

interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
}

function MiniLineChart({ data, color, height = 40 }: MiniChartProps) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      {/* Last point indicator */}
      <circle
        cx={100}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

export default function UnifiedSummaryWidget() {
  const [, navigate] = useLocation();
  
  // Get OEE data for last 7 days
  const { data: oeeRecords } = trpc.oee.list.useQuery({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Get CPK data for last 7 days
  const { data: spcRecords } = trpc.spc.list.useQuery({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Calculate summary stats
  const stats = useMemo(() => {
    // OEE stats
    const oeeValues = oeeRecords?.map((r) => Number(r.oee)) || [];
    const avgOee = oeeValues.length > 0 
      ? oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length 
      : 0;
    
    // Get daily OEE averages for chart
    const oeeByDay: Record<string, number[]> = {};
    oeeRecords?.forEach((r) => {
      const day = new Date(r.recordDate).toISOString().split("T")[0];
      if (!oeeByDay[day]) oeeByDay[day] = [];
      oeeByDay[day].push(Number(r.oee));
    });
    const oeeDaily = Object.keys(oeeByDay).sort().map((day) => {
      const values = oeeByDay[day];
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    // CPK stats
    const cpkValues = spcRecords?.map((r) => Number(r.cpk)).filter((v) => !isNaN(v)) || [];
    const avgCpk = cpkValues.length > 0 
      ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length 
      : 0;
    
    // Get daily CPK averages for chart
    const cpkByDay: Record<string, number[]> = {};
    spcRecords?.forEach((r) => {
      const day = new Date(r.measurementDate).toISOString().split("T")[0];
      if (!cpkByDay[day]) cpkByDay[day] = [];
      const cpk = Number(r.cpk);
      if (!isNaN(cpk)) cpkByDay[day].push(cpk);
    });
    const cpkDaily = Object.keys(cpkByDay).sort().map((day) => {
      const values = cpkByDay[day];
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    // Calculate trends
    const oeeTrend = oeeDaily.length >= 2 
      ? oeeDaily[oeeDaily.length - 1] - oeeDaily[oeeDaily.length - 2]
      : 0;
    const cpkTrend = cpkDaily.length >= 2 
      ? cpkDaily[cpkDaily.length - 1] - cpkDaily[cpkDaily.length - 2]
      : 0;

    // Count alerts
    const oeeAlerts = oeeValues.filter((v) => v < 70).length;
    const cpkAlerts = cpkValues.filter((v) => v < 1.0).length;

    return {
      avgOee,
      avgCpk,
      oeeDaily,
      cpkDaily,
      oeeTrend,
      cpkTrend,
      oeeAlerts,
      cpkAlerts,
      totalAlerts: oeeAlerts + cpkAlerts,
    };
  }, [oeeRecords, spcRecords]);

  const getOeeStatus = (oee: number) => {
    if (oee >= 85) return { color: "text-green-600", bg: "bg-green-100", label: "Tốt" };
    if (oee >= 70) return { color: "text-yellow-600", bg: "bg-yellow-100", label: "Trung bình" };
    return { color: "text-red-600", bg: "bg-red-100", label: "Cần cải thiện" };
  };

  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.33) return { color: "text-green-600", bg: "bg-green-100", label: "Tốt" };
    if (cpk >= 1.0) return { color: "text-yellow-600", bg: "bg-yellow-100", label: "Chấp nhận" };
    return { color: "text-red-600", bg: "bg-red-100", label: "Cần cải thiện" };
  };

  const oeeStatus = getOeeStatus(stats.avgOee);
  const cpkStatus = getCpkStatus(stats.avgCpk);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Tổng hợp OEE & CPK
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/unified-dashboard")}
          >
            Xem chi tiết
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* OEE Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">OEE Trung bình</span>
              </div>
              <Badge className={`${oeeStatus.bg} ${oeeStatus.color}`}>
                {oeeStatus.label}
              </Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${oeeStatus.color}`}>
                {stats.avgOee.toFixed(1)}%
              </span>
              {stats.oeeTrend !== 0 && (
                <span className={`flex items-center text-sm ${stats.oeeTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.oeeTrend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(stats.oeeTrend).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="h-10">
              <MiniLineChart 
                data={stats.oeeDaily.length > 0 ? stats.oeeDaily : [0]} 
                color="#3b82f6" 
              />
            </div>
            <p className="text-xs text-muted-foreground">Xu hướng 7 ngày qua</p>
          </div>

          {/* CPK Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">CPK Trung bình</span>
              </div>
              <Badge className={`${cpkStatus.bg} ${cpkStatus.color}`}>
                {cpkStatus.label}
              </Badge>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${cpkStatus.color}`}>
                {stats.avgCpk.toFixed(2)}
              </span>
              {stats.cpkTrend !== 0 && (
                <span className={`flex items-center text-sm ${stats.cpkTrend > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.cpkTrend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(stats.cpkTrend).toFixed(2)}
                </span>
              )}
            </div>
            <div className="h-10">
              <MiniLineChart 
                data={stats.cpkDaily.length > 0 ? stats.cpkDaily : [0]} 
                color="#8b5cf6" 
              />
            </div>
            <p className="text-xs text-muted-foreground">Xu hướng 7 ngày qua</p>
          </div>

          {/* Alerts Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Cảnh báo</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${stats.totalAlerts > 0 ? "text-orange-600" : "text-green-600"}`}>
                {stats.totalAlerts}
              </span>
              <span className="text-sm text-muted-foreground">cảnh báo</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">OEE thấp (&lt;70%)</span>
                <Badge variant={stats.oeeAlerts > 0 ? "destructive" : "outline"}>
                  {stats.oeeAlerts}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CPK thấp (&lt;1.0)</span>
                <Badge variant={stats.cpkAlerts > 0 ? "destructive" : "outline"}>
                  {stats.cpkAlerts}
                </Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate("/unified-dashboard")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Phân tích chi tiết
            </Button>
          </div>
        </div>

        {/* Comparison Chart */}
        {(stats.oeeDaily.length > 1 || stats.cpkDaily.length > 1) && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">So sánh xu hướng OEE & CPK (7 ngày)</span>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-muted-foreground">OEE (%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-purple-500"></div>
                  <span className="text-muted-foreground">CPK</span>
                </div>
              </div>
            </div>
            <DualAxisChart 
              oeeData={stats.oeeDaily} 
              cpkData={stats.cpkDaily} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dual Axis Chart Component
interface DualAxisChartProps {
  oeeData: number[];
  cpkData: number[];
}

function DualAxisChart({ oeeData, cpkData }: DualAxisChartProps) {
  const height = 120;
  const width = 100; // percentage
  const padding = { top: 10, right: 40, bottom: 20, left: 40 };

  // Calculate scales
  const oeeMin = Math.min(...oeeData, 0);
  const oeeMax = Math.max(...oeeData, 100);
  const cpkMin = Math.min(...cpkData, 0);
  const cpkMax = Math.max(...cpkData, 2);

  const oeeRange = oeeMax - oeeMin || 1;
  const cpkRange = cpkMax - cpkMin || 1;

  const chartHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(oeeData.length, cpkData.length);

  // Generate OEE points
  const oeePoints = oeeData.map((value, index) => {
    const x = padding.left + (index / (maxPoints - 1 || 1)) * (width - padding.left - padding.right);
    const y = padding.top + chartHeight - ((value - oeeMin) / oeeRange) * chartHeight;
    return `${x}%,${y}`;
  }).join(" ");

  // Generate CPK points (scaled to same visual range)
  const cpkPoints = cpkData.map((value, index) => {
    const x = padding.left + (index / (maxPoints - 1 || 1)) * (width - padding.left - padding.right);
    const y = padding.top + chartHeight - ((value - cpkMin) / cpkRange) * chartHeight;
    return `${x}%,${y}`;
  }).join(" ");

  // Y-axis labels
  const oeeLabels = [oeeMin, (oeeMin + oeeMax) / 2, oeeMax].map(v => v.toFixed(0));
  const cpkLabels = [cpkMin, (cpkMin + cpkMax) / 2, cpkMax].map(v => v.toFixed(1));

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, i) => (
          <line
            key={i}
            x1={`${padding.left}%`}
            y1={padding.top + chartHeight * (1 - ratio)}
            x2={`${width - padding.right}%`}
            y2={padding.top + chartHeight * (1 - ratio)}
            stroke="#e5e7eb"
            strokeDasharray="4,4"
          />
        ))}

        {/* OEE line */}
        {oeeData.length > 0 && (
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={oeePoints}
          />
        )}

        {/* CPK line */}
        {cpkData.length > 0 && (
          <polyline
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            points={cpkPoints}
          />
        )}

        {/* OEE points */}
        {oeeData.map((value, index) => {
          const x = padding.left + (index / (maxPoints - 1 || 1)) * (width - padding.left - padding.right);
          const y = padding.top + chartHeight - ((value - oeeMin) / oeeRange) * chartHeight;
          return (
            <g key={`oee-${index}`}>
              <circle cx={`${x}%`} cy={y} r="4" fill="#3b82f6" />
              <title>OEE: {value.toFixed(1)}%</title>
            </g>
          );
        })}

        {/* CPK points */}
        {cpkData.map((value, index) => {
          const x = padding.left + (index / (maxPoints - 1 || 1)) * (width - padding.left - padding.right);
          const y = padding.top + chartHeight - ((value - cpkMin) / cpkRange) * chartHeight;
          return (
            <g key={`cpk-${index}`}>
              <circle cx={`${x}%`} cy={y} r="4" fill="#8b5cf6" />
              <title>CPK: {value.toFixed(2)}</title>
            </g>
          );
        })}

        {/* Left Y-axis labels (OEE) */}
        {oeeLabels.map((label, i) => (
          <text
            key={`oee-label-${i}`}
            x="2%"
            y={padding.top + chartHeight * (1 - i / 2) + 4}
            fontSize="10"
            fill="#3b82f6"
            textAnchor="start"
          >
            {label}%
          </text>
        ))}

        {/* Right Y-axis labels (CPK) */}
        {cpkLabels.map((label, i) => (
          <text
            key={`cpk-label-${i}`}
            x="98%"
            y={padding.top + chartHeight * (1 - i / 2) + 4}
            fontSize="10"
            fill="#8b5cf6"
            textAnchor="end"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
