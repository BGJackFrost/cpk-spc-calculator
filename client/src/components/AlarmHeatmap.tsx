import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AlarmData {
  machineId: number;
  machineName: string;
  machineCode: string;
  hourlyData: { hour: number; date: string; count: number; severity: "none" | "low" | "medium" | "high" | "critical" }[];
}

interface AlarmHeatmapProps {
  data: AlarmData[];
  days?: number;
}

const severityColors: Record<string, string> = {
  none: "bg-gray-100 hover:bg-gray-200",
  low: "bg-green-200 hover:bg-green-300",
  medium: "bg-yellow-200 hover:bg-yellow-300",
  high: "bg-orange-300 hover:bg-orange-400",
  critical: "bg-red-400 hover:bg-red-500",
};

const getSeverityFromCount = (count: number): "none" | "low" | "medium" | "high" | "critical" => {
  if (count === 0) return "none";
  if (count <= 2) return "low";
  if (count <= 5) return "medium";
  if (count <= 10) return "high";
  return "critical";
};

export default function AlarmHeatmap({ data, days = 7 }: AlarmHeatmapProps) {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"hourly" | "daily">("daily");

  // Generate date labels for the past N days
  const dateLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toISOString().split("T")[0]);
    }
    return labels;
  }, [days]);

  // Hours for hourly view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Filter machines
  const filteredData = selectedMachine === "all" 
    ? data 
    : data.filter(d => d.machineId.toString() === selectedMachine);

  // Aggregate data by day for daily view
  const getDailyData = (machine: AlarmData, date: string) => {
    const dayData = machine.hourlyData.filter(h => h.date === date);
    const totalCount = dayData.reduce((sum, h) => sum + h.count, 0);
    return {
      count: totalCount,
      severity: getSeverityFromCount(totalCount)
    };
  };

  // Get hourly data for a specific machine, date, and hour
  const getHourlyData = (machine: AlarmData, date: string, hour: number) => {
    const hourData = machine.hourlyData.find(h => h.date === date && h.hour === hour);
    return hourData || { count: 0, severity: "none" as const };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Biểu đồ Heatmap Alarm</CardTitle>
            <CardDescription>Mức độ alarm theo thời gian cho từng máy</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {data.map(m => (
                  <SelectItem key={m.machineId} value={m.machineId.toString()}>
                    {m.machineName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as "hourly" | "daily")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Theo ngày</SelectItem>
                <SelectItem value="hourly">Theo giờ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-muted-foreground">Mức độ:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-100 rounded" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-200 rounded" />
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-200 rounded" />
            <span>3-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-300 rounded" />
            <span>6-10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-400 rounded" />
            <span>&gt;10</span>
          </div>
        </div>

        <TooltipProvider>
          <div className="overflow-x-auto">
            {viewMode === "daily" ? (
              /* Daily View */
              <div className="min-w-[600px]">
                {/* Header row with dates */}
                <div className="flex">
                  <div className="w-32 shrink-0 p-2 font-medium text-sm">Máy</div>
                  {dateLabels.map(date => (
                    <div key={date} className="flex-1 p-1 text-center text-xs text-muted-foreground">
                      {new Date(date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </div>
                  ))}
                </div>
                
                {/* Data rows */}
                {filteredData.map(machine => (
                  <div key={machine.machineId} className="flex border-t">
                    <div className="w-32 shrink-0 p-2 text-sm font-medium truncate" title={machine.machineName}>
                      {machine.machineCode}
                    </div>
                    {dateLabels.map(date => {
                      const dayData = getDailyData(machine, date);
                      return (
                        <Tooltip key={`${machine.machineId}-${date}`}>
                          <TooltipTrigger asChild>
                            <div 
                              className={cn(
                                "flex-1 m-0.5 h-8 rounded cursor-pointer transition-colors flex items-center justify-center text-xs",
                                severityColors[dayData.severity]
                              )}
                            >
                              {dayData.count > 0 && dayData.count}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium">{machine.machineName}</div>
                              <div>{new Date(date).toLocaleDateString("vi-VN")}</div>
                              <div className="text-muted-foreground">{dayData.count} alarm</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              /* Hourly View - for selected machine only */
              <div className="min-w-[800px]">
                {filteredData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chọn một máy để xem chi tiết theo giờ
                  </div>
                ) : (
                  <>
                    {/* Header row with hours */}
                    <div className="flex">
                      <div className="w-24 shrink-0 p-2 font-medium text-sm">Ngày</div>
                      {hours.map(hour => (
                        <div key={hour} className="w-6 text-center text-xs text-muted-foreground">
                          {hour.toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                    
                    {/* Data rows by date */}
                    {filteredData.slice(0, 1).map(machine => (
                      dateLabels.map(date => (
                        <div key={`${machine.machineId}-${date}`} className="flex border-t">
                          <div className="w-24 shrink-0 p-2 text-xs">
                            {new Date(date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                          </div>
                          {hours.map(hour => {
                            const hourData = getHourlyData(machine, date, hour);
                            return (
                              <Tooltip key={`${date}-${hour}`}>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "w-6 h-6 m-0.5 rounded cursor-pointer transition-colors",
                                      severityColors[hourData.severity]
                                    )}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <div className="font-medium">{machine.machineName}</div>
                                    <div>{new Date(date).toLocaleDateString("vi-VN")} - {hour}:00</div>
                                    <div className="text-muted-foreground">{hourData.count} alarm</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
