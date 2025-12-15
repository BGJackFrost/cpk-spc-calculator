import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface GanttTask {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  assignee?: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  type: "preventive" | "corrective" | "predictive";
  machineId?: number;
  machineName?: string;
  priority?: "low" | "medium" | "high" | "critical";
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
  viewMode?: "week" | "month";
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  overdue: "bg-red-500",
};

const typeColors: Record<string, string> = {
  preventive: "border-l-4 border-l-blue-500",
  corrective: "border-l-4 border-l-orange-500",
  predictive: "border-l-4 border-l-purple-500",
};

const priorityBadges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Thấp", variant: "outline" },
  medium: { label: "TB", variant: "secondary" },
  high: { label: "Cao", variant: "default" },
  critical: { label: "Khẩn", variant: "destructive" },
};

export function GanttChart({ tasks, onTaskClick, viewMode = "week" }: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { startDate, endDate, days } = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        startDate: start,
        endDate: end,
        days: eachDayOfInterval({ start, end }),
      };
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        startDate: start,
        endDate: end,
        days: eachDayOfInterval({ start, end }),
      };
    }
  }, [currentDate, viewMode]);

  const navigatePrev = () => {
    if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Group tasks by assignee
  const groupedTasks = useMemo(() => {
    const groups: Record<string, GanttTask[]> = {};
    tasks.forEach(task => {
      const key = task.assignee || "Chưa phân công";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks]);

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = task.startDate < startDate ? startDate : task.startDate;
    const taskEnd = task.endDate > endDate ? endDate : task.endDate;
    
    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    const left = (startOffset / days.length) * 100;
    const width = (duration / days.length) * 100;
    
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  const isTaskVisible = (task: GanttTask) => {
    return isWithinInterval(task.startDate, { start: startDate, end: endDate }) ||
           isWithinInterval(task.endDate, { start: startDate, end: endDate }) ||
           (task.startDate <= startDate && task.endDate >= endDate);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Hôm nay
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="font-semibold">
          {viewMode === "week" 
            ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM/yyyy")}`
            : format(currentDate, "MMMM yyyy", { locale: vi })}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Định kỳ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Sửa chữa</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span>Dự đoán</span>
          </div>
        </div>
      </div>

      {/* Timeline header */}
      <div className="flex border-b">
        <div className="w-48 flex-shrink-0 p-2 font-medium border-r bg-muted/30">
          Kỹ thuật viên
        </div>
        <div className="flex-1 flex">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 text-center text-xs py-2 border-r last:border-r-0",
                isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950",
                (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/30"
              )}
            >
              <div className="font-medium">{format(day, "EEE", { locale: vi })}</div>
              <div className="text-muted-foreground">{format(day, "dd")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      <div className="max-h-[500px] overflow-y-auto">
        {Object.entries(groupedTasks).map(([assignee, assigneeTasks]) => (
          <div key={assignee} className="flex border-b last:border-b-0">
            <div className="w-48 flex-shrink-0 p-2 border-r bg-muted/10 font-medium truncate">
              {assignee}
            </div>
            <div className="flex-1 relative min-h-[60px]">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 border-r last:border-r-0",
                      isSameDay(day, new Date()) && "bg-blue-50/50 dark:bg-blue-950/50",
                      (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/20"
                    )}
                  />
                ))}
              </div>
              
              {/* Tasks */}
              <div className="relative p-1">
                {assigneeTasks.filter(isTaskVisible).map((task, idx) => {
                  const position = getTaskPosition(task);
                  const priority = priorityBadges[task.priority || "medium"];
                  
                  return (
                    <Tooltip key={task.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-8 rounded cursor-pointer transition-all hover:opacity-80 hover:shadow-md",
                            statusColors[task.status],
                            typeColors[task.type]
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${idx * 36 + 4}px`,
                          }}
                          onClick={() => onTaskClick?.(task)}
                        >
                          <div className="px-2 py-1 text-xs text-white truncate">
                            {task.title}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">{task.title}</div>
                          {task.machineName && (
                            <div className="text-xs text-muted-foreground">Máy: {task.machineName}</div>
                          )}
                          <div className="text-xs">
                            {format(task.startDate, "dd/MM/yyyy")} - {format(task.endDate, "dd/MM/yyyy")}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={priority.variant} className="text-xs">
                              {priority.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.status === "pending" ? "Chờ" :
                               task.status === "in_progress" ? "Đang làm" :
                               task.status === "completed" ? "Hoàn thành" : "Quá hạn"}
                            </Badge>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        
        {Object.keys(groupedTasks).length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Không có công việc nào trong khoảng thời gian này
          </div>
        )}
      </div>
    </div>
  );
}
