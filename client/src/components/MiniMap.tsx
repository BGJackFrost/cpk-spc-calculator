import React, { useRef, useCallback, useState, useEffect } from 'react';
import { FloorPlanItem, FloorPlanConfig } from './FloorPlanDesigner';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MiniMapProps {
  config: FloorPlanConfig;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  onViewportChange: (x: number, y: number) => void;
  onClose?: () => void;
}

export function MiniMap({
  config,
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  zoom,
  onViewportChange,
  onClose,
}: MiniMapProps) {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate minimap scale - fit the entire canvas into 200px width
  const miniMapWidth = 200;
  const scale = miniMapWidth / config.width;
  const miniMapHeight = config.height * scale;

  // Calculate viewport indicator position and size
  const viewportIndicatorX = viewportX * scale;
  const viewportIndicatorY = viewportY * scale;
  const viewportIndicatorWidth = (viewportWidth / zoom) * scale;
  const viewportIndicatorHeight = (viewportHeight / zoom) * scale;

  // Handle click on minimap to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!miniMapRef.current) return;

      const rect = miniMapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert minimap coordinates to canvas coordinates
      const canvasX = clickX / scale - (viewportWidth / zoom) / 2;
      const canvasY = clickY / scale - (viewportHeight / zoom) / 2;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(config.width - viewportWidth / zoom, canvasX));
      const clampedY = Math.max(0, Math.min(config.height - viewportHeight / zoom, canvasY));

      onViewportChange(clampedX, clampedY);
    },
    [config.width, config.height, viewportWidth, viewportHeight, zoom, scale, onViewportChange]
  );

  // Handle drag on minimap
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      handleClick(e);
    },
    [handleClick]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !miniMapRef.current) return;

      const rect = miniMapRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const canvasX = clickX / scale - (viewportWidth / zoom) / 2;
      const canvasY = clickY / scale - (viewportHeight / zoom) / 2;

      const clampedX = Math.max(0, Math.min(config.width - viewportWidth / zoom, canvasX));
      const clampedY = Math.max(0, Math.min(config.height - viewportHeight / zoom, canvasY));

      onViewportChange(clampedX, clampedY);
    },
    [isDragging, config.width, config.height, viewportWidth, viewportHeight, zoom, scale, onViewportChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Get item color based on type
  const getItemColor = (item: FloorPlanItem) => {
    if (item.status) {
      const statusColors: Record<string, string> = {
        running: '#22c55e',
        idle: '#eab308',
        error: '#ef4444',
        maintenance: '#3b82f6',
        online: '#22c55e',
        offline: '#6b7280',
      };
      return statusColors[item.status] || item.color;
    }
    return item.color;
  };

  if (isCollapsed) {
    return (
      <div className="absolute bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="shadow-lg bg-background"
        >
          <Maximize2 className="w-4 h-4 mr-1" />
          Mini-map
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted border-b">
        <span className="text-xs font-medium">Mini-map</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setIsCollapsed(true)}
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={onClose}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Mini-map canvas */}
      <div
        ref={miniMapRef}
        className="relative cursor-crosshair"
        style={{
          width: miniMapWidth,
          height: miniMapHeight,
          backgroundColor: '#f3f4f6',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Grid background */}
        {config.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                               linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
              backgroundSize: `${config.gridSize * scale}px ${config.gridSize * scale}px`,
              opacity: 0.5,
            }}
          />
        )}

        {/* Render items */}
        {config.items.map((item) => {
          // Check if layer is visible
          const layer = config.layers?.find((l) => l.id === item.layerId);
          if (layer && !layer.visible) return null;

          return (
            <div
              key={item.id}
              className="absolute rounded-sm"
              style={{
                left: item.x * scale,
                top: item.y * scale,
                width: Math.max(2, item.width * scale),
                height: Math.max(2, item.height * scale),
                backgroundColor: getItemColor(item),
                transform: `rotate(${item.rotation}deg)`,
                opacity: 0.8,
              }}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
          style={{
            left: Math.max(0, viewportIndicatorX),
            top: Math.max(0, viewportIndicatorY),
            width: Math.min(viewportIndicatorWidth, miniMapWidth - viewportIndicatorX),
            height: Math.min(viewportIndicatorHeight, miniMapHeight - viewportIndicatorY),
          }}
        />
      </div>

      {/* Info */}
      <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/50 border-t">
        {config.items.length} đối tượng • {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export default MiniMap;
