import { useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
// Toast notification helper
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    if (variant === 'destructive') {
      console.error(`[Toast] ${title}: ${description}`);
    } else {
      console.log(`[Toast] ${title}: ${description}`);
    }
  }
});

export interface WidgetConfig {
  id: string;
  title: string;
  type: string;
  size: "small" | "medium" | "large";
  position: { x: number; y: number };
  visible: boolean;
}

interface DraggableWidgetProps {
  config: WidgetConfig;
  children: ReactNode;
  onRemove?: (id: string) => void;
  onResize?: (id: string, size: "small" | "medium" | "large") => void;
  onDragEnd?: (id: string, position: { x: number; y: number }) => void;
  isDraggable?: boolean;
}

const sizeClasses = {
  small: "col-span-1",
  medium: "col-span-2",
  large: "col-span-3",
};

export function DraggableWidget({
  config,
  children,
  onRemove,
  onResize,
  onDragEnd,
  isDraggable = true,
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!isDraggable) return;
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", config.id);
    e.dataTransfer.effectAllowed = "move";
  }, [isDraggable, config.id]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    if (onDragEnd) {
      const rect = dragRef.current?.getBoundingClientRect();
      if (rect) {
        onDragEnd(config.id, { x: e.clientX - rect.width / 2, y: e.clientY - rect.height / 2 });
      }
    }
  }, [config.id, onDragEnd]);

  const cycleSize = () => {
    if (!onResize) return;
    const sizes: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(config.size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onResize(config.id, sizes[nextIndex]);
  };

  if (!config.visible) return null;

  return (
    <div
      ref={dragRef}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        sizeClasses[config.size],
        "transition-all duration-200",
        isDragging && "opacity-50 scale-95",
        isDraggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDraggable && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              )}
              <CardTitle className="text-sm">{config.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={cycleSize}
                title="Thay đổi kích thước"
              >
                {config.size === "large" ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(config.id)}
                  title="Ẩn widget"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// Widget Manager for handling widget state with optional DB persistence
export function useWidgetManager(initialWidgets: WidgetConfig[], options?: { persistToDb?: boolean }) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isLoading, setIsLoading] = useState(options?.persistToDb ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // tRPC queries/mutations for DB persistence
  const { data: savedWidgets, isLoading: isLoadingFromDb } = trpc.mmsDashboardConfig.getWidgets.useQuery(
    undefined,
    { enabled: options?.persistToDb ?? false }
  );
  
  const saveWidgetsMutation = trpc.mmsDashboardConfig.saveWidgets.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast({ title: "Đã lưu cấu hình Dashboard", description: "Cấu hình widgets đã được lưu thành công" });
    },
    onError: () => {
      setIsSaving(false);
      toast({ title: "Lỗi", description: "Không thể lưu cấu hình Dashboard", variant: "destructive" });
    },
  });
  
  const resetWidgetsMutation = trpc.mmsDashboardConfig.resetWidgets.useMutation({
    onSuccess: () => {
      setWidgets(initialWidgets);
      toast({ title: "Đã đặt lại Dashboard", description: "Dashboard đã được đặt về mặc định" });
    },
  });

  // Load widgets from DB on mount
  useEffect(() => {
    if (options?.persistToDb && savedWidgets && savedWidgets.length > 0) {
      const loadedWidgets: WidgetConfig[] = savedWidgets.map((w, index) => ({
        id: w.widgetType,
        title: w.title || w.widgetType,
        type: w.widgetType,
        size: (["small", "medium", "large"][Math.min(w.width || 1, 3) - 1] || "small") as "small" | "medium" | "large",
        position: { x: w.position || index, y: 0 },
        visible: w.isVisible === 1,
      }));
      setWidgets(loadedWidgets);
      setIsLoading(false);
    } else if (!isLoadingFromDb) {
      setIsLoading(false);
    }
  }, [savedWidgets, isLoadingFromDb, options?.persistToDb, initialWidgets]);

  const updateWidget = useCallback((id: string, updates: Partial<WidgetConfig>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: false } : w));
  }, []);

  const showWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: true } : w));
  }, []);

  const resizeWidget = useCallback((id: string, size: "small" | "medium" | "large") => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
  }, []);

  const reorderWidgets = useCallback((dragId: string, dropIndex: number) => {
    setWidgets(prev => {
      const dragIndex = prev.findIndex(w => w.id === dragId);
      if (dragIndex === -1) return prev;
      
      const newWidgets = [...prev];
      const [draggedWidget] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(dropIndex, 0, draggedWidget);
      return newWidgets;
    });
  }, []);

  const resetWidgets = useCallback(() => {
    if (options?.persistToDb) {
      resetWidgetsMutation.mutate();
    } else {
      setWidgets(initialWidgets);
    }
  }, [initialWidgets, options?.persistToDb, resetWidgetsMutation]);

  // Save widgets to DB
  const saveWidgets = useCallback(() => {
    if (!options?.persistToDb) return;
    
    setIsSaving(true);
    const widgetsToSave = widgets.map((w, index) => ({
      widgetType: w.type,
      title: w.title,
      config: {},
      position: index,
      width: w.size === "small" ? 1 : w.size === "medium" ? 2 : 3,
      height: 1,
      isVisible: w.visible,
    }));
    
    saveWidgetsMutation.mutate(widgetsToSave);
  }, [widgets, options?.persistToDb, saveWidgetsMutation]);

  return {
    widgets,
    updateWidget,
    removeWidget,
    showWidget,
    resizeWidget,
    reorderWidgets,
    resetWidgets,
    saveWidgets,
    isLoading,
    isSaving,
    visibleWidgets: widgets.filter(w => w.visible),
    hiddenWidgets: widgets.filter(w => !w.visible),
  };
}
