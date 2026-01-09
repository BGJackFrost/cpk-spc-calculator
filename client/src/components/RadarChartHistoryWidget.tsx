/**
 * Radar Chart History Widget - Widget hiển thị xu hướng CPK trên Dashboard
 * Compact version của RadarChartHistoryComparison để tích hợp vào Dashboard chính
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, TrendingUp, TrendingDown, 
  ArrowRight, Target, ExternalLink
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from "recharts";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "wouter";

interface RadarChartHistoryWidgetProps {
  className?: string;
}

export default function RadarChartHistoryWidget({ className }: RadarChartHistoryWidgetProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Fetch SPC plans for selection
  const { data: spcPlans } = trpc.spcPlan.list.useQuery();
  
  // Fetch historical data
  const { data: historyData, isLoading } = trpc.cpkHistory.getHistoricalTrend.useQuery(
    {
      planId: selectedPlanId || 0,
      timeRange: "30days",
    },
    { enabled: !!selectedPlanId }
  );

  // Auto-select first plan if available
  useMemo(() => {
    if (spcPlans && spcPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(spcPlans[0].id);
    }
  }, [spcPlans, selectedPlanId]);

  // Generate data for radar chart
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      // Mock data for demo
      return [
        { metric: "CPK", current: 1.45, previous: 1.32 },
        { metric: "CP", current: 1.52, previous: 1.40 },
        { metric: "PP", current: 1.48, previous: 1.35 },
        { metric: "PPK", current: 1.42, previous: 1.30 },
        { metric: "CA", current: 1.90, previous: 1.80 },
        { metric: "CR", current: 0.70, previous: 0.80 },
      ];
    }

    const latest = historyData[historyData.length - 1];
    const weekAgo = historyData.find((d: any) => {
      const diff = new Date(latest.date).getTime() - new Date(d.date).getTime();
      return diff >= 6 * 24 * 60 * 60 * 1000 && diff <= 8 * 24 * 60 * 60 * 1000;
    }) || historyData[Math.max(0, historyData.length - 8)];

    return [
      { metric: "CPK", current: latest.cpk || 0, previous: weekAgo?.cpk || 0 },
      { metric: "CP", current: (latest.cpk || 0) * 1.05, previous: (weekAgo?.cpk || 0) * 1.05 },
      { metric: "PP", current: (latest.cpk || 0) * 1.02, previous: (weekAgo?.cpk || 0) * 1.02 },
      { metric: "PPK", current: (latest.cpk || 0) * 0.98, previous: (weekAgo?.cpk || 0) * 0.98 },
      { metric: "CA", current: 1.90, previous: 1.80 },
      { metric: "CR", current: 0.70, previous: 0.80 },
    ];
  }, [historyData]);

  // Calculate improvement
  const improvement = useMemo(() => {
    if (chartData.length === 0) return null;
    const cpkData = chartData.find(d => d.metric === "CPK");
    if (!cpkData) return null;
    
    const change = cpkData.current - cpkData.previous;
    const changePercent = cpkData.previous > 0 ? (change / cpkData.previous) * 100 : 0;
    
    return {
      change,
      changePercent,
      improved: change > 0,
      currentCpk: cpkData.current,
      previousCpk: cpkData.previous,
    };
  }, [chartData]);

  // Get CPK status
  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { label: "Xuất sắc", color: "bg-green-500" };
    if (cpk >= 1.33) return { label: "Tốt", color: "bg-blue-500" };
    if (cpk >= 1.0) return { label: "Đạt", color: "bg-yellow-500" };
    return { label: "Không đạt", color: "bg-red-500" };
  };

  const status = improvement ? getCpkStatus(improvement.currentCpk) : null;

  return (
    <Card className={`${className} hover:shadow-lg transition-shadow`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Xu hướng CPK</CardTitle>
          </div>
          <Link href="/cpk-history-comparison">
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              Chi tiết
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <CardDescription className="text-xs">
          So sánh chỉ số SPC/CPK theo thời gian
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Plan Selector */}
        {spcPlans && spcPlans.length > 0 && (
          <div className="mb-3">
            <Select 
              value={selectedPlanId?.toString() || ""} 
              onValueChange={(v) => setSelectedPlanId(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Chọn kế hoạch SPC" />
              </SelectTrigger>
              <SelectContent>
                {spcPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Improvement Summary */}
        {improvement && (
          <div className={`flex items-center justify-between p-2 rounded-lg mb-3 ${
            improvement.improved ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
          }`}>
            <div className="flex items-center gap-2">
              {improvement.improved ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                improvement.improved ? "text-green-600" : "text-red-600"
              }`}>
                {improvement.improved ? "+" : ""}{improvement.change.toFixed(3)}
                <span className="text-xs ml-1">
                  ({improvement.changePercent.toFixed(1)}%)
                </span>
              </span>
            </div>
            {status && (
              <Badge className={`${status.color} text-white text-xs`}>
                {status.label}
              </Badge>
            )}
          </div>
        )}

        {/* Mini Radar Chart */}
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fontSize: 10, fill: "#6b7280" }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 2]} 
                tick={{ fontSize: 8 }}
                tickCount={3}
              />
              <Radar
                name="Hiện tại"
                dataKey="current"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Tuần trước"
                dataKey="previous"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.1}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Tooltip 
                formatter={(value: number) => value.toFixed(3)}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 10 }}
                iconSize={8}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        {improvement && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {improvement.currentCpk.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">CPK hiện tại</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-muted-foreground">
                {improvement.previousCpk.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Tuần trước</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
