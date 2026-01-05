/**
 * IoTFloorPlanIntegration - Sơ đồ mặt bằng nhà máy với vị trí thiết bị IoT realtime
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Map, Plus, Settings, Trash2, Move, ZoomIn, ZoomOut, 
  Maximize2, Layers, Cpu, Wifi, Server, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Upload, Download, Edit
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Device status colors
const statusColors: Record<string, string> = {
  active: "#22c55e",
  online: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  offline: "#6b7280",
  maintenance: "#8b5cf6",
};

// Device type icons
const deviceTypeIcons: Record<string, React.ReactNode> = {
  plc: <Cpu className="h-4 w-4" />,
  sensor: <Wifi className="h-4 w-4" />,
  gateway: <Server className="h-4 w-4" />,
  hmi: <Cpu className="h-4 w-4" />,
  scada: <Server className="h-4 w-4" />,
};

// Zone type colors
const zoneColors: Record<string, string> = {
  production: "rgba(59, 130, 246, 0.2)",
  warehouse: "rgba(34, 197, 94, 0.2)",
  office: "rgba(168, 85, 247, 0.2)",
  maintenance: "rgba(249, 115, 22, 0.2)",
  restricted: "rgba(239, 68, 68, 0.2)",
  common: "rgba(107, 114, 128, 0.2)",
};

interface DevicePosition {
  id: number;
  deviceId: number;
  positionX: number;
  positionY: number;
  deviceName?: string;
  deviceCode?: string;
  deviceType?: string;
  status?: string;
  healthScore?: number;
  zoneId?: number | null;
  showLabel?: number;
  showStatus?: number;
  iconSize?: number;
  rotation?: number;
}

interface Zone {
  id: number;
  name: string;
  zoneType?: string;
  coordinates: { x: number; y: number }[];
  color?: string;
  opacity?: string;
  isActive?: number;
}

interface FloorPlan {
  id: number;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  buildingName?: string;
  floorNumber?: number;
  zones?: Zone[];
  devices?: DevicePosition[];
}

export default function IoTFloorPlanIntegration() {
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("view");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedDevice, setSelectedDevice] = useState<DevicePosition | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isPlacingDevice, setIsPlacingDevice] = useState(false);
  const [deviceToPlace, setDeviceToPlace] = useState<number | null>(null);
  const [showCreateFloorPlan, setShowCreateFloorPlan] = useState(false);
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [zonePoints, setZonePoints] = useState<{ x: number; y: number }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Form states
  const [floorPlanForm, setFloorPlanForm] = useState({
    name: "",
    description: "",
    buildingName: "",
    floorNumber: 1,
    imageUrl: "",
    imageWidth: 1000,
    imageHeight: 600,
  });

  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
    zoneType: "production" as const,
    color: "#3b82f6",
  });

  // Queries
  const { data: floorPlans, refetch: refetchFloorPlans } = trpc.floorPlanIntegration.list.useQuery({});
  const { data: floorPlanData, refetch: refetchFloorPlanData } = trpc.floorPlanIntegration.getWithData.useQuery(
    { id: selectedFloorPlan! },
    { enabled: !!selectedFloorPlan, refetchInterval: 5000 }
  );
  const { data: availableDevices } = trpc.floorPlanIntegration.getAvailableDevices.useQuery(
    { floorPlanId: selectedFloorPlan! },
    { enabled: !!selectedFloorPlan }
  );

  // Mutations
  const createFloorPlan = trpc.floorPlanIntegration.create.useMutation({
    onSuccess: (data) => {
      toast.success("Tạo sơ đồ mặt bằng thành công");
      setShowCreateFloorPlan(false);
      refetchFloorPlans();
      setSelectedFloorPlan(data.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteFloorPlan = trpc.floorPlanIntegration.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa sơ đồ mặt bằng");
      refetchFloorPlans();
      setSelectedFloorPlan(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const createZone = trpc.floorPlanIntegration.createZone.useMutation({
    onSuccess: () => {
      toast.success("Tạo zone thành công");
      setShowCreateZone(false);
      setZonePoints([]);
      refetchFloorPlanData();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteZone = trpc.floorPlanIntegration.deleteZone.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa zone");
      setSelectedZone(null);
      refetchFloorPlanData();
    },
    onError: (err) => toast.error(err.message),
  });

  const placeDevice = trpc.floorPlanIntegration.placeDevice.useMutation({
    onSuccess: () => {
      toast.success("Đã đặt thiết bị");
      setIsPlacingDevice(false);
      setDeviceToPlace(null);
      refetchFloorPlanData();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDevicePosition = trpc.floorPlanIntegration.updateDevicePosition.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật vị trí");
      refetchFloorPlanData();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeDevice = trpc.floorPlanIntegration.removeDevice.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa thiết bị khỏi sơ đồ");
      setSelectedDevice(null);
      refetchFloorPlanData();
    },
    onError: (err) => toast.error(err.message),
  });

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlanData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { imageWidth, imageHeight } = floorPlanData;
    canvas.width = imageWidth;
    canvas.height = imageHeight;

    // Clear canvas
    ctx.clearRect(0, 0, imageWidth, imageHeight);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, imageWidth, imageHeight);

    // Draw floor plan image if exists
    if (floorPlanData.imageUrl) {
      const img = new Image();
      img.src = floorPlanData.imageUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        drawOverlays(ctx);
      };
    } else {
      // Draw grid
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x <= imageWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, imageHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= imageHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(imageWidth, y);
        ctx.stroke();
      }
      drawOverlays(ctx);
    }

    ctx.restore();
  }, [floorPlanData, zoom, pan]);

  const drawOverlays = (ctx: CanvasRenderingContext2D) => {
    if (!floorPlanData) return;

    // Draw zones
    floorPlanData.zones?.forEach((zone) => {
      if (zone.coordinates && zone.coordinates.length > 2) {
        ctx.beginPath();
        ctx.moveTo(zone.coordinates[0].x, zone.coordinates[0].y);
        zone.coordinates.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fillStyle = zone.color || zoneColors[zone.zoneType || "common"];
        ctx.fill();
        ctx.strokeStyle = zone.color?.replace("0.2", "0.8") || "#3b82f6";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw zone label
        const centerX = zone.coordinates.reduce((sum, p) => sum + p.x, 0) / zone.coordinates.length;
        const centerY = zone.coordinates.reduce((sum, p) => sum + p.y, 0) / zone.coordinates.length;
        ctx.fillStyle = "#1f2937";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, centerX, centerY);
      }
    });

    // Draw zone being created
    if (zonePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(zonePoints[0].x, zonePoints[0].y);
      zonePoints.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      zonePoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
      });
    }

    // Draw devices
    floorPlanData.devices?.forEach((device) => {
      const x = device.positionX;
      const y = device.positionY;
      const size = device.iconSize || 40;
      const isSelected = selectedDevice?.id === device.id;

      // Device background
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#3b82f6" : (statusColors[device.status || "offline"] || "#6b7280");
      ctx.fill();

      // Device border
      ctx.strokeStyle = isSelected ? "#1d4ed8" : "#ffffff";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Health indicator
      if (device.healthScore !== undefined && device.healthScore < 80) {
        ctx.beginPath();
        ctx.arc(x + size / 3, y - size / 3, 8, 0, Math.PI * 2);
        ctx.fillStyle = device.healthScore < 50 ? "#ef4444" : "#f59e0b";
        ctx.fill();
      }

      // Device label
      if (device.showLabel !== 0) {
        ctx.fillStyle = "#1f2937";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(device.deviceCode || `#${device.deviceId}`, x, y + size / 2 + 15);
      }
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Select first floor plan on load
  useEffect(() => {
    if (floorPlans && floorPlans.length > 0 && !selectedFloorPlan) {
      setSelectedFloorPlan(floorPlans[0].id);
    }
  }, [floorPlans, selectedFloorPlan]);

  // Canvas event handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    if (isDrawingZone) {
      setZonePoints((prev) => [...prev, { x, y }]);
      return;
    }

    if (isPlacingDevice && deviceToPlace && selectedFloorPlan) {
      placeDevice.mutate({
        deviceId: deviceToPlace,
        floorPlanId: selectedFloorPlan,
        positionX: x,
        positionY: y,
      });
      return;
    }

    // Check if clicked on a device
    const clickedDevice = floorPlanData?.devices?.find((d) => {
      const dx = d.positionX - x;
      const dy = d.positionY - y;
      return Math.sqrt(dx * dx + dy * dy) < (d.iconSize || 40) / 2;
    });

    if (clickedDevice) {
      setSelectedDevice(clickedDevice);
      setSelectedZone(null);
    } else {
      // Check if clicked on a zone
      const clickedZone = floorPlanData?.zones?.find((z) => {
        if (!z.coordinates || z.coordinates.length < 3) return false;
        return isPointInPolygon({ x, y }, z.coordinates);
      });

      if (clickedZone) {
        setSelectedZone(clickedZone);
        setSelectedDevice(null);
      } else {
        setSelectedDevice(null);
        setSelectedZone(null);
      }
    }
  };

  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPlacingDevice && !isDrawingZone) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.5), 3));
  };

  const handleCreateFloorPlan = () => {
    if (!floorPlanForm.name || !floorPlanForm.imageUrl) {
      toast.error("Vui lòng nhập tên và URL hình ảnh");
      return;
    }
    createFloorPlan.mutate({
      ...floorPlanForm,
    });
  };

  const handleFinishZone = () => {
    if (zonePoints.length < 3) {
      toast.error("Zone cần ít nhất 3 điểm");
      return;
    }
    setShowCreateZone(true);
  };

  const handleCreateZone = () => {
    if (!zoneForm.name || !selectedFloorPlan) return;
    createZone.mutate({
      floorPlanId: selectedFloorPlan,
      name: zoneForm.name,
      description: zoneForm.description,
      zoneType: zoneForm.zoneType,
      coordinates: zonePoints,
      color: zoneColors[zoneForm.zoneType],
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Map className="h-5 w-5" />
            Sơ đồ mặt bằng
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="view">Xem</TabsTrigger>
            <TabsTrigger value="edit">Chỉnh sửa</TabsTrigger>
            <TabsTrigger value="devices">Thiết bị</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="flex-1 overflow-auto p-4 space-y-4">
            {/* Floor Plan Selection */}
            <div className="space-y-2">
              <Label>Chọn sơ đồ</Label>
              <Select
                value={selectedFloorPlan?.toString() || ""}
                onValueChange={(v) => setSelectedFloorPlan(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn sơ đồ mặt bằng" />
                </SelectTrigger>
                <SelectContent>
                  {floorPlans?.map((fp) => (
                    <SelectItem key={fp.id} value={fp.id.toString()}>
                      {fp.name} {fp.buildingName && `(${fp.buildingName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Floor Plan Info */}
            {floorPlanData && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-medium">{floorPlanData.name}</h3>
                  {floorPlanData.buildingName && (
                    <p className="text-sm text-muted-foreground">
                      Tòa nhà: {floorPlanData.buildingName}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm">
                    <span>{floorPlanData.zones?.length || 0} zones</span>
                    <span>{floorPlanData.devices?.length || 0} thiết bị</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zone List */}
            {floorPlanData?.zones && floorPlanData.zones.length > 0 && (
              <div className="space-y-2">
                <Label>Zones</Label>
                {floorPlanData.zones.map((zone) => (
                  <Card
                    key={zone.id}
                    className={`cursor-pointer transition-colors ${
                      selectedZone?.id === zone.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedZone(zone)}
                  >
                    <CardContent className="py-2 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: zone.color || zoneColors[zone.zoneType || "common"] }}
                          />
                          <span className="text-sm font-medium">{zone.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {zone.zoneType}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Device Summary */}
            {floorPlanData?.devices && floorPlanData.devices.length > 0 && (
              <div className="space-y-2">
                <Label>Thiết bị ({floorPlanData.devices.length})</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>
                      {floorPlanData.devices.filter((d) => d.status === "active" || d.status === "online").length} Online
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>
                      {floorPlanData.devices.filter((d) => d.status === "warning").length} Warning
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>
                      {floorPlanData.devices.filter((d) => d.status === "error").length} Error
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>
                      {floorPlanData.devices.filter((d) => d.status === "offline").length} Offline
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="edit" className="flex-1 overflow-auto p-4 space-y-4">
            <Button className="w-full" onClick={() => setShowCreateFloorPlan(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo sơ đồ mới
            </Button>

            {selectedFloorPlan && (
              <>
                <div className="space-y-2">
                  <Label>Vẽ Zone</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={isDrawingZone ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setIsDrawingZone(!isDrawingZone);
                        if (isDrawingZone) setZonePoints([]);
                      }}
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      {isDrawingZone ? "Hủy" : "Vẽ Zone"}
                    </Button>
                    {zonePoints.length >= 3 && (
                      <Button size="sm" onClick={handleFinishZone}>
                        Hoàn thành
                      </Button>
                    )}
                  </div>
                  {isDrawingZone && (
                    <p className="text-xs text-muted-foreground">
                      Click để thêm điểm. Cần ít nhất 3 điểm.
                    </p>
                  )}
                </div>

                {selectedZone && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Zone: {selectedZone.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => deleteZone.mutate({ id: selectedZone.id })}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa Zone
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa sơ đồ này?")) {
                      deleteFloorPlan.mutate({ id: selectedFloorPlan });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa sơ đồ
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="devices" className="flex-1 overflow-auto p-4 space-y-4">
            {selectedFloorPlan && (
              <>
                <div className="space-y-2">
                  <Label>Đặt thiết bị lên sơ đồ</Label>
                  <Select
                    value={deviceToPlace?.toString() || ""}
                    onValueChange={(v) => {
                      setDeviceToPlace(parseInt(v));
                      setIsPlacingDevice(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn thiết bị" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDevices?.map((device) => (
                        <SelectItem key={device.id} value={device.id.toString()}>
                          {device.deviceCode} - {device.deviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPlacingDevice && (
                    <div className="flex gap-2">
                      <p className="text-xs text-muted-foreground flex-1">
                        Click vào sơ đồ để đặt thiết bị
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsPlacingDevice(false);
                          setDeviceToPlace(null);
                        }}
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </div>

                {selectedDevice && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {deviceTypeIcons[selectedDevice.deviceType || "sensor"]}
                        {selectedDevice.deviceCode}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 space-y-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground">{selectedDevice.deviceName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            style={{ backgroundColor: statusColors[selectedDevice.status || "offline"] }}
                          >
                            {selectedDevice.status}
                          </Badge>
                          {selectedDevice.healthScore !== undefined && (
                            <span className="text-xs">
                              Health: {selectedDevice.healthScore.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => removeDevice.mutate({ id: selectedDevice.id })}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa khỏi sơ đồ
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Devices on floor plan */}
                <div className="space-y-2">
                  <Label>Thiết bị trên sơ đồ</Label>
                  {floorPlanData?.devices?.map((device) => (
                    <Card
                      key={device.id}
                      className={`cursor-pointer ${selectedDevice?.id === device.id ? "border-primary" : ""}`}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <CardContent className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {deviceTypeIcons[device.deviceType || "sensor"]}
                            <span className="text-sm">{device.deviceCode}</span>
                          </div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusColors[device.status || "offline"] }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground mx-2">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchFloorPlanData()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-muted cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {selectedFloorPlan && floorPlanData ? (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-crosshair"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chọn hoặc tạo sơ đồ mặt bằng để bắt đầu</p>
                <Button className="mt-4" onClick={() => setShowCreateFloorPlan(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo sơ đồ mới
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Floor Plan Dialog */}
      <Dialog open={showCreateFloorPlan} onOpenChange={setShowCreateFloorPlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo sơ đồ mặt bằng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên sơ đồ *</Label>
              <Input
                value={floorPlanForm.name}
                onChange={(e) => setFloorPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="VD: Xưởng sản xuất A"
              />
            </div>
            <div className="space-y-2">
              <Label>Tòa nhà</Label>
              <Input
                value={floorPlanForm.buildingName}
                onChange={(e) => setFloorPlanForm((prev) => ({ ...prev, buildingName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tầng</Label>
              <Input
                type="number"
                value={floorPlanForm.floorNumber}
                onChange={(e) =>
                  setFloorPlanForm((prev) => ({ ...prev, floorNumber: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>URL hình ảnh *</Label>
              <Input
                value={floorPlanForm.imageUrl}
                onChange={(e) => setFloorPlanForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chiều rộng (px)</Label>
                <Input
                  type="number"
                  value={floorPlanForm.imageWidth}
                  onChange={(e) =>
                    setFloorPlanForm((prev) => ({ ...prev, imageWidth: parseInt(e.target.value) || 1000 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Chiều cao (px)</Label>
                <Input
                  type="number"
                  value={floorPlanForm.imageHeight}
                  onChange={(e) =>
                    setFloorPlanForm((prev) => ({ ...prev, imageHeight: parseInt(e.target.value) || 600 }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={floorPlanForm.description}
                onChange={(e) => setFloorPlanForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFloorPlan(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateFloorPlan} disabled={createFloorPlan.isPending}>
              {createFloorPlan.isPending ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Zone Dialog */}
      <Dialog open={showCreateZone} onOpenChange={setShowCreateZone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên Zone *</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="VD: Khu vực sản xuất 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Loại Zone</Label>
              <Select
                value={zoneForm.zoneType}
                onValueChange={(v: any) => setZoneForm((prev) => ({ ...prev, zoneType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Sản xuất</SelectItem>
                  <SelectItem value="warehouse">Kho</SelectItem>
                  <SelectItem value="office">Văn phòng</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="restricted">Hạn chế</SelectItem>
                  <SelectItem value="common">Chung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={zoneForm.description}
                onChange={(e) => setZoneForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateZone(false);
                setZonePoints([]);
                setIsDrawingZone(false);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleCreateZone} disabled={createZone.isPending}>
              {createZone.isPending ? "Đang tạo..." : "Tạo Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
