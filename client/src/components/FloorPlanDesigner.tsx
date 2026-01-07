import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  FolderOpen,
  Download,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Move,
  Square,
  Circle,
  Factory,
  Cpu,
  Settings,
  Maximize2,
  Minimize2,
  Copy,
  Layers,
} from 'lucide-react';

// Types
export interface FloorPlanItem {
  id: string;
  type: 'machine' | 'workstation' | 'conveyor' | 'storage' | 'wall' | 'door' | 'custom';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  status?: 'running' | 'idle' | 'error' | 'maintenance';
  machineId?: number;
  metadata?: Record<string, any>;
}

export interface FloorPlanConfig {
  id?: number;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  items: FloorPlanItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Palette items
const PALETTE_ITEMS = [
  { type: 'machine', name: 'Máy móc', icon: Cpu, color: '#3b82f6', width: 80, height: 60 },
  { type: 'workstation', name: 'Công trạm', icon: Factory, color: '#10b981', width: 100, height: 80 },
  { type: 'conveyor', name: 'Băng tải', icon: Move, color: '#6b7280', width: 150, height: 30 },
  { type: 'storage', name: 'Kho', icon: Square, color: '#f59e0b', width: 100, height: 100 },
  { type: 'wall', name: 'Tường', icon: Layers, color: '#374151', width: 10, height: 100 },
  { type: 'door', name: 'Cửa', icon: Maximize2, color: '#8b5cf6', width: 60, height: 10 },
];

// Draggable Palette Item
function PaletteItem({ item }: { item: typeof PALETTE_ITEMS[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: { type: 'palette', item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex flex-col items-center p-2 border rounded cursor-grab hover:bg-accent transition-colors"
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center mb-1"
        style={{ backgroundColor: item.color }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs text-center">{item.name}</span>
    </div>
  );
}

// Draggable Floor Item
function FloorItem({
  item,
  isSelected,
  onSelect,
  onDelete,
  onRotate,
  onResize,
  gridSize,
}: {
  item: FloorPlanItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onResize: (width: number, height: number) => void;
  gridSize: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'floor', item },
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transform: `${CSS.Translate.toString(transform)} rotate(${item.rotation}deg)`,
    backgroundColor: item.color,
    opacity: isDragging ? 0.7 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isSelected ? 100 : 1,
  };

  const statusColors: Record<string, string> = {
    running: '#22c55e',
    idle: '#eab308',
    error: '#ef4444',
    maintenance: '#3b82f6',
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: item.width,
      startHeight: item.height,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      const newWidth = Math.max(20, Math.round((resizeRef.current.startWidth + deltaX) / gridSize) * gridSize);
      const newHeight = Math.max(20, Math.round((resizeRef.current.startHeight + deltaY) / gridSize) * gridSize);
      onResize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, gridSize, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`rounded shadow-md flex items-center justify-center text-white text-xs font-medium select-none ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
    >
      {/* Status indicator */}
      {item.status && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: statusColors[item.status] }}
        />
      )}

      {/* Item name */}
      <span className="truncate px-1">{item.name}</span>

      {/* Selected controls */}
      {isSelected && !isDragging && (
        <>
          {/* Delete button */}
          <button
            className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>

          {/* Rotate button */}
          <button
            className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
          >
            <RotateCw className="w-3 h-3 text-white" />
          </button>

          {/* Resize handle */}
          <div
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded cursor-se-resize"
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  );
}

// Main Designer Component
export function FloorPlanDesigner({
  initialConfig,
  onSave,
  onExport,
  machines = [],
}: {
  initialConfig?: FloorPlanConfig;
  onSave?: (config: FloorPlanConfig) => void;
  onExport?: (format: 'png' | 'pdf') => void;
  machines?: Array<{ id: number; name: string; status?: string }>;
}) {
  const [config, setConfig] = useState<FloorPlanConfig>(
    initialConfig || {
      name: 'Sơ đồ nhà máy mới',
      width: 1200,
      height: 800,
      gridSize: 20,
      showGrid: true,
      items: [],
    }
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Generate unique ID
  const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Snap to grid
  const snapToGrid = (value: number) => Math.round(value / config.gridSize) * config.gridSize;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveId(null);

    const activeData = active.data.current;

    // Adding new item from palette
    if (activeData?.type === 'palette' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const paletteItem = activeData.item as typeof PALETTE_ITEMS[0];
      
      // Calculate position relative to canvas, accounting for zoom
      // The canvas has transform: scale(zoom), so we need to divide by zoom to get actual position
      const dropX = (event.activatorEvent as MouseEvent).clientX + delta.x;
      const dropY = (event.activatorEvent as MouseEvent).clientY + delta.y;
      const x = snapToGrid((dropX - rect.left) / zoom - paletteItem.width / 2);
      const y = snapToGrid((dropY - rect.top) / zoom - paletteItem.height / 2);

      // Check if dropped inside canvas
      if (x >= 0 && y >= 0 && x < config.width && y < config.height) {
        const newItem: FloorPlanItem = {
          id: generateId(),
          type: paletteItem.type as FloorPlanItem['type'],
          name: `${paletteItem.name} ${config.items.length + 1}`,
          x,
          y,
          width: paletteItem.width,
          height: paletteItem.height,
          rotation: 0,
          color: paletteItem.color,
        };

        setConfig((prev) => ({
          ...prev,
          items: [...prev.items, newItem],
        }));
        setSelectedItemId(newItem.id);
      }
    }
    // Moving existing item
    else if (activeData?.type === 'floor') {
      const item = activeData.item as FloorPlanItem;
      const newX = snapToGrid(item.x + delta.x / zoom);
      const newY = snapToGrid(item.y + delta.y / zoom);

      // Keep within bounds
      const boundedX = Math.max(0, Math.min(config.width - item.width, newX));
      const boundedY = Math.max(0, Math.min(config.height - item.height, newY));

      setConfig((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === item.id ? { ...i, x: boundedX, y: boundedY } : i
        ),
      }));
    }
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
    setSelectedItemId(null);
  };

  // Rotate item
  const handleRotateItem = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === id ? { ...i, rotation: (i.rotation + 90) % 360 } : i
      ),
    }));
  };

  // Resize item
  const handleResizeItem = (id: string, width: number, height: number) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === id ? { ...i, width, height } : i
      ),
    }));
  };

  // Update item properties
  const updateSelectedItem = (updates: Partial<FloorPlanItem>) => {
    if (!selectedItemId) return;
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === selectedItemId ? { ...i, ...updates } : i
      ),
    }));
  };

  // Duplicate item
  const duplicateItem = (id: string) => {
    const item = config.items.find((i) => i.id === id);
    if (!item) return;

    const newItem: FloorPlanItem = {
      ...item,
      id: generateId(),
      name: `${item.name} (copy)`,
      x: item.x + 20,
      y: item.y + 20,
    };

    setConfig((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setSelectedItemId(newItem.id);
  };

  // Export to PNG
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    
    // Use html2canvas if available, otherwise just call onExport
    if (onExport) {
      onExport('png');
    }
  };

  const selectedItem = config.items.find((i) => i.id === selectedItemId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4">
        {/* Left Panel - Palette */}
        <Card className="w-48 flex-shrink-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Thư viện</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_ITEMS.map((item) => (
                <PaletteItem key={item.type} item={item} />
              ))}
            </div>

            {/* Machine list */}
            {machines.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium mb-2">Máy móc có sẵn</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="text-xs p-1 border rounded cursor-pointer hover:bg-accent"
                      onClick={() => {
                        const newItem: FloorPlanItem = {
                          id: generateId(),
                          type: 'machine',
                          name: machine.name,
                          x: 100,
                          y: 100,
                          width: 80,
                          height: 60,
                          rotation: 0,
                          color: '#3b82f6',
                          machineId: machine.id,
                          status: machine.status as any,
                        };
                        setConfig((prev) => ({
                          ...prev,
                          items: [...prev.items, newItem],
                        }));
                      }}
                    >
                      {machine.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
            <Input
              value={config.name}
              onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
              className="w-48 h-8"
              placeholder="Tên sơ đồ"
            />

            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
            >
              <Grid3X3 className={`w-4 h-4 ${config.showGrid ? 'text-primary' : ''}`} />
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportPng}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>

            <Button size="sm" onClick={() => onSave?.(config)}>
              <Save className="w-4 h-4 mr-1" />
              Lưu
            </Button>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto border rounded bg-gray-100 dark:bg-gray-900">
            <div
              ref={canvasRef}
              className="relative bg-white dark:bg-gray-800"
              style={{
                width: config.width * zoom,
                height: config.height * zoom,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                backgroundImage: config.showGrid
                  ? `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                     linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`
                  : 'none',
                backgroundSize: `${config.gridSize}px ${config.gridSize}px`,
              }}
              onClick={() => setSelectedItemId(null)}
            >
              {config.items.map((item) => (
                <FloorItem
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedItemId}
                  onSelect={() => setSelectedItemId(item.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onRotate={() => handleRotateItem(item.id)}
                  onResize={(w, h) => handleResizeItem(item.id, w, h)}
                  gridSize={config.gridSize}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <Card className="w-56 flex-shrink-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Thuộc tính</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-3">
            {selectedItem ? (
              <>
                <div>
                  <Label className="text-xs">Tên</Label>
                  <Input
                    value={selectedItem.name}
                    onChange={(e) => updateSelectedItem({ name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X</Label>
                    <Input
                      type="number"
                      value={selectedItem.x}
                      onChange={(e) => updateSelectedItem({ x: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y</Label>
                    <Input
                      type="number"
                      value={selectedItem.y}
                      onChange={(e) => updateSelectedItem({ y: parseInt(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Rộng</Label>
                    <Input
                      type="number"
                      value={selectedItem.width}
                      onChange={(e) => updateSelectedItem({ width: parseInt(e.target.value) || 20 })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cao</Label>
                    <Input
                      type="number"
                      value={selectedItem.height}
                      onChange={(e) => updateSelectedItem({ height: parseInt(e.target.value) || 20 })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Xoay (độ)</Label>
                  <Slider
                    value={[selectedItem.rotation]}
                    onValueChange={([v]) => updateSelectedItem({ rotation: v })}
                    min={0}
                    max={360}
                    step={15}
                    className="mt-1"
                  />
                  <span className="text-xs text-muted-foreground">{selectedItem.rotation}°</span>
                </div>

                <div>
                  <Label className="text-xs">Màu sắc</Label>
                  <Input
                    type="color"
                    value={selectedItem.color}
                    onChange={(e) => updateSelectedItem({ color: e.target.value })}
                    className="h-8 w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => duplicateItem(selectedItem.id)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Nhân bản
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeleteItem(selectedItem.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Xóa
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Chọn một đối tượng để chỉnh sửa
              </p>
            )}

            {/* Canvas info */}
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium mb-2">Thông tin Canvas</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Kích thước: {config.width} x {config.height}</p>
                <p>Lưới: {config.gridSize}px</p>
                <p>Số đối tượng: {config.items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cài đặt Canvas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chiều rộng (px)</Label>
                  <Input
                    type="number"
                    value={config.width}
                    onChange={(e) => setConfig((prev) => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                  />
                </div>
                <div>
                  <Label>Chiều cao (px)</Label>
                  <Input
                    type="number"
                    value={config.height}
                    onChange={(e) => setConfig((prev) => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                  />
                </div>
              </div>
              <div>
                <Label>Kích thước lưới (px)</Label>
                <Input
                  type="number"
                  value={config.gridSize}
                  onChange={(e) => setConfig((prev) => ({ ...prev, gridSize: parseInt(e.target.value) || 20 }))}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeId.startsWith('palette-') && (
          <div className="w-16 h-12 bg-primary/50 rounded flex items-center justify-center text-white text-xs">
            Thả vào canvas
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default FloorPlanDesigner;
