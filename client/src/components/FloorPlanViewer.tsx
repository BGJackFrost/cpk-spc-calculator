/**
 * FloorPlanViewer - Component hiển thị layout nhà máy với realtime IoT status
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Activity, 
  AlertTriangle, CheckCircle, XCircle, Thermometer,
  Droplets, Gauge, Wind, Zap, Clock, TrendingUp
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export interface MachinePosition {
  id: string;
  machineId: number;
  machineName: string;
  machineType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

export interface FloorPlanConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  backgroundColor: string;
  backgroundImage?: string;
  machines: MachinePosition[];
}

interface SensorReading {
  id: number;
  deviceId: number;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'warning' | 'critical';
}

interface MachineStatus {
  machineId: number;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  sensors: SensorReading[];
  alertCount: number;
  lastUpdate: Date;
}

interface FloorPlanViewerProps {
  config: FloorPlanConfig;
  onMachineClick?: (machineId: number) => void;
  refreshInterval?: number;
  showLegend?: boolean;
  interactive?: boolean;
}

const statusColors: Record<string, string> = {
  online: '#22c55e',
  offline: '#6b7280',
  error: '#ef4444',
  maintenance: '#f59e0b',
};

const sensorIcons: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="h-4 w-4" />,
  humidity: <Droplets className="h-4 w-4" />,
  pressure: <Gauge className="h-4 w-4" />,
  airflow: <Wind className="h-4 w-4" />,
  power: <Zap className="h-4 w-4" />,
  vibration: <Activity className="h-4 w-4" />,
};

export function FloorPlanViewer({
  config,
  onMachineClick,
  refreshInterval = 5000,
  showLegend = true,
  interactive = true,
}: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedMachine, setSelectedMachine] = useState<MachinePosition | null>(null);
  const [machineStatuses, setMachineStatuses] = useState<Map<number, MachineStatus>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch realtime sensor data
  const { data: sensorData, refetch } = trpc.iotSensor.getRealtimeData.useQuery(
    { limit: 100 },
    { refetchInterval: refreshInterval }
  );

  // Fetch sensor readings for selected machine
  const { data: machineReadings } = trpc.iotSensor.getReadings.useQuery(
    { deviceId: selectedMachine?.machineId || 0, timeRange: '1h' },
    { enabled: !!selectedMachine }
  );

  // Update machine statuses from sensor data
  useEffect(() => {
    if (sensorData?.sensors) {
      const newStatuses = new Map<number, MachineStatus>();
      
      sensorData.sensors.forEach((sensor: any) => {
        const machineId = sensor.machineId || sensor.id;
        const existing = newStatuses.get(machineId);
        
        const reading: SensorReading = {
          id: sensor.id,
          deviceId: machineId,
          sensorType: sensor.type || 'temperature',
          value: sensor.lastReading?.value || 0,
          unit: sensor.lastReading?.unit || '°C',
          timestamp: new Date(sensor.lastReading?.timestamp || Date.now()),
          quality: sensor.lastReading?.quality || 'good',
        };

        if (existing) {
          existing.sensors.push(reading);
          existing.alertCount += sensor.alertCount || 0;
        } else {
          newStatuses.set(machineId, {
            machineId,
            status: sensor.status || 'online',
            sensors: [reading],
            alertCount: sensor.alertCount || 0,
            lastUpdate: new Date(),
          });
        }
      });

      setMachineStatuses(newStatuses);
    }
  }, [sensorData]);

  const getMachineStatus = useCallback((machineId: number): MachineStatus | undefined => {
    return machineStatuses.get(machineId);
  }, [machineStatuses]);

  const getMachineColor = useCallback((machine: MachinePosition): string => {
    const status = getMachineStatus(machine.machineId);
    if (!status) return machine.color;
    
    if (status.alertCount > 0) return statusColors.error;
    return statusColors[status.status] || machine.color;
  }, [getMachineStatus]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'offline': return <XCircle className="h-3 w-3 text-gray-500" />;
      case 'error': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'maintenance': return <Clock className="h-3 w-3 text-yellow-500" />;
      default: return null;
    }
  }, []);

  const handleMachineClick = useCallback((machine: MachinePosition) => {
    if (!interactive) return;
    setSelectedMachine(machine);
    setShowDetailDialog(true);
    onMachineClick?.(machine.machineId);
  }, [interactive, onMachineClick]);

  const handleZoomIn = () => setZoom(z => Math.min(2, z + 0.1));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.1));
  const handleResetZoom = () => setZoom(1);

  // Generate mock chart data for readings
  const chartData = useMemo(() => {
    if (!machineReadings) return [];
    return machineReadings.slice(0, 30).reverse().map((r: any, i: number) => ({
      time: new Date(r.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      value: r.value,
    }));
  }, [machineReadings]);

  return (
    <TooltipProvider>
      <div className={cn("relative", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetZoom}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <Activity className="h-4 w-4 mr-1" />
              Làm mới
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Floor Plan Canvas */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div
                className="relative transition-transform duration-200"
                style={{
                  width: config.width * zoom,
                  height: config.height * zoom,
                  backgroundColor: config.backgroundColor,
                  backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : 
                    'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: config.backgroundImage ? 'cover' : `${config.gridSize * zoom}px ${config.gridSize * zoom}px`,
                }}
              >
                {/* Machines */}
                {config.machines.map((machine) => {
                  const status = getMachineStatus(machine.machineId);
                  const machineColor = getMachineColor(machine);
                  const hasAlert = status && status.alertCount > 0;

                  return (
                    <Tooltip key={machine.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute cursor-pointer transition-all duration-200",
                            "flex flex-col items-center justify-center",
                            "rounded-lg shadow-lg border-2",
                            hasAlert && "animate-pulse",
                            interactive && "hover:scale-105 hover:shadow-xl"
                          )}
                          style={{
                            left: machine.x * zoom,
                            top: machine.y * zoom,
                            width: machine.width * zoom,
                            height: machine.height * zoom,
                            backgroundColor: machineColor,
                            borderColor: hasAlert ? '#ef4444' : 'rgba(255,255,255,0.3)',
                            transform: `rotate(${machine.rotation}deg)`,
                          }}
                          onClick={() => handleMachineClick(machine)}
                        >
                          {/* Machine Name */}
                          <span className="text-white text-xs font-medium truncate px-1 text-center">
                            {machine.machineName}
                          </span>
                          
                          {/* Status Indicator */}
                          <div className="flex items-center gap-1 mt-1">
                            {status && getStatusIcon(status.status)}
                            {hasAlert && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                {status?.alertCount}
                              </Badge>
                            )}
                          </div>

                          {/* Latest Reading */}
                          {status?.sensors[0] && (
                            <div className="text-white/80 text-[10px] mt-1">
                              {status.sensors[0].value.toFixed(1)}{status.sensors[0].unit}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{machine.machineName}</p>
                          <p className="text-xs text-muted-foreground">{machine.machineType}</p>
                          {status && (
                            <>
                              <div className="flex items-center gap-1 text-xs">
                                {getStatusIcon(status.status)}
                                <span className="capitalize">{status.status}</span>
                              </div>
                              {status.sensors.map((sensor, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs">
                                  {sensorIcons[sensor.sensorType] || <Activity className="h-3 w-3" />}
                                  <span>{sensor.sensorType}: {sensor.value.toFixed(1)}{sensor.unit}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Legend */}
        {showLegend && (
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm capitalize">{status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Machine Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMachine?.machineName}
                {getMachineStatus(selectedMachine?.machineId || 0) && (
                  <Badge variant={getMachineStatus(selectedMachine?.machineId || 0)?.status === 'online' ? 'default' : 'destructive'}>
                    {getMachineStatus(selectedMachine?.machineId || 0)?.status}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="sensors" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sensors">Sensors</TabsTrigger>
                <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
                <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
              </TabsList>

              <TabsContent value="sensors" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {getMachineStatus(selectedMachine?.machineId || 0)?.sensors.map((sensor, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {sensorIcons[sensor.sensorType] || <Activity className="h-5 w-5" />}
                            <span className="font-medium capitalize">{sensor.sensorType}</span>
                          </div>
                          <Badge variant={sensor.quality === 'good' ? 'default' : sensor.quality === 'warning' ? 'secondary' : 'destructive'}>
                            {sensor.quality}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <span className="text-2xl font-bold">{sensor.value.toFixed(1)}</span>
                          <span className="text-muted-foreground ml-1">{sensor.unit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cập nhật: {new Date(sensor.timestamp).toLocaleTimeString('vi-VN')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="chart">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Xu hướng 1 giờ qua
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" fontSize={10} />
                          <YAxis fontSize={10} />
                          <RechartsTooltip />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts">
                <div className="space-y-2">
                  {getMachineStatus(selectedMachine?.machineId || 0)?.alertCount === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Không có cảnh báo nào</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                      <p className="text-red-500 font-medium">
                        {getMachineStatus(selectedMachine?.machineId || 0)?.alertCount} cảnh báo đang hoạt động
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default FloorPlanViewer;
