import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  strokeColor = "currentColor",
  fillColor = "none",
  strokeWidth = 2,
  showDots = false,
  className = "",
}: SparklineProps) {
  const pathD = useMemo(() => {
    if (!data || data.length === 0) return "";
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });
    
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }
    
    return points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    ).join(' ');
  }, [data, width, height]);

  const areaPathD = useMemo(() => {
    if (!data || data.length === 0 || fillColor === "none") return "";
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });
    
    if (points.length < 2) return "";
    
    const linePath = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    ).join(' ');
    
    const bottomY = height - padding;
    return `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  }, [data, width, height, fillColor]);

  const dots = useMemo(() => {
    if (!showDots || !data || data.length === 0) return [];
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    return data.map((value, index) => ({
      x: padding + (index / (data.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((value - min) / range) * chartHeight,
      value,
    }));
  }, [data, width, height, showDots]);

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="currentColor" opacity="0.5">
          No data
        </text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className}>
      {fillColor !== "none" && (
        <path d={areaPathD} fill={fillColor} opacity="0.2" />
      )}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={3}
          fill={strokeColor}
        />
      ))}
    </svg>
  );
}

export default Sparkline;
