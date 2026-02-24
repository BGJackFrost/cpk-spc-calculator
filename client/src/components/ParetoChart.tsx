/**
 * ParetoChart - Biểu đồ Pareto cho phân tích 80/20 nguyên nhân dừng máy
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell 
} from "recharts";
import { AlertTriangle, TrendingUp, Clock, Wrench } from "lucide-react";

export interface DowntimeRecord {
  id: number;
  category: string;
  reason: string;
  durationMinutes: number;
  count: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

interface ParetoChartProps {
  data: DowntimeRecord[];
  title?: string;
  description?: string;
  showTable?: boolean;
  maxItems?: number;
  onCategoryClick?: (category: string) => void;
}

const severityColors: Record<string, string> = {
  minor: '#22c55e',
  moderate: '#f59e0b',
  major: '#f97316',
  critical: '#ef4444',
};

const barColors = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16',
];

export function ParetoChart({
  data,
  title = "Biểu đồ Pareto - Nguyên nhân dừng máy",
  description = "Phân tích 80/20 các nguyên nhân chính gây dừng máy",
  showTable = true,
  maxItems = 10,
  onCategoryClick,
}: ParetoChartProps) {
  // Process data for Pareto chart
  const paretoData = useMemo(() => {
    // Group by category and sum duration
    const categoryMap = new Map<string, { duration: number; count: number; severity: string }>();
    
    data.forEach(record => {
      const existing = categoryMap.get(record.category);
      if (existing) {
        existing.duration += record.durationMinutes;
        existing.count += record.count;
      } else {
        categoryMap.set(record.category, {
          duration: record.durationMinutes,
          count: record.count,
          severity: record.severity,
        });
      }
    });

    // Convert to array and sort by duration descending
    const sorted = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        duration: data.duration,
        count: data.count,
        severity: data.severity,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, maxItems);

    // Calculate cumulative percentage
    const totalDuration = sorted.reduce((sum, item) => sum + item.duration, 0);
    let cumulative = 0;

    return sorted.map((item, index) => {
      cumulative += item.duration;
      const cumulativePercent = (cumulative / totalDuration) * 100;
      const percent = (item.duration / totalDuration) * 100;
      
      // Determine ABC category based on cumulative percentage
      let abcCategory: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercent <= 80) abcCategory = 'A';
      else if (cumulativePercent <= 95) abcCategory = 'B';

      return {
        ...item,
        percent: Math.round(percent * 10) / 10,
        cumulativePercent: Math.round(cumulativePercent * 10) / 10,
        abcCategory,
        color: barColors[index % barColors.length],
      };
    });
  }, [data, maxItems]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = paretoData.reduce((sum, item) => sum + item.duration, 0);
    const topCategory = paretoData[0];
    const aCount = paretoData.filter(p => p.abcCategory === 'A').length;
    const aDuration = paretoData.filter(p => p.abcCategory === 'A').reduce((sum, p) => sum + p.duration, 0);
    
    return {
      totalDuration: total,
      totalHours: Math.round(total / 60 * 10) / 10,
      topCategory: topCategory?.category || 'N/A',
      topPercent: topCategory?.percent || 0,
      aCount,
      aPercent: Math.round((aDuration / total) * 100) || 0,
    };
  }, [paretoData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{label}</p>
          <div className="space-y-1 mt-2 text-sm">
            <p className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Thời gian: <span className="font-medium">{data.duration} phút</span>
            </p>
            <p className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Tỷ lệ: <span className="font-medium">{data.percent}%</span>
            </p>
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Tích lũy: <span className="font-medium">{data.cumulativePercent}%</span>
            </p>
            <p className="flex items-center gap-2">
              <Wrench className="h-3 w-3" />
              Số lần: <span className="font-medium">{data.count}</span>
            </p>
            <Badge 
              variant={data.abcCategory === 'A' ? 'destructive' : data.abcCategory === 'B' ? 'secondary' : 'outline'}
              className="mt-1"
            >
              Nhóm {data.abcCategory}
            </Badge>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Tổng thời gian</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalHours}h</p>
            <p className="text-xs text-muted-foreground">{stats.totalDuration} phút</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Nguyên nhân chính</span>
            </div>
            <p className="text-lg font-bold mt-1 truncate">{stats.topCategory}</p>
            <p className="text-xs text-muted-foreground">{stats.topPercent}% tổng thời gian</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Nhóm A (80%)</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.aCount}</p>
            <p className="text-xs text-muted-foreground">nguyên nhân chiếm {stats.aPercent}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="text-sm">Tổng số loại</span>
            </div>
            <p className="text-2xl font-bold mt-1">{paretoData.length}</p>
            <p className="text-xs text-muted-foreground">nguyên nhân dừng máy</p>
          </CardContent>
        </Card>
      </div>

      {/* Pareto Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  fontSize={11}
                  interval={0}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#3b82f6"
                  label={{ value: 'Thời gian (phút)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#ef4444"
                  domain={[0, 100]}
                  label={{ value: 'Tích lũy (%)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Bars */}
                <Bar 
                  yAxisId="left" 
                  dataKey="duration" 
                  name="Thời gian (phút)"
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => onCategoryClick?.(data.category)}
                  cursor="pointer"
                >
                  {paretoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>

                {/* Cumulative Line */}
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="cumulativePercent" 
                  name="Tích lũy (%)"
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2 }}
                />

                {/* 80% Reference Line */}
                <Line 
                  yAxisId="right"
                  type="monotone"
                  dataKey={() => 80}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Ngưỡng 80%"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {showTable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chi tiết nguyên nhân dừng máy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Nguyên nhân</th>
                    <th className="text-right p-2">Thời gian</th>
                    <th className="text-right p-2">Tỷ lệ</th>
                    <th className="text-right p-2">Tích lũy</th>
                    <th className="text-center p-2">Nhóm</th>
                  </tr>
                </thead>
                <tbody>
                  {paretoData.map((item, index) => (
                    <tr 
                      key={item.category} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => onCategoryClick?.(item.category)}
                    >
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: item.color }} 
                          />
                          {item.category}
                        </div>
                      </td>
                      <td className="text-right p-2">{item.duration} phút</td>
                      <td className="text-right p-2">{item.percent}%</td>
                      <td className="text-right p-2">{item.cumulativePercent}%</td>
                      <td className="text-center p-2">
                        <Badge 
                          variant={
                            item.abcCategory === 'A' ? 'destructive' : 
                            item.abcCategory === 'B' ? 'secondary' : 'outline'
                          }
                        >
                          {item.abcCategory}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABC Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="destructive">A</Badge>
          <span>Nhóm A: 0-80% (Ưu tiên cao)</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">B</Badge>
          <span>Nhóm B: 80-95% (Ưu tiên trung bình)</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">C</Badge>
          <span>Nhóm C: 95-100% (Ưu tiên thấp)</span>
        </div>
      </div>
    </div>
  );
}

export default ParetoChart;
