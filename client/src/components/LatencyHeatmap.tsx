import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapData {
  hour_of_day: number;
  day_of_week: number;
  avg_latency: number;
  min_latency: number;
  max_latency: number;
  count: number;
  success_count: number;
}

interface LatencyHeatmapProps {
  data: HeatmapData[];
  title?: string;
  showLegend?: boolean;
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function LatencyHeatmap({ data, title = 'Heatmap Độ trễ', showLegend = true }: LatencyHeatmapProps) {
  const { heatmapGrid, minLatency, maxLatency } = useMemo(() => {
    const grid: (HeatmapData | null)[][] = Array(7).fill(null).map(() => Array(24).fill(null));
    let min = Infinity;
    let max = -Infinity;

    data.forEach((item) => {
      const day = item.day_of_week;
      const hour = item.hour_of_day;
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        grid[day][hour] = item;
        if (item.avg_latency < min) min = item.avg_latency;
        if (item.avg_latency > max) max = item.avg_latency;
      }
    });

    return { heatmapGrid: grid, minLatency: min === Infinity ? 0 : min, maxLatency: max === -Infinity ? 100 : max };
  }, [data]);

  const getColor = (latency: number | null): string => {
    if (latency === null) return 'bg-gray-100 dark:bg-gray-800';
    
    const range = maxLatency - minLatency || 1;
    const normalized = (latency - minLatency) / range;

    if (normalized < 0.25) return 'bg-green-400 dark:bg-green-600';
    if (normalized < 0.5) return 'bg-yellow-400 dark:bg-yellow-600';
    if (normalized < 0.75) return 'bg-orange-400 dark:bg-orange-600';
    return 'bg-red-500 dark:bg-red-600';
  };

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-4">
      {title && <h3 className="font-semibold text-lg">{title}</h3>}
      
      <TooltipProvider>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="w-10 flex-shrink-0" />
              {HOURS.map((hour) => (
                <div key={hour} className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground">{hour}</div>
              ))}
            </div>

            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex">
                <div className="w-10 flex-shrink-0 flex items-center justify-center text-xs font-medium">{day}</div>
                {HOURS.map((hour) => {
                  const cellData = heatmapGrid[dayIndex][hour];
                  const colorClass = getColor(cellData?.avg_latency ?? null);

                  return (
                    <Tooltip key={`${day}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div className={`w-8 h-8 m-0.5 rounded-sm cursor-pointer transition-all hover:scale-110 hover:z-10 ${colorClass}`} />
                      </TooltipTrigger>
                      <TooltipContent>
                        {cellData ? (
                          <div className="text-sm space-y-1">
                            <p className="font-medium">{day} {hour}:00 - {hour}:59</p>
                            <p>Trung bình: {formatLatency(cellData.avg_latency)}</p>
                            <p>Min: {formatLatency(cellData.min_latency)}</p>
                            <p>Max: {formatLatency(cellData.max_latency)}</p>
                            <p>Số lượng: {cellData.count}</p>
                            <p>Thành công: {cellData.success_count}/{cellData.count} ({Math.round(cellData.success_count / cellData.count * 100)}%)</p>
                          </div>
                        ) : (
                          <p className="text-sm">Không có dữ liệu</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {showLegend && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Độ trễ:</span>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-400 dark:bg-green-600" /><span>Thấp</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-600" /><span>Trung bình</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-600" /><span>Cao</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-500 dark:bg-red-600" /><span>Rất cao</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border" /><span>Không có dữ liệu</span></div>
        </div>
      )}

      {data.length > 0 && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>Min: {formatLatency(minLatency)}</span>
          <span>Max: {formatLatency(maxLatency)}</span>
          <span>Tổng records: {data.reduce((sum, d) => sum + d.count, 0)}</span>
        </div>
      )}
    </div>
  );
}

export default LatencyHeatmap;
