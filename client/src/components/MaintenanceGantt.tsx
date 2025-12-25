/**
 * Maintenance Gantt Chart Component
 * Task: MMS-03
 * Biểu đồ Gantt hiển thị lịch bảo trì
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface GanttItem {
  id: number;
  machineId: number;
  machineName: string;
  maintenanceType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  assignedTechnician?: string;
  status: "scheduled" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  progress: number;
}

interface MaintenanceGanttProps {
  items: GanttItem[];
  startDate: Date;
  endDate: Date;
  onItemClick?: (item: GanttItem) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
}

export default function MaintenanceGantt({
  items,
  startDate,
  endDate,
  onItemClick,
  onDateRangeChange,
}: MaintenanceGanttProps) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      if (viewMode === "day") {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === "week") {
        current.setDate(current.getDate() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }
    return dates;
  }, [startDate, endDate, viewMode]);

  // Group items by machine
  const groupedItems = useMemo(() => {
    const groups: Record<string, GanttItem[]> = {};
    items.forEach(item => {
      const key = item.machineName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  // Calculate position and width for each item
  const getItemStyle = (item: GanttItem) => {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const itemStart = new Date(item.scheduledStart);
    const itemEnd = new Date(item.scheduledEnd);
    
    const startOffset = Math.max(0, Math.ceil((itemStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.ceil((itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    const left = (startOffset / totalDays) * 100;
    const width = Math.min((duration / totalDays) * 100, 100 - left);

    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "overdue": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="text-xs">Cao</Badge>;
      case "medium": return <Badge variant="default" className="text-xs bg-yellow-500">TB</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Thấp</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-3 w-3" />;
      case "in_progress": return <Clock className="h-3 w-3" />;
      case "overdue": return <AlertTriangle className="h-3 w-3" />;
      default: return <Calendar className="h-3 w-3" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    if (!onDateRangeChange) return;
    
    const days = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
    const offset = direction === "prev" ? -days : days;
    
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + offset);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + offset);
    
    onDateRangeChange(newStart, newEnd);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Biểu đồ Gantt Bảo trì
            </CardTitle>
            <CardDescription>
              {formatDate(startDate)} - {formatDate(endDate)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigatePeriod("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={viewMode} onValueChange={(v: "day" | "week" | "month") => setViewMode(v)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Ngày</SelectItem>
                <SelectItem value="week">Tuần</SelectItem>
                <SelectItem value="month">Tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => navigatePeriod("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Timeline Header */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 p-2 font-medium border-r bg-muted/50">
              Máy
            </div>
            <div className="flex-1 flex">
              {dateRange.map((date, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-xs p-1 border-r last:border-r-0 bg-muted/30"
                  style={{ minWidth: viewMode === "day" ? "40px" : "60px" }}
                >
                  {formatDate(date)}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          {Object.entries(groupedItems).map(([machineName, machineItems]) => (
            <div key={machineName} className="flex border-b hover:bg-muted/20">
              <div className="w-48 flex-shrink-0 p-2 border-r font-medium truncate">
                {machineName}
              </div>
              <div className="flex-1 relative h-12">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {dateRange.map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r last:border-r-0"
                      style={{ minWidth: viewMode === "day" ? "40px" : "60px" }}
                    />
                  ))}
                </div>

                {/* Gantt bars */}
                {machineItems.map(item => {
                  const style = getItemStyle(item);
                  return (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-8 rounded cursor-pointer transition-all hover:opacity-80 flex items-center px-2 text-white text-xs ${getStatusColor(item.status)}`}
                            style={style}
                            onClick={() => onItemClick?.(item)}
                          >
                            <div className="flex items-center gap-1 truncate">
                              {getStatusIcon(item.status)}
                              <span className="truncate">{item.maintenanceType}</span>
                            </div>
                            {/* Progress bar */}
                            {item.status === "in_progress" && (
                              <div
                                className="absolute bottom-0 left-0 h-1 bg-white/50 rounded-b"
                                style={{ width: `${item.progress}%` }}
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-medium">{item.maintenanceType}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(item.scheduledStart)} - {formatDate(item.scheduledEnd)}
                            </div>
                            {item.assignedTechnician && (
                              <div className="text-xs">KTV: {item.assignedTechnician}</div>
                            )}
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(item.priority)}
                              <span className="text-xs">Tiến độ: {item.progress}%</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {Object.keys(groupedItems).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Không có lịch bảo trì trong khoảng thời gian này
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span>Đã lên lịch</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Đang thực hiện</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Hoàn thành</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Quá hạn</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
