import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MiniMap } from './MiniMap';
import { GroupManager, FloorPlanGroup } from './GroupManager';
import { SelectionBox } from './SelectionBox';
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
  Map,
  Group,
  Ungroup,
  Focus,
  MousePointer2,
} from 'lucide-react';

// Types
export interface FloorPlanItem {
  id: string;
  type: 'machine' | 'workstation' | 'conveyor' | 'storage' | 'wall' | 'door' | 'custom' | 'iot_device';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  status?: 'running' | 'idle' | 'error' | 'maintenance' | 'online' | 'offline';
  machineId?: number;
  iotDeviceId?: number;
  iotDeviceCode?: string;
  iotDeviceType?: string;
  layerId?: string; // Layer mà item thuộc về
  groupId?: string; // Group mà item thuộc về
  metadata?: Record<string, any>;
}

// Layer interface
export interface FloorPlanLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  zIndex: number;
}

export interface FloorPlanConfig {
  id?: number;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  items: FloorPlanItem[];
  layers?: FloorPlanLayer[]; // Danh sách layers
  groups?: FloorPlanGroup[]; // Danh sách groups
  createdAt?: Date;
  updatedAt?: Date;
}

// Default layers
const DEFAULT_LAYERS: FloorPlanLayer[] = [
  { id: 'layer-default', name: 'Mặc định', visible: true, locked: false, color: '#6b7280', zIndex: 0 },
  { id: 'layer-machines', name: 'Máy móc', visible: true, locked: false, color: '#3b82f6', zIndex: 1 },
  { id: 'layer-workstations', name: 'Công trạm', visible: true, locked: false, color: '#10b981', zIndex: 2 },
  { id: 'layer-iot', name: 'Thiết bị IoT', visible: true, locked: false, color: '#8b5cf6', zIndex: 3 },
];

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
  isLayerVisible = true,
  isLayerLocked = false,
  onIoTClick,
}: {
  item: FloorPlanItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onResize: (width: number, height: number) => void;
  gridSize: number;
  isLayerVisible?: boolean;
  isLayerLocked?: boolean;
  onIoTClick?: () => void;
}) {
  // Ẩn item nếu layer không hiển thị
  if (!isLayerVisible) return null;
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
    online: '#22c55e',
    offline: '#6b7280',
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
      style={{
        ...style,
        pointerEvents: isLayerLocked ? 'none' : 'auto',
        opacity: isLayerLocked ? 0.6 : (isDragging ? 0.7 : 1),
      }}
      {...(isLayerLocked ? {} : listeners)}
      {...(isLayerLocked ? {} : attributes)}
      onClick={(e) => {
        e.stopPropagation();
        if (isLayerLocked) return;
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // Double click vào IoT device để mở popup chi tiết
        if (item.type === 'iot_device' && onIoTClick) {
          onIoTClick();
        }
      }}
      className={`rounded shadow-md flex items-center justify-center text-white text-xs font-medium select-none ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${isLayerLocked ? 'cursor-not-allowed' : ''} ${item.type === 'iot_device' ? 'cursor-pointer' : ''}`}
    >
      {/* Status indicator */}
      {item.status && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white animate-pulse"
          style={{ backgroundColor: statusColors[item.status] }}
        />
      )}

      {/* IoT device icon */}
      {item.type === 'iot_device' && (
        <Cpu className="w-4 h-4 mr-1" />
      )}

      {/* Item name */}
      <span className="truncate px-1">{item.name}</span>

      {/* Lock indicator */}
      {isLayerLocked && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-[8px]">🔒</span>
        </div>
      )}

      {/* Selected controls - chỉ hiển thị khi không bị lock */}
      {isSelected && !isDragging && !isLayerLocked && (
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

          {/* Info button cho IoT device */}
          {item.type === 'iot_device' && onIoTClick && (
            <button
              className="absolute -bottom-3 -left-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center hover:bg-purple-600"
              onClick={(e) => {
                e.stopPropagation();
                onIoTClick();
              }}
              title="Xem chi tiết thiết bị"
            >
              <Cpu className="w-3 h-3 text-white" />
            </button>
          )}

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

// IoT Device interface
export interface IoTDeviceForLayout {
  id: number;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location?: string;
}

// Main Designer Component
export function FloorPlanDesigner({
  initialConfig,
  onSave,
  onExport,
  machines = [],
  iotDevices = [],
  onIotDeviceStatusChange,
  autoRefreshInterval = 30000, // 30 giây mặc định
  onIotDeviceClick,
}: {
  initialConfig?: FloorPlanConfig;
  onSave?: (config: FloorPlanConfig) => void;
  onExport?: (format: 'png' | 'pdf') => void;
  machines?: Array<{ id: number; name: string; status?: string }>;
  iotDevices?: IoTDeviceForLayout[];
  onIotDeviceStatusChange?: (deviceId: number, status: string) => void;
  autoRefreshInterval?: number; // Interval auto-refresh IoT status (ms)
  onIotDeviceClick?: (device: IoTDeviceForLayout) => void; // Callback khi click vào IoT device
}) {
  const [config, setConfig] = useState<FloorPlanConfig>(
    initialConfig || {
      name: 'Sơ đồ nhà máy mới',
      width: 1200,
      height: 800,
      gridSize: 20,
      showGrid: true,
      items: [],
      layers: DEFAULT_LAYERS,
    }
  );

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]); // Multi-select
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        ...initialConfig,
        layers: initialConfig.layers || DEFAULT_LAYERS,
        groups: initialConfig.groups || [],
      });
    }
  }, [initialConfig]);

  // Khởi tạo layers nếu chưa có
  useEffect(() => {
    if (!config.layers || config.layers.length === 0) {
      setConfig(prev => ({ ...prev, layers: DEFAULT_LAYERS }));
    }
  }, []);

  // Auto-refresh IoT device status
  useEffect(() => {
    if (autoRefreshInterval <= 0 || iotDevices.length === 0) return;

    const intervalId = setInterval(() => {
      // Cập nhật trạng thái IoT devices trên sơ đồ
      setConfig(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.type === 'iot_device' && item.iotDeviceId) {
            const device = iotDevices.find(d => d.id === item.iotDeviceId);
            if (device) {
              const statusColors: Record<string, string> = {
                online: '#22c55e',
                offline: '#6b7280',
                error: '#ef4444',
                maintenance: '#3b82f6',
              };
              return {
                ...item,
                status: device.status,
                color: statusColors[device.status] || '#6b7280',
              };
            }
          }
          return item;
        }),
      }));
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, iotDevices]);

  // Track viewport scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setViewportOffset({
        x: container.scrollLeft / zoom,
        y: container.scrollTop / zoom,
      });
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [zoom]);

  // Calculate bounds of all items for zoom to fit
  const calculateBounds = useCallback(() => {
    if (config.items.length === 0) {
      return { minX: 0, minY: 0, maxX: config.width, maxY: config.height };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    config.items.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    // Add padding
    const padding = 50;
    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      maxX: Math.min(config.width, maxX + padding),
      maxY: Math.min(config.height, maxY + padding),
    };
  }, [config.items, config.width, config.height]);

  // Zoom to fit all items
  const handleZoomToFit = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const bounds = calculateBounds();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const containerWidth = container.clientWidth - 20; // Account for padding
    const containerHeight = container.clientHeight - 20;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newZoom = Math.min(Math.max(0.25, Math.min(scaleX, scaleY)), 2);

    setZoom(newZoom);

    // Center the content
    setTimeout(() => {
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      container.scrollLeft = centerX * newZoom - containerWidth / 2;
      container.scrollTop = centerY * newZoom - containerHeight / 2;
    }, 50);
  }, [calculateBounds]);

  // Handle viewport change from mini-map
  const handleViewportChange = useCallback((x: number, y: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollLeft = x * zoom;
    container.scrollTop = y * zoom;
  }, [zoom]);

  // Get viewport dimensions
  const getViewportDimensions = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return { width: 800, height: 600 };
    return { width: container.clientWidth, height: container.clientHeight };
  }, []);

  // Group management functions
  const handleCreateGroup = useCallback((name: string, itemIds: string[]) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: FloorPlanGroup = {
      id: groupId,
      name,
      itemIds,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      locked: false,
      createdAt: Date.now(),
    };

    setConfig((prev) => ({
      ...prev,
      groups: [...(prev.groups || []), newGroup],
      items: prev.items.map((item) =>
        itemIds.includes(item.id) ? { ...item, groupId } : item
      ),
    }));

    setSelectedItemIds([]);
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: (prev.groups || []).filter((g) => g.id !== groupId),
      items: prev.items.map((item) =>
        item.groupId === groupId ? { ...item, groupId: undefined } : item
      ),
    }));
  }, []);

  const handleUngroupItems = useCallback((groupId: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: (prev.groups || []).filter((g) => g.id !== groupId),
      items: prev.items.map((item) =>
        item.groupId === groupId ? { ...item, groupId: undefined } : item
      ),
    }));
  }, []);

  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g) =>
        g.id === groupId ? { ...g, name: newName } : g
      ),
    }));
  }, []);

  const handleToggleGroupLock = useCallback((groupId: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g) =>
        g.id === groupId ? { ...g, locked: !g.locked } : g
      ),
    }));
  }, []);

  const handleSelectGroup = useCallback((groupId: string) => {
    const group = config.groups?.find((g) => g.id === groupId);
    if (group) {
      setSelectedItemIds(group.itemIds);
      setSelectedItemId(null);
    }
  }, [config.groups]);

  // Handle multi-select with Ctrl+Click
  const handleItemClick = useCallback((itemId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey || isMultiSelectMode) {
      // Toggle selection
      setSelectedItemIds((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId]
      );
      setSelectedItemId(null);
    } else {
      // Single select
      setSelectedItemId(itemId);
      setSelectedItemIds([]);
    }
  }, [isMultiSelectMode]);

  // Handle selection box change
  const handleSelectionChange = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      setSelectedItemIds(ids);
      setSelectedItemId(null);
    }
  }, []);

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
    else if (activeData?.type === 'floor' && canvasRef.current) {
      const draggedItem = activeData.item as FloorPlanItem;
      
      // Get current item from state (not from drag data which has stale position)
      const currentItem = config.items.find(i => i.id === draggedItem.id);
      if (!currentItem) return;
      
      // Get canvas rect to calculate proper position
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate the final drop position based on cursor position
      // The activatorEvent gives us the initial mouse position when drag started
      // delta gives us how much the mouse moved
      const finalMouseX = (event.activatorEvent as MouseEvent).clientX + delta.x;
      const finalMouseY = (event.activatorEvent as MouseEvent).clientY + delta.y;
      
      // Convert screen coordinates to canvas coordinates
      // Account for zoom by dividing by zoom (since canvas is scaled)
      const canvasX = (finalMouseX - rect.left) / zoom;
      const canvasY = (finalMouseY - rect.top) / zoom;
      
      // Center the item on the cursor position
      const newX = snapToGrid(canvasX - currentItem.width / 2);
      const newY = snapToGrid(canvasY - currentItem.height / 2);

      // Keep within bounds
      const boundedX = Math.max(0, Math.min(config.width - currentItem.width, newX));
      const boundedY = Math.max(0, Math.min(config.height - currentItem.height, newY));

      setConfig((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === currentItem.id ? { ...i, x: boundedX, y: boundedY } : i
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

            {/* IoT Devices list */}
            {iotDevices.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  Thiết bị IoT
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {iotDevices.map((device) => {
                    const statusColors: Record<string, string> = {
                      online: '#22c55e',
                      offline: '#6b7280',
                      error: '#ef4444',
                      maintenance: '#3b82f6',
                    };
                    return (
                      <div
                        key={device.id}
                        className="text-xs p-2 border rounded cursor-pointer hover:bg-accent flex items-center gap-2"
                        onClick={() => {
                          const newItem: FloorPlanItem = {
                            id: generateId(),
                            type: 'iot_device',
                            name: device.deviceName,
                            x: 100,
                            y: 100,
                            width: 60,
                            height: 60,
                            rotation: 0,
                            color: statusColors[device.status] || '#6b7280',
                            iotDeviceId: device.id,
                            iotDeviceCode: device.deviceCode,
                            iotDeviceType: device.deviceType,
                            status: device.status,
                          };
                          setConfig((prev) => ({
                            ...prev,
                            items: [...prev.items, newItem],
                          }));
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusColors[device.status] || '#6b7280' }}
                        />
                        <span className="truncate flex-1">{device.deviceName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {device.deviceType}
                        </span>
                      </div>
                    );
                  })}
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
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomToFit}
                title="Zoom to Fit - Hiển thị toàn bộ sơ đồ"
              >
                <Focus className="w-4 h-4" />
              </Button>
            </div>

            {/* Multi-select mode toggle */}
            <Button
              variant={isMultiSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              title={isMultiSelectMode ? 'Tắt chế độ chọn nhiều' : 'Bật chế độ chọn nhiều (hoặc giữ Ctrl+Click)'}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>

            {/* Group button - only show when multiple items selected */}
            {selectedItemIds.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupPanel(true)}
                title="Tạo nhóm từ các đối tượng đã chọn"
              >
                <Group className="w-4 h-4 mr-1" />
                Nhóm ({selectedItemIds.length})
              </Button>
            )}

            {/* Mini-map toggle */}
            <Button
              variant={showMiniMap ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMiniMap(!showMiniMap)}
              title={showMiniMap ? 'Ẩn Mini-map' : 'Hiển Mini-map'}
            >
              <Map className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfig((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
            >
              <Grid3X3 className={`w-4 h-4 ${config.showGrid ? 'text-primary' : ''}`} />
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowLayerPanel(true)}>
              <Layers className="w-4 h-4" />
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
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-auto border rounded bg-gray-100 dark:bg-gray-900 relative"
          >
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
              onClick={(e) => {
                // Clear selection when clicking on empty canvas
                if (e.target === e.currentTarget) {
                  setSelectedItemId(null);
                  if (!e.ctrlKey && !e.metaKey && !isMultiSelectMode) {
                    setSelectedItemIds([]);
                  }
                }
              }}
            >
              {/* Selection Box for multi-select */}
              <SelectionBox
                items={config.items}
                zoom={zoom}
                onSelectionChange={handleSelectionChange}
                canvasRef={canvasRef}
                enabled={isMultiSelectMode}
              />

              {config.items.map((item) => {
                const layer = config.layers?.find(l => l.id === item.layerId);
                const isLayerVisible = layer ? layer.visible : true;
                const isLayerLocked = layer ? layer.locked : false;
                const isInSelectedGroup = selectedItemIds.includes(item.id);
                const group = config.groups?.find(g => g.id === item.groupId);
                
                // Tìm IoT device tương ứng
                const iotDevice = item.type === 'iot_device' && item.iotDeviceId
                  ? iotDevices.find(d => d.id === item.iotDeviceId)
                  : undefined;

                return (
                  <FloorItem
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedItemId || isInSelectedGroup}
                    onSelect={() => handleItemClick(item.id, window.event as any)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onRotate={() => handleRotateItem(item.id)}
                    onResize={(w, h) => handleResizeItem(item.id, w, h)}
                    gridSize={config.gridSize}
                    isLayerVisible={isLayerVisible}
                    isLayerLocked={isLayerLocked || group?.locked}
                    onIoTClick={iotDevice && onIotDeviceClick ? () => onIotDeviceClick(iotDevice) : undefined}
                  />
                );
              })}
            </div>

            {/* Mini-map */}
            {showMiniMap && (
              <MiniMap
                config={config}
                viewportX={viewportOffset.x}
                viewportY={viewportOffset.y}
                viewportWidth={getViewportDimensions().width}
                viewportHeight={getViewportDimensions().height}
                zoom={zoom}
                onViewportChange={handleViewportChange}
                onClose={() => setShowMiniMap(false)}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Properties */}
        <Card className="w-56 flex-shrink-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Thuộc tính</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-3">
            {/* Multi-select info */}
            {selectedItemIds.length > 0 && (
              <div className="p-2 bg-primary/10 rounded border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Đã chọn {selectedItemIds.length} đối tượng</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={() => setSelectedItemIds([])}
                  >
                    Bỏ chọn
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setShowGroupPanel(true)}
                  >
                    <Group className="w-3 h-3 mr-1" />
                    Tạo nhóm
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      selectedItemIds.forEach(id => handleDeleteItem(id));
                      setSelectedItemIds([]);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

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

                {/* Layer selector */}
                <div>
                  <Label className="text-xs">Layer</Label>
                  <select
                    value={selectedItem.layerId || 'layer-default'}
                    onChange={(e) => updateSelectedItem({ layerId: e.target.value })}
                    className="w-full h-8 text-sm border rounded px-2 bg-background"
                  >
                    {(config.layers || DEFAULT_LAYERS).map(layer => (
                      <option key={layer.id} value={layer.id}>
                        {layer.name}
                      </option>
                    ))}
                  </select>
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
                <p>Số nhóm: {config.groups?.length || 0}</p>
              </div>
            </div>

            {/* Groups list */}
            {(config.groups?.length || 0) > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium">Nhóm</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={() => setShowGroupPanel(true)}
                  >
                    Quản lý
                  </Button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {config.groups?.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-1 text-xs p-1 rounded hover:bg-accent cursor-pointer"
                      onClick={() => handleSelectGroup(group.id)}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="truncate flex-1">{group.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {group.itemIds.length}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Layer Panel Dialog */}
        <Dialog open={showLayerPanel} onOpenChange={setShowLayerPanel}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Quản lý Layers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {(config.layers || DEFAULT_LAYERS).map((layer, index) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    selectedLayerId === layer.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  {/* Layer color indicator */}
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: layer.color }}
                  />

                  {/* Layer name */}
                  <div className="flex-1">
                    <Input
                      value={layer.name}
                      onChange={(e) => {
                        setConfig(prev => ({
                          ...prev,
                          layers: prev.layers?.map(l =>
                            l.id === layer.id ? { ...l, name: e.target.value } : l
                          ),
                        }));
                      }}
                      className="h-7 text-sm"
                    />
                  </div>

                  {/* Visibility toggle */}
                  <Button
                    variant={layer.visible ? 'default' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfig(prev => ({
                        ...prev,
                        layers: prev.layers?.map(l =>
                          l.id === layer.id ? { ...l, visible: !l.visible } : l
                        ),
                      }));
                    }}
                    title={layer.visible ? 'Ẩn layer' : 'Hiển layer'}
                  >
                    {layer.visible ? '👁' : '🙈'}
                  </Button>

                  {/* Lock toggle */}
                  <Button
                    variant={layer.locked ? 'destructive' : 'outline'}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfig(prev => ({
                        ...prev,
                        layers: prev.layers?.map(l =>
                          l.id === layer.id ? { ...l, locked: !l.locked } : l
                        ),
                      }));
                    }}
                    title={layer.locked ? 'Mở khóa layer' : 'Khóa layer'}
                  >
                    {layer.locked ? '🔒' : '🔓'}
                  </Button>

                  {/* Items count */}
                  <Badge variant="secondary" className="text-xs">
                    {config.items.filter(i => (i.layerId || 'layer-default') === layer.id).length}
                  </Badge>
                </div>
              ))}

              {/* Add new layer button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const newLayer: FloorPlanLayer = {
                    id: `layer-${Date.now()}`,
                    name: `Layer ${(config.layers?.length || 0) + 1}`,
                    visible: true,
                    locked: false,
                    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                    zIndex: (config.layers?.length || 0),
                  };
                  setConfig(prev => ({
                    ...prev,
                    layers: [...(prev.layers || DEFAULT_LAYERS), newLayer],
                  }));
                }}
              >
                + Thêm Layer mới
              </Button>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p>👁 = Hiển/Ẩn layer</p>
                <p>🔒 = Khóa/Mở khóa (không thể di chuyển/chỉnh sửa)</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Group Panel Dialog */}
        <Dialog open={showGroupPanel} onOpenChange={setShowGroupPanel}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Group className="w-5 h-5" />
                Quản lý Nhóm
              </DialogTitle>
            </DialogHeader>
            <GroupManager
              groups={config.groups || []}
              items={config.items}
              selectedItemIds={selectedItemIds}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
              onUngroupItems={handleUngroupItems}
              onRenameGroup={handleRenameGroup}
              onToggleGroupLock={handleToggleGroupLock}
              onSelectGroup={(groupId) => {
                handleSelectGroup(groupId);
                setShowGroupPanel(false);
              }}
            />
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
