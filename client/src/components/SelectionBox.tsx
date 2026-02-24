import React, { useState, useCallback, useEffect } from 'react';
import { FloorPlanItem } from './FloorPlanDesigner';

interface SelectionBoxProps {
  items: FloorPlanItem[];
  zoom: number;
  onSelectionChange: (selectedIds: string[]) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  enabled: boolean;
}

export function SelectionBox({
  items,
  zoom,
  onSelectionChange,
  canvasRef,
  enabled,
}: SelectionBoxProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });

  // Calculate selection box bounds
  const getSelectionBounds = useCallback(() => {
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    return { left, top, width, height };
  }, [startPoint, currentPoint]);

  // Check if an item intersects with selection box
  const itemIntersectsSelection = useCallback(
    (item: FloorPlanItem, bounds: { left: number; top: number; width: number; height: number }) => {
      const itemLeft = item.x * zoom;
      const itemTop = item.y * zoom;
      const itemRight = itemLeft + item.width * zoom;
      const itemBottom = itemTop + item.height * zoom;

      const selRight = bounds.left + bounds.width;
      const selBottom = bounds.top + bounds.height;

      return !(
        itemRight < bounds.left ||
        itemLeft > selRight ||
        itemBottom < bounds.top ||
        itemTop > selBottom
      );
    },
    [zoom]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !canvasRef.current) return;
      
      // Only start selection on left click and when clicking on canvas (not on items)
      if (e.button !== 0) return;
      
      const target = e.target as HTMLElement;
      // Don't start selection if clicking on an item
      if (target.closest('[data-floor-item]')) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
      setIsSelecting(true);
    },
    [enabled, canvasRef]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      setCurrentPoint({ x, y });
    },
    [isSelecting, canvasRef]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    const bounds = getSelectionBounds();
    
    // Only select if box has meaningful size
    if (bounds.width > 5 && bounds.height > 5) {
      const selectedIds = items
        .filter((item) => itemIntersectsSelection(item, bounds))
        .map((item) => item.id);
      
      onSelectionChange(selectedIds);
    }

    setIsSelecting(false);
  }, [isSelecting, items, getSelectionBounds, itemIntersectsSelection, onSelectionChange]);

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, handleMouseDown, handleMouseMove, handleMouseUp, canvasRef]);

  // Don't render if not selecting
  if (!isSelecting) return null;

  const bounds = getSelectionBounds();

  return (
    <div
      className="absolute pointer-events-none border-2 border-primary border-dashed bg-primary/10 z-50"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
    />
  );
}

export default SelectionBox;
