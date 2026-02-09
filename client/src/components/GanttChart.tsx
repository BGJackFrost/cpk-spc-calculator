import { useMemo, useState, useRef, useCallback } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, GripVertical, Move, Trash2, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  progress?: number; // 0-100 completion percentage
  dependsOn?: number; // ID of task this depends on
}

interface TaskChange {
  taskId: number;
  oldStartDate: Date;
  oldEndDate: Date;
  newStartDate: Date;
  newEndDate: Date;
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (taskId: number, newStartDate: Date, newEndDate: Date) => void;
  onTaskDelete?: (taskId: number) => void;
  viewMode?: "week" | "month";
  enableDragDrop?: boolean;
  enableResize?: boolean;
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

export function GanttChart({ 
  tasks, 
  onTaskClick, 
  onTaskUpdate,
  onTaskDelete,
  viewMode = "week",
  enableDragDrop = true,
  enableResize = true
}: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<"left" | "right" | null>(null);
  const [resizingTask, setResizingTask] = useState<GanttTask | null>(null);
  const [previewDates, setPreviewDates] = useState<{ start: Date; end: Date } | null>(null);
  
  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<TaskChange[]>([]);
  const [redoStack, setRedoStack] = useState<TaskChange[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !onTaskUpdate) return;
    
    const lastChange = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastChange]);
    
    onTaskUpdate(lastChange.taskId, lastChange.oldStartDate, lastChange.oldEndDate);
    toast.info("Đã hoàn tác thay đổi");
  }, [undoStack, onTaskUpdate]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !onTaskUpdate) return;
    
    const lastChange = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastChange]);
    
    onTaskUpdate(lastChange.taskId, lastChange.newStartDate, lastChange.newEndDate);
    toast.info("Đã làm lại thay đổi");
  }, [redoStack, onTaskUpdate]);

  const recordChange = useCallback((task: GanttTask, newStartDate: Date, newEndDate: Date) => {
    const change: TaskChange = {
      taskId: task.id,
      oldStartDate: task.startDate,
      oldEndDate: task.endDate,
      newStartDate,
      newEndDate,
    };
    setUndoStack(prev => [...prev.slice(-19), change]); // Keep last 20 changes
    setRedoStack([]); // Clear redo stack on new change
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent | React.TouchEvent, task: GanttTask) => {
    if (!enableDragDrop) return;
    
    setDraggedTask(task);
    setIsDragging(true);
    setPreviewDates({ start: task.startDate, end: task.endDate });
    
    if ('dataTransfer' in e) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(task.id));
    }
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragOffset(clientX - rect.left);
  }, [enableDragDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedTask || !onTaskUpdate) return;
    
    const duration = differenceInDays(draggedTask.endDate, draggedTask.startDate);
    const newStartDate = targetDate;
    const newEndDate = addDays(targetDate, duration);
    
    recordChange(draggedTask, newStartDate, newEndDate);
    onTaskUpdate(draggedTask.id, newStartDate, newEndDate);
    toast.success(`Đã cập nhật lịch trình: ${draggedTask.title}`);
    
    setDraggedTask(null);
    setIsDragging(false);
    setPreviewDates(null);
  }, [draggedTask, onTaskUpdate, recordChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setIsDragging(false);
    setPreviewDates(null);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, task: GanttTask, direction: "left" | "right") => {
    if (!enableResize) return;
    e.stopPropagation();
    e.preventDefault();
    
    setResizingTask(task);
    setResizeDirection(direction);
    setIsResizing(true);
    setPreviewDates({ start: task.startDate, end: task.endDate });
  }, [enableResize]);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !resizingTask || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const timelineStart = 192; // Width of assignee column
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left - timelineStart;
    const timelineWidth = rect.width - timelineStart;
    const dayIndex = Math.floor((x / timelineWidth) * days.length);
    
    if (dayIndex >= 0 && dayIndex < days.length) {
      const targetDate = days[dayIndex];
      
      if (resizeDirection === "left") {
        if (targetDate <= resizingTask.endDate) {
          setPreviewDates({ start: targetDate, end: resizingTask.endDate });
        }
      } else {
        if (targetDate >= resizingTask.startDate) {
          setPreviewDates({ start: resizingTask.startDate, end: targetDate });
        }
      }
    }
  }, [isResizing, resizingTask, resizeDirection, days]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing || !resizingTask || !previewDates || !onTaskUpdate) {
      setIsResizing(false);
      setResizingTask(null);
      setResizeDirection(null);
      setPreviewDates(null);
      return;
    }
    
    recordChange(resizingTask, previewDates.start, previewDates.end);
    onTaskUpdate(resizingTask.id, previewDates.start, previewDates.end);
    toast.success(`Đã thay đổi thời gian: ${resizingTask.title}`);
    
    setIsResizing(false);
    setResizingTask(null);
    setResizeDirection(null);
    setPreviewDates(null);
  }, [isResizing, resizingTask, previewDates, onTaskUpdate, recordChange]);

  // Add global mouse/touch listeners for resize
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    handleResizeMove(e);
  }, [handleResizeMove]);

  const handleGlobalMouseUp = useCallback(() => {
    handleResizeEnd();
  }, [handleResizeEnd]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    handleResizeMove(e);
  }, [handleResizeMove]);

  const handleGlobalTouchEnd = useCallback(() => {
    handleResizeEnd();
  }, [handleResizeEnd]);

  // Attach/detach global listeners
  useState(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  });

  // Touch handlers for mobile drag
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedTask || !containerRef.current) return;
    
    const touch = e.touches[0];
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const timelineStart = 192;
    
    const x = touch.clientX - rect.left - timelineStart;
    const timelineWidth = rect.width - timelineStart;
    const dayIndex = Math.floor((x / timelineWidth) * days.length);
    
    if (dayIndex >= 0 && dayIndex < days.length) {
      const targetDate = days[dayIndex];
      const duration = differenceInDays(draggedTask.endDate, draggedTask.startDate);
      setPreviewDates({ start: targetDate, end: addDays(targetDate, duration) });
    }
  }, [draggedTask, days]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!draggedTask || !containerRef.current || !onTaskUpdate) return;
    
    const touch = e.changedTouches[0];
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const timelineStart = 192;
    
    const x = touch.clientX - rect.left - timelineStart;
    const timelineWidth = rect.width - timelineStart;
    const dayIndex = Math.floor((x / timelineWidth) * days.length);
    
    if (dayIndex >= 0 && dayIndex < days.length) {
      const targetDate = days[dayIndex];
      const duration = differenceInDays(draggedTask.endDate, draggedTask.startDate);
      const newStartDate = targetDate;
      const newEndDate = addDays(targetDate, duration);
      
      recordChange(draggedTask, newStartDate, newEndDate);
      onTaskUpdate(draggedTask.id, newStartDate, newEndDate);
      toast.success(`Đã cập nhật lịch trình: ${draggedTask.title}`);
    }
    
    setDraggedTask(null);
    setIsDragging(false);
    setPreviewDates(null);
  }, [draggedTask, days, onTaskUpdate, recordChange]);

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 border-b bg-muted/50 gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" onClick={goToToday}>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Hôm nay</span>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 ml-2 border-l pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hoàn tác (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Làm lại (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="font-semibold text-sm sm:text-base">
          {viewMode === "week" 
            ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM/yyyy")}`
            : format(currentDate, "MMMM yyyy", { locale: vi })}
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-blue-500" />
            <span>Định kỳ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-orange-500" />
            <span>Sửa chữa</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-purple-500" />
            <span>Dự đoán</span>
          </div>
        </div>
      </div>

      {/* Drag/Resize instruction */}
      {(enableDragDrop || enableResize) && (
        <div className="px-4 py-1 bg-blue-50 dark:bg-blue-950 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2 flex-wrap">
          {enableDragDrop && (
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3" />
              Kéo để di chuyển
            </span>
          )}
          {enableResize && (
            <span className="flex items-center gap-1">
              <span className="text-lg">↔</span>
              Kéo cạnh để thay đổi thời gian
            </span>
          )}
        </div>
      )}

      {/* Preview dates */}
      {previewDates && (isDragging || isResizing) && (
        <div className="px-4 py-1 bg-yellow-50 dark:bg-yellow-950 text-xs text-yellow-700 dark:text-yellow-300">
          Preview: {format(previewDates.start, "dd/MM/yyyy")} - {format(previewDates.end, "dd/MM/yyyy")}
          ({differenceInDays(previewDates.end, previewDates.start) + 1} ngày)
        </div>
      )}

      {/* Timeline header */}
      <div className="flex border-b overflow-x-auto">
        <div className="w-32 sm:w-48 flex-shrink-0 p-2 font-medium border-r bg-muted/30 text-xs sm:text-sm">
          Kỹ thuật viên
        </div>
        <div className="flex min-w-[400px] sm:min-w-0 flex-1">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 min-w-[40px] sm:min-w-0 text-center text-[10px] sm:text-xs py-1 sm:py-2 border-r last:border-r-0",
                isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950",
                (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/30"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="font-medium">{format(day, "EEE", { locale: vi })}</div>
              <div className="text-muted-foreground">{format(day, "dd")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto overflow-x-auto">
        {Object.entries(groupedTasks).map(([assignee, assigneeTasks]) => (
          <div key={assignee} className="flex border-b last:border-b-0">
            <div className="w-32 sm:w-48 flex-shrink-0 p-2 border-r bg-muted/10 font-medium truncate text-xs sm:text-sm">
              {assignee}
            </div>
            <div className="flex-1 relative min-h-[50px] sm:min-h-[60px] min-w-[400px] sm:min-w-0">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex-1 min-w-[40px] sm:min-w-0 border-r last:border-r-0",
                      isSameDay(day, new Date()) && "bg-blue-50/50 dark:bg-blue-950/50",
                      (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/20",
                      isDragging && "hover:bg-blue-100 dark:hover:bg-blue-900"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                  />
                ))}
              </div>
              
              {/* Tasks */}
              <div className="relative p-1">
                {assigneeTasks.filter(isTaskVisible).map((task, idx) => {
                  const position = getTaskPosition(task);
                  const priority = priorityBadges[task.priority || "medium"];
                  const isBeingDragged = draggedTask?.id === task.id;
                  const isBeingResized = resizingTask?.id === task.id;
                  
                  return (
                    <Tooltip key={task.id}>
                      <TooltipTrigger asChild>
                        <div
                          draggable={enableDragDrop && !isResizing}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => !isResizing && handleDragStart(e, task)}
                          className={cn(
                            "absolute h-6 sm:h-8 rounded cursor-pointer transition-all group",
                            "hover:opacity-80 hover:shadow-md",
                            "active:scale-105 active:shadow-lg",
                            statusColors[task.status],
                            typeColors[task.type],
                            enableDragDrop && "cursor-grab active:cursor-grabbing",
                            (isBeingDragged || isBeingResized) && "opacity-50 scale-95 ring-2 ring-blue-500"
                          )}
                          style={{
                            left: position.left,
                            width: position.width,
                            top: `${idx * 30 + 4}px`,
                          }}
                          onClick={() => !isDragging && !isResizing && onTaskClick?.(task)}
                        >
                          {/* Left resize handle */}
                          {enableResize && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 rounded-l"
                              onMouseDown={(e) => handleResizeStart(e, task, "left")}
                              onTouchStart={(e) => handleResizeStart(e, task, "left")}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          
                          {/* Progress bar */}
                          {task.progress !== undefined && task.progress > 0 && task.progress < 100 && (
                            <div
                              className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b"
                              style={{ width: `${task.progress}%` }}
                            />
                          )}
                          <div className="px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-white truncate flex items-center gap-1">
                            {enableDragDrop && (
                              <GripVertical className="h-3 w-3 flex-shrink-0 opacity-70" />
                            )}
                            <span className="truncate">{task.title}</span>
                            {task.progress !== undefined && (
                              <span className="text-[9px] opacity-75 flex-shrink-0">{task.progress}%</span>
                            )}
                          </div>
                          
                          {/* Right resize handle */}
                          {enableResize && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 rounded-r"
                              onMouseDown={(e) => handleResizeStart(e, task, "right")}
                              onTouchStart={(e) => handleResizeStart(e, task, "right")}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
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
                            {task.progress !== undefined && (
                              <span className="ml-1 text-muted-foreground">({task.progress}%)</span>
                            )}
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
                          {(enableDragDrop || enableResize) && (
                            <div className="text-xs text-muted-foreground italic">
                              {enableDragDrop && "Kéo để di chuyển"}
                              {enableDragDrop && enableResize && " • "}
                              {enableResize && "Kéo cạnh để resize"}
                            </div>
                          )}
                          {onTaskDelete && (
                            <div className="pt-2 border-t mt-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskDelete(task.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Xóa lịch bảo trì
                              </Button>
                            </div>
                          )}
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
