import { useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { useIotDeviceData, useRealtimeData } from '@/hooks/useRealtimeData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Cpu, 
  Wifi, 
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Thermometer,
  Gauge,
  Zap,
  Clock,
  Settings,
  Trash2,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function IoTDashboard() {
  const [activeTab, setActiveTab] = useState('devices');
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Real-time IoT device data subscription
  const { devices: realtimeDevices, isConnected, error: sseError } = useIotDeviceData();
  
  // Real-time data for IoT channels
  const { messages: iotMessages, lastMessage } = useRealtimeData({
    channels: ['iot:devices', 'iot:telemetry', 'iot:alerts'],
    onMessage: (event) => {
      console.log('[IoT] Realtime event:', event.type, event.data);
    }
  });

  // Mock IoT data
  const iotStats = {
    totalDevices: 12,
    onlineDevices: 9,
    offlineDevices: 2,
    warningDevices: 1,
    dataPointsToday: 45230,
    alertsToday: 3,
  };

  const devices = [
    {
      id: 'dev_001',
      name: 'Temperature Sensor A1',
      type: 'temperature',
      protocol: 'mqtt',
      status: 'online',
      lastSeen: '2 min ago',
      latestValue: { temperature: 25.4 },
    },
    {
      id: 'dev_002',
      name: 'Pressure Sensor B2',
      type: 'pressure',
      protocol: 'http',
      status: 'online',
      lastSeen: '1 min ago',
      latestValue: { pressure: 1013.25 },
    },
    {
      id: 'dev_003',
      name: 'Vibration Monitor C3',
      type: 'vibration',
      protocol: 'mqtt',
      status: 'warning',
      lastSeen: '5 min ago',
      latestValue: { vibration: 2.8 },
    },
    {
      id: 'dev_004',
      name: 'Power Meter D4',
      type: 'power',
      protocol: 'coap',
      status: 'offline',
      lastSeen: '2 hours ago',
      latestValue: { power: 0 },
    },
  ];

  const alerts = [
    {
      id: 'alert_001',
      deviceId: 'dev_003',
      deviceName: 'Vibration Monitor C3',
      type: 'threshold_exceeded',
      severity: 'warning',
      message: 'Vibration level above threshold (2.8 > 2.5)',
      timestamp: '10 min ago',
      acknowledged: false,
    },
    {
      id: 'alert_002',
      deviceId: 'dev_004',
      deviceName: 'Power Meter D4',
      type: 'offline',
      severity: 'critical',
      message: 'Device went offline',
      timestamp: '2 hours ago',
      acknowledged: true,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'temperature':
        return <Thermometer className="h-5 w-5" />;
      case 'pressure':
        return <Gauge className="h-5 w-5" />;
      case 'power':
        return <Zap className="h-5 w-5" />;
      default:
        return <Cpu className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Device Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Monitor and manage connected IoT devices
              </p>
              {/* Realtime Connection Indicator */}
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {realtimeDevices.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {realtimeDevices.length} active streams
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={isAddingDevice} onOpenChange={setIsAddingDevice}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New Device</DialogTitle>
                  <DialogDescription>
                    Add a new IoT device to the monitoring system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deviceName">Device Name</Label>
                    <Input id="deviceName" placeholder="Temperature Sensor A1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="deviceType">Device Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temperature">Temperature Sensor</SelectItem>
                        <SelectItem value="pressure">Pressure Sensor</SelectItem>
                        <SelectItem value="vibration">Vibration Monitor</SelectItem>
                        <SelectItem value="power">Power Meter</SelectItem>
                        <SelectItem value="humidity">Humidity Sensor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mqtt">MQTT</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="coap">CoAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingDevice(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsAddingDevice(false)}>
                    Register Device
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{iotStats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {iotStats.onlineDevices} online, {iotStats.offlineDevices} offline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{iotStats.onlineDevices}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((iotStats.onlineDevices / iotStats.totalDevices) * 100)}% availability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Points Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{iotStats.dataPointsToday.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ~{Math.round(iotStats.dataPointsToday / 24 / 60)} per minute
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{iotStats.alertsToday}</div>
              <p className="text-xs text-muted-foreground">
                {alerts.filter(a => !a.acknowledged).length} unacknowledged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="data">Live Data</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <Card key={device.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.type)}
                      <div>
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {device.protocol.toUpperCase()} • {device.type}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last seen</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {device.lastSeen}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Latest value</span>
                        <span className="font-mono">
                          {Object.entries(device.latestValue).map(([key, value]) => (
                            <span key={key}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
                          ))}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedDevice(device);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDevice(device);
                            setIsSettingsDialogOpen(true);
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDevice(device);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Alerts</CardTitle>
                <CardDescription>Recent alerts from IoT devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        alert.acknowledged ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {alert.severity === 'critical' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{alert.deviceName}</div>
                          <div className="text-sm text-muted-foreground">{alert.message}</div>
                          <div className="text-xs text-muted-foreground">{alert.timestamp}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.acknowledged ? (
                          <Badge variant="secondary">Acknowledged</Badge>
                        ) : (
                          <Button size="sm">Acknowledge</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Data Stream</CardTitle>
                <CardDescription>Real-time data from connected devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devices
                    .filter((d) => d.status === 'online')
                    .map((device) => (
                      <div key={device.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(device.type)}
                            <span className="font-medium">{device.name}</span>
                          </div>
                          <Badge className="bg-green-500">Live</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(device.latestValue).map(([key, value]) => (
                            <div key={key} className="bg-muted p-2 rounded">
                              <div className="text-xs text-muted-foreground capitalize">{key}</div>
                              <div className="text-lg font-mono">
                                {typeof value === 'number' ? value.toFixed(2) : value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Device Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi tiết thiết bị: {selectedDevice?.name}</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết và dữ liệu realtime của thiết bị
              </DialogDescription>
            </DialogHeader>
            {selectedDevice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Device ID</Label>
                    <div className="font-mono text-sm bg-muted p-2 rounded">{selectedDevice.id}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Trạng thái</Label>
                    <div>{getStatusBadge(selectedDevice.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Loại thiết bị</Label>
                    <div className="capitalize">{selectedDevice.type}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Giao thức</Label>
                    <div className="uppercase">{selectedDevice.protocol}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Lần cuối online</Label>
                    <div>{selectedDevice.lastSeen}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Giá trị mới nhất</Label>
                    <div className="font-mono">
                      {Object.entries(selectedDevice.latestValue).map(([key, value]) => (
                        <span key={key}>{key}: {typeof value === 'number' ? (value as number).toFixed(2) : String(value)}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Đóng</Button>
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    setLocation('/iot-realtime-monitoring');
                  }}>
                    Xem Realtime Data
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Settings Device Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cài đặt thiết bị: {selectedDevice?.name}</DialogTitle>
              <DialogDescription>
                Cấu hình thông số và ngưỡng cảnh báo
              </DialogDescription>
            </DialogHeader>
            {selectedDevice && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tên thiết bị</Label>
                  <Input defaultValue={selectedDevice.name} />
                </div>
                <div className="space-y-2">
                  <Label>Ngưỡng cảnh báo cao</Label>
                  <Input type="number" placeholder="VD: 30" />
                </div>
                <div className="space-y-2">
                  <Label>Ngưỡng cảnh báo thấp</Label>
                  <Input type="number" placeholder="VD: 10" />
                </div>
                <div className="space-y-2">
                  <Label>Tần suất lấy dữ liệu (giây)</Label>
                  <Select defaultValue="60">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 giây</SelectItem>
                      <SelectItem value="30">30 giây</SelectItem>
                      <SelectItem value="60">1 phút</SelectItem>
                      <SelectItem value="300">5 phút</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Hủy</Button>
              <Button onClick={() => {
                toast.success('Đã lưu cài đặt thiết bị');
                setIsSettingsDialogOpen(false);
              }}>Lưu cài đặt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Device Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa thiết bị</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa thiết bị "{selectedDevice?.name}"? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Hủy</Button>
              <Button variant="destructive" onClick={() => {
                toast.success(`Đã xóa thiết bị ${selectedDevice?.name}`);
                setIsDeleteDialogOpen(false);
              }}>Xóa thiết bị</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
