/**
 * Draggable Widgets Component
 * Task: DSH-03
 * Dashboard widgets có thể kéo thả và tùy chỉnh
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  GripVertical, Settings, Plus, X, Eye, EyeOff, 
  LayoutGrid, Maximize2, Minimize2, RotateCcw
} from "lucide-react";

// Widget types
export interface Widget {
  id: string;
  title: string;
  description?: string;
  type: "chart" | "kpi" | "table" | "alert" | "custom";
  size: "small" | "medium" | "large" | "full";
  visible: boolean;
  order: number;
  component: React.ReactNode;
  icon?: React.ReactNode;
}

interface DraggableWidgetsProps {
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
  onSave?: () => void;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

// Widget size classes
const sizeClasses = {
  small: "col-span-1",
  medium: "col-span-2",
  large: "col-span-3",
  full: "col-span-4",
};

export default function DraggableWidgets({
  widgets,
  onWidgetsChange,
  onSave,
  isEditing = false,
  onEditingChange,
}: DraggableWidgetsProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Sort widgets by order
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const visibleWidgets = sortedWidgets.filter(w => w.visible);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditing) return;
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isEditing || !draggedWidget || draggedWidget === targetId) return;
    e.preventDefault();

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = widgets.findIndex(w => w.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Update order
    newWidgets.forEach((w, i) => {
      w.order = i;
    });

    onWidgetsChange(newWidgets);
    setDraggedWidget(null);
    toast.success("Đã thay đổi vị trí widget");
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    const newWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    onWidgetsChange(newWidgets);
  };

  // Change widget size
  const changeWidgetSize = (widgetId: string, size: Widget["size"]) => {
    const newWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, size } : w
    );
    onWidgetsChange(newWidgets);
  };

  // Reset to default
  const resetToDefault = () => {
    const defaultWidgets = widgets.map((w, i) => ({
      ...w,
      visible: true,
      order: i,
      size: "medium" as const,
    }));
    onWidgetsChange(defaultWidgets);
    toast.success("Đã khôi phục cấu hình mặc định");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing && (
            <Badge variant="secondary" className="animate-pulse">
              Chế độ chỉnh sửa
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => onEditingChange?.(!isEditing)}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            {isEditing ? "Hoàn tất" : "Tùy chỉnh"}
          </Button>
          
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Cài đặt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cài đặt Dashboard Widgets</DialogTitle>
                <DialogDescription>
                  Bật/tắt và thay đổi kích thước các widget
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {sortedWidgets.map(widget => (
                  <div 
                    key={widget.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={widget.visible}
                        onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                      />
                      <div>
                        <div className="font-medium">{widget.title}</div>
                        {widget.description && (
                          <div className="text-sm text-muted-foreground">
                            {widget.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={widget.size}
                        onChange={(e) => changeWidgetSize(widget.id, e.target.value as Widget["size"])}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="small">Nhỏ</option>
                        <option value="medium">Vừa</option>
                        <option value="large">Lớn</option>
                        <option value="full">Toàn bộ</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Khôi phục mặc định
                </Button>
                <Button onClick={() => {
                  onSave?.();
                  setShowSettings(false);
                  toast.success("Đã lưu cấu hình");
                }}>
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-4 gap-4">
        {visibleWidgets.map(widget => (
          <div
            key={widget.id}
            className={`${sizeClasses[widget.size]} ${
              isEditing ? "cursor-move" : ""
            } ${
              draggedWidget === widget.id ? "opacity-50" : ""
            }`}
            draggable={isEditing}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
          >
            <Card className={`h-full ${isEditing ? "border-dashed border-2 border-primary/50" : ""}`}>
              {isEditing && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {isEditing && (
                <div className="absolute top-2 left-2 z-10">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <CardHeader className={isEditing ? "pt-8" : ""}>
                <CardTitle className="text-sm flex items-center gap-2">
                  {widget.icon}
                  {widget.title}
                </CardTitle>
                {widget.description && (
                  <CardDescription className="text-xs">
                    {widget.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {widget.component}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Add Widget Placeholder (when editing) */}
        {isEditing && (
          <div className="col-span-1">
            <Card className="h-full border-dashed border-2 border-muted-foreground/30 flex items-center justify-center min-h-[200px]">
              <Button variant="ghost" className="flex flex-col items-center gap-2">
                <Plus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thêm widget</span>
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Empty state */}
      {visibleWidgets.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <EyeOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Không có widget nào được hiển thị</h3>
            <p className="text-muted-foreground mb-4">
              Bật các widget trong phần Cài đặt để hiển thị trên dashboard
            </p>
            <Button onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Mở Cài đặt
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper hook for managing widget state
export function useWidgets(initialWidgets: Omit<Widget, "order">[]) {
  const [widgets, setWidgets] = useState<Widget[]>(
    initialWidgets.map((w, i) => ({ ...w, order: i }))
  );
  const [isEditing, setIsEditing] = useState(false);

  const saveWidgets = useCallback(() => {
    // In production, save to localStorage or API
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
  }, [widgets]);

  const loadWidgets = useCallback(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load widgets:", e);
      }
    }
  }, []);

  return {
    widgets,
    setWidgets,
    isEditing,
    setIsEditing,
    saveWidgets,
    loadWidgets,
  };
}
