/**
 * Weekly KPI Trend Page
 * Biểu đồ trend so sánh KPI nhiều tuần liên tiếp
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Factory,
  ArrowUp,
  ArrowDown,
  AlertTriangle
} from "lucide-react";

export default function WeeklyKpiTrend() {
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [weeksToShow, setWeeksToShow] = useState<number>(8);

  const { data: productionLines } = trpc.productionLine.getAll.useQuery();
  const { data: trendData, isLoading } = trpc.shiftManager.getWeeklyTrend.useQuery({
    lineId: selectedLineId === "all" ? null : parseInt(selectedLineId),
    weeks: weeksToShow
  });
  const { data: allLinesKpi } = trpc.shiftManager.getAllLinesWeeklyKpi.useQuery();

  const getTrendIcon = (change: number | null | undefined) => {
    if (change === null || change === undefined) return <Minus className="h-4 w-4 text-gray-400" />;
    if (change > 2) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < -2) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change: number | null | undefined) => {
    if (change === null || change === undefined) return "text-gray-400";
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatChange = (change: number | null | undefined) => {
    if (change === null || change === undefined) return "N/A";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  // Helper function to safely convert to number
  const toNumber = (val: any): number | null => {
    if (val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? null : num;
  };

  // Prepare chart data
  const chartData = trendData?.map((week) => ({
    name: week.weekLabel,
    cpk: toNumber(week.avgCpk),
    cpkMin: toNumber(week.minCpk),
    cpkMax: toNumber(week.maxCpk),
    oee: toNumber(week.avgOee),
    oeeMin: toNumber(week.minOee),
    oeeMax: toNumber(week.maxOee),
    samples: week.totalSamples,
    cpkChange: toNumber(week.cpkChange),
    oeeChange: toNumber(week.oeeChange)
  })) || [];

  // Find weeks with significant decline
  const declineWeeks = trendData?.filter(w => 
    (w.cpkChange !== undefined && w.cpkChange < -5) ||
    (w.oeeChange !== undefined && w.oeeChange < -5)
  ) || [];

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Xu hướng KPI theo Tuần
          </h1>
          <p className="text-muted-foreground">
            So sánh và phân tích xu hướng KPI qua nhiều tuần liên tiếp
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedLineId} onValueChange={setSelectedLineId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dây chuyền</SelectItem>
              {productionLines?.map((line) => (
                <SelectItem key={line.id} value={line.id.toString()}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={weeksToShow.toString()} onValueChange={(v) => setWeeksToShow(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 tuần</SelectItem>
              <SelectItem value="8">8 tuần</SelectItem>
              <SelectItem value="12">12 tuần</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alert for declining weeks */}
      {declineWeeks.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cảnh báo: Phát hiện tuần có KPI giảm mạnh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {declineWeeks.map((week) => (
                <Badge key={week.weekLabel} variant="outline" className="border-yellow-500">
                  {week.weekLabel}: 
                  {week.cpkChange !== undefined && week.cpkChange < -5 && (
                    <span className="text-red-600 ml-1">CPK {formatChange(week.cpkChange)}</span>
                  )}
                  {week.oeeChange !== undefined && week.oeeChange < -5 && (
                    <span className="text-red-600 ml-1">OEE {formatChange(week.oeeChange)}</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CPK Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng CPK</CardTitle>
          <CardDescription>
            Biểu đồ CPK trung bình, min, max theo tuần
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 'auto']} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === "cpk") return [value?.toFixed(3), "CPK TB"];
                    if (name === "cpkMin") return [value?.toFixed(3), "CPK Min"];
                    if (name === "cpkMax") return [value?.toFixed(3), "CPK Max"];
                    return [value, name];
                  }}
                />
                <Legend />
                <ReferenceLine y={1.33} stroke="#eab308" strokeDasharray="5 5" label="Cảnh báo (1.33)" />
                <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" label="Nghiêm trọng (1.0)" />
                <Area 
                  type="monotone" 
                  dataKey="cpkMax" 
                  fill="#22c55e" 
                  fillOpacity={0.1}
                  stroke="none"
                />
                <Area 
                  type="monotone" 
                  dataKey="cpkMin" 
                  fill="#ffffff" 
                  stroke="none"
                />
                <Line 
                  type="monotone" 
                  dataKey="cpk" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                  name="CPK TB"
                />
                <Line 
                  type="monotone" 
                  dataKey="cpkMin" 
                  stroke="#94a3b8" 
                  strokeDasharray="3 3"
                  name="CPK Min"
                />
                <Line 
                  type="monotone" 
                  dataKey="cpkMax" 
                  stroke="#22c55e" 
                  strokeDasharray="3 3"
                  name="CPK Max"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* OEE Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng OEE</CardTitle>
          <CardDescription>
            Biểu đồ OEE trung bình, min, max theo tuần
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === "oee") return [`${value?.toFixed(1)}%`, "OEE TB"];
                    if (name === "oeeMin") return [`${value?.toFixed(1)}%`, "OEE Min"];
                    if (name === "oeeMax") return [`${value?.toFixed(1)}%`, "OEE Max"];
                    return [value, name];
                  }}
                />
                <Legend />
                <ReferenceLine y={75} stroke="#eab308" strokeDasharray="5 5" label="Cảnh báo (75%)" />
                <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="5 5" label="Nghiêm trọng (60%)" />
                <Bar 
                  dataKey="oee" 
                  fill="#8b5cf6" 
                  name="OEE TB"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="oeeMin" 
                  stroke="#94a3b8" 
                  strokeDasharray="3 3"
                  name="OEE Min"
                />
                <Line 
                  type="monotone" 
                  dataKey="oeeMax" 
                  stroke="#22c55e" 
                  strokeDasharray="3 3"
                  name="OEE Max"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo Tuần</CardTitle>
          <CardDescription>
            Bảng dữ liệu KPI chi tiết với thay đổi so với tuần trước
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tuần</TableHead>
                <TableHead className="text-center">CPK TB</TableHead>
                <TableHead className="text-center">CPK Min/Max</TableHead>
                <TableHead className="text-center">Thay đổi CPK</TableHead>
                <TableHead className="text-center">OEE TB</TableHead>
                <TableHead className="text-center">OEE Min/Max</TableHead>
                <TableHead className="text-center">Thay đổi OEE</TableHead>
                <TableHead className="text-center">Số mẫu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trendData?.map((week) => (
                <TableRow 
                  key={week.weekLabel}
                  className={
                    (week.cpkChange !== undefined && week.cpkChange < -5) ||
                    (week.oeeChange !== undefined && week.oeeChange < -5)
                      ? "bg-red-50 dark:bg-red-950"
                      : ""
                  }
                >
                  <TableCell className="font-medium">{week.weekLabel}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold">{toNumber(week.avgCpk)?.toFixed(3) || "N/A"}</span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {toNumber(week.minCpk)?.toFixed(3) || "N/A"} / {toNumber(week.maxCpk)?.toFixed(3) || "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${getChangeColor(week.cpkChange)}`}>
                      {getTrendIcon(week.cpkChange)}
                      <span>{formatChange(week.cpkChange)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold">{toNumber(week.avgOee)?.toFixed(1) || "N/A"}%</span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {toNumber(week.minOee)?.toFixed(1) || "N/A"}% / {toNumber(week.maxOee)?.toFixed(1) || "N/A"}%
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`flex items-center justify-center gap-1 ${getChangeColor(week.oeeChange)}`}>
                      {getTrendIcon(week.oeeChange)}
                      <span>{formatChange(week.oeeChange)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{week.totalSamples}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Lines Summary */}
      {selectedLineId === "all" && allLinesKpi && (
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan theo Dây chuyền</CardTitle>
            <CardDescription>
              So sánh KPI tuần hiện tại với tuần trước của tất cả dây chuyền
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dây chuyền</TableHead>
                  <TableHead className="text-center">CPK Tuần này</TableHead>
                  <TableHead className="text-center">CPK Tuần trước</TableHead>
                  <TableHead className="text-center">Thay đổi</TableHead>
                  <TableHead className="text-center">OEE Tuần này</TableHead>
                  <TableHead className="text-center">OEE Tuần trước</TableHead>
                  <TableHead className="text-center">Thay đổi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLinesKpi.map((line) => (
                  <TableRow 
                    key={line.lineId}
                    className={
                      (line.weeklyChange.cpk !== null && line.weeklyChange.cpk < -5) ||
                      (line.weeklyChange.oee !== null && line.weeklyChange.oee < -5)
                        ? "bg-red-50 dark:bg-red-950"
                        : ""
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{line.lineName}</div>
                          <div className="text-xs text-muted-foreground">{line.lineCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {toNumber(line.currentWeek?.avgCpk)?.toFixed(3) || "N/A"}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {toNumber(line.previousWeek?.avgCpk)?.toFixed(3) || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getChangeColor(line.weeklyChange.cpk)}`}>
                        {line.weeklyChange.cpk !== null && line.weeklyChange.cpk > 0 && <ArrowUp className="h-3 w-3" />}
                        {line.weeklyChange.cpk !== null && line.weeklyChange.cpk < 0 && <ArrowDown className="h-3 w-3" />}
                        <span>{formatChange(line.weeklyChange.cpk)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {toNumber(line.currentWeek?.avgOee)?.toFixed(1) || "N/A"}%
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {toNumber(line.previousWeek?.avgOee)?.toFixed(1) || "N/A"}%
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getChangeColor(line.weeklyChange.oee)}`}>
                        {line.weeklyChange.oee !== null && line.weeklyChange.oee > 0 && <ArrowUp className="h-3 w-3" />}
                        {line.weeklyChange.oee !== null && line.weeklyChange.oee < 0 && <ArrowDown className="h-3 w-3" />}
                        <span>{formatChange(line.weeklyChange.oee)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
