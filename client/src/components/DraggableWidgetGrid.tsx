/**
 * DraggableWidgetGrid - Component cho phép kéo thả sắp xếp các widget
 * Sử dụng dnd-kit để xử lý drag and drop
 */

import { useState, useCallback, ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  colSpan?: 1 | 2 | 3 | 4;
}

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
  isDragging?: boolean;
}

function SortableWidget({ id, children, isDragging }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSorting ? 0.5 : 1,
    zIndex: isSorting ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm rounded p-1 hover:bg-accent"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

interface DraggableWidgetGridProps {
  widgets: WidgetConfig[];
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  renderWidget: (widgetId: string) => ReactNode;
  className?: string;
  gridCols?: 1 | 2 | 3 | 4;
}

export default function DraggableWidgetGrid({
  widgets,
  onLayoutChange,
  renderWidget,
  className = '',
  gridCols = 4,
}: DraggableWidgetGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(widgets);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleWidgets = widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id);
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newVisibleWidgets = arrayMove(visibleWidgets, oldIndex, newIndex);
        
        const updatedWidgets = widgets.map(w => {
          const newOrderIndex = newVisibleWidgets.findIndex(vw => vw.id === w.id);
          return {
            ...w,
            order: newOrderIndex !== -1 ? newOrderIndex : w.order,
          };
        });

        onLayoutChange(updatedWidgets);
      }
    }
  }, [visibleWidgets, widgets, onLayoutChange]);

  const handleToggleVisibility = useCallback((widgetId: string) => {
    const updatedWidgets = localWidgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    setLocalWidgets(updatedWidgets);
  }, [localWidgets]);

  const handleSaveConfig = useCallback(() => {
    onLayoutChange(localWidgets);
    setShowConfigDialog(false);
  }, [localWidgets, onLayoutChange]);

  const handleResetLayout = useCallback(() => {
    const resetWidgets = widgets.map((w, index) => ({
      ...w,
      visible: true,
      order: index,
    }));
    onLayoutChange(resetWidgets);
    setLocalWidgets(resetWidgets);
  }, [widgets, onLayoutChange]);

  if (JSON.stringify(widgets) !== JSON.stringify(localWidgets)) {
    setLocalWidgets(widgets);
  }

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[gridCols];

  return (
    <div className={className}>
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tùy chỉnh Dashboard</DialogTitle>
            <DialogDescription>
              Chọn các widget muốn hiển thị và kéo thả để sắp xếp thứ tự
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {localWidgets
                .sort((a, b) => a.order - b.order)
                .map(widget => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={widget.id}
                        checked={widget.visible}
                        onCheckedChange={() => handleToggleVisibility(widget.id)}
                      />
                      <Label htmlFor={widget.id} className="cursor-pointer">
                        {widget.title}
                      </Label>
                    </div>
                    {widget.visible ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleResetLayout} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset mặc định
            </Button>
            <Button onClick={handleSaveConfig}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className={cn('grid gap-4', gridColsClass)}>
            {visibleWidgets.map(widget => (
              <SortableWidget
                key={widget.id}
                id={widget.id}
                isDragging={activeId === widget.id}
              >
                <div
                  className={cn(
                    widget.colSpan === 2 && 'md:col-span-2',
                    widget.colSpan === 3 && 'lg:col-span-3',
                    widget.colSpan === 4 && 'lg:col-span-4'
                  )}
                >
                  {renderWidget(widget.id)}
                </div>
              </SortableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 shadow-2xl rounded-lg">
              {renderWidget(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <CardContent>
            <EyeOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Không có widget nào được hiển thị
            </p>
            <Button onClick={() => setShowConfigDialog(true)}>
              Tùy chỉnh Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function WidgetConfigButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className={className}>
      <GripVertical className="h-4 w-4 mr-2" />
      Tùy chỉnh
    </Button>
  );
}
