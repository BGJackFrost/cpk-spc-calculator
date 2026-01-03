import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Move, Save, Grid, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export interface MachinePosition { id: string; machineId: number; machineName: string; machineType: string; x: number; y: number; width: number; height: number; rotation: number; color: string; }
export interface FloorPlanConfig { id: string; name: string; width: number; height: number; gridSize: number; backgroundColor: string; machines: MachinePosition[]; }

interface FloorPlanEditorProps { config: FloorPlanConfig; availableMachines: Array<{ id: number; name: string; type: string }>; onSave: (config: FloorPlanConfig) => void; onCancel?: () => void; }

export function FloorPlanEditor({ config, availableMachines, onSave, onCancel }: FloorPlanEditorProps) {
  const [floorPlan, setFloorPlan] = useState<FloorPlanConfig>(config);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const machineColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const handleMouseDown = useCallback((e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    const machine = floorPlan.machines.find(m => m.id === machineId);
    if (!machine) return;
    setSelectedMachine(machineId);
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setDragOffset({ x: (e.clientX - rect.left) / zoom - machine.x, y: (e.clientY - rect.top) / zoom - machine.y });
  }, [floorPlan.machines, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedMachine) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newX = Math.max(0, (e.clientX - rect.left) / zoom - dragOffset.x);
    const newY = Math.max(0, (e.clientY - rect.top) / zoom - dragOffset.y);
    const snappedX = showGrid ? Math.round(newX / floorPlan.gridSize) * floorPlan.gridSize : newX;
    const snappedY = showGrid ? Math.round(newY / floorPlan.gridSize) * floorPlan.gridSize : newY;
    setFloorPlan(prev => ({ ...prev, machines: prev.machines.map(m => m.id === selectedMachine ? { ...m, x: snappedX, y: snappedY } : m) }));
  }, [isDragging, selectedMachine, dragOffset, zoom, showGrid, floorPlan.gridSize]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  const addMachine = (machineId: number) => {
    const machine = availableMachines.find(m => m.id === machineId);
    if (!machine) return;
    const newPos: MachinePosition = { id: `m_${Date.now()}`, machineId: machine.id, machineName: machine.name, machineType: machine.type, x: 50, y: 50, width: 80, height: 60, rotation: 0, color: machineColors[floorPlan.machines.length % machineColors.length] };
    setFloorPlan(prev => ({ ...prev, machines: [...prev.machines, newPos] }));
  };

  const removeMachine = (machineId: string) => { setFloorPlan(prev => ({ ...prev, machines: prev.machines.filter(m => m.id !== machineId) })); if (selectedMachine === machineId) setSelectedMachine(null); };
  const rotateMachine = (machineId: string) => { setFloorPlan(prev => ({ ...prev, machines: prev.machines.map(m => m.id === machineId ? { ...m, rotation: (m.rotation + 90) % 360 } : m) })); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showGrid ? "default" : "outline"} onClick={() => setShowGrid(!showGrid)}><Grid className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && <Button size="sm" variant="outline" onClick={onCancel}>Hủy</Button>}
          <Button size="sm" onClick={() => onSave(floorPlan)}><Save className="h-4 w-4 mr-1" /> Lưu</Button>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Move className="h-4 w-4" />{floorPlan.name}</CardTitle></CardHeader>
        <CardContent>
          <div ref={canvasRef} className="relative border rounded-lg overflow-hidden" style={{ width: floorPlan.width * zoom, height: floorPlan.height * zoom, backgroundColor: floorPlan.backgroundColor, backgroundImage: showGrid ? "linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)" : "none", backgroundSize: showGrid ? `${floorPlan.gridSize * zoom}px ${floorPlan.gridSize * zoom}px` : "auto" }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={() => setSelectedMachine(null)}>
            {floorPlan.machines.map(machine => (
              <div key={machine.id} className={`absolute cursor-move flex flex-col items-center justify-center text-white text-xs font-medium rounded shadow-lg ${selectedMachine === machine.id ? "ring-2 ring-white" : ""}`} style={{ left: machine.x * zoom, top: machine.y * zoom, width: machine.width * zoom, height: machine.height * zoom, backgroundColor: machine.color, transform: `rotate(${machine.rotation}deg)` }} onMouseDown={e => handleMouseDown(e, machine.id)}>
                <span className="truncate px-1">{machine.machineName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Danh sách máy ({floorPlan.machines.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {floorPlan.machines.map(machine => (
              <div key={machine.id} className={`flex items-center justify-between p-2 rounded border cursor-pointer ${selectedMachine === machine.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedMachine(machine.id)}>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: machine.color }} />
                  <span className="font-medium">{machine.machineName}</span>
                  <Badge variant="outline" className="text-xs">{machine.machineType}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); rotateMachine(machine.id); }}><RotateCw className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); removeMachine(machine.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableMachines.slice(0, 5).map(m => (<Button key={m.id} size="sm" variant="outline" onClick={() => addMachine(m.id)}><Plus className="h-3 w-3 mr-1" /> {m.name}</Button>))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FloorPlanEditor;
