import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
  threshold?: number;
  thresholdColor?: string;
  trend?: "up" | "down" | "stable";
  className?: string;
}

/**
 * Mini sparkline chart component for dashboard widgets
 * Displays trend data in a compact format
 */
export function Sparkline({
  data,
  color = "#3b82f6",
  height = 40,
  showTooltip = true,
  threshold,
  thresholdColor = "#ef4444",
  trend,
  className = "",
}: SparklineProps) {
  // Transform data array to chart format
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      index,
      value,
    }));
  }, [data]);

  // Calculate min/max for better visualization
  const { min, max } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1 };
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const padding = (maxVal - minVal) * 0.1 || 0.1;
    return {
      min: minVal - padding,
      max: maxVal + padding,
    };
  }, [data]);

  // Determine gradient based on trend
  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  
  const gradientColors = useMemo(() => {
    if (trend === "up") return { start: "#22c55e", end: "#16a34a" };
    if (trend === "down") return { start: "#ef4444", end: "#dc2626" };
    return { start: color, end: color };
  }, [trend, color]);

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-muted-foreground text-xs ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
          
          {threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke={thresholdColor}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            activeDot={showTooltip ? { r: 3, fill: color } : false}
          />
          
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded px-2 py-1 text-xs shadow-md">
                      {typeof payload[0].value === 'number' 
                        ? payload[0].value.toFixed(3) 
                        : payload[0].value}
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SparklineAreaProps extends SparklineProps {
  fillOpacity?: number;
}

/**
 * Area variant of sparkline for showing filled trends
 */
export function SparklineArea({
  data,
  color = "#3b82f6",
  height = 40,
  showTooltip = true,
  fillOpacity = 0.2,
  className = "",
}: SparklineAreaProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      index,
      value,
    }));
  }, [data]);

  const gradientId = useMemo(() => `sparkline-area-${Math.random().toString(36).substr(2, 9)}`, []);

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-muted-foreground text-xs ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            fill={`url(#${gradientId})`}
            activeDot={showTooltip ? { r: 3, fill: color } : false}
          />
          
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover text-popover-foreground border rounded px-2 py-1 text-xs shadow-md">
                      {typeof payload[0].value === 'number' 
                        ? payload[0].value.toFixed(3) 
                        : payload[0].value}
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SparklineBarsProps {
  data: number[];
  color?: string;
  negativeColor?: string;
  height?: number;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Bar variant of sparkline for discrete data points
 */
export function SparklineBars({
  data,
  color = "#3b82f6",
  negativeColor = "#ef4444",
  height = 40,
  showTooltip = true,
  className = "",
}: SparklineBarsProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      index,
      value,
      fill: value >= 0 ? color : negativeColor,
    }));
  }, [data, color, negativeColor]);

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-muted-foreground text-xs ${className}`}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  // Simple bar rendering using divs for ultra-compact display
  const max = Math.max(...data.map(Math.abs));
  
  return (
    <div className={`flex items-end gap-px ${className}`} style={{ height }}>
      {data.map((value, index) => {
        const barHeight = max > 0 ? (Math.abs(value) / max) * height : 0;
        const barColor = value >= 0 ? color : negativeColor;
        
        return (
          <div
            key={index}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${barHeight}px`,
              backgroundColor: barColor,
              minWidth: "2px",
            }}
            title={showTooltip ? value.toFixed(3) : undefined}
          />
        );
      })}
    </div>
  );
}

export default Sparkline;
