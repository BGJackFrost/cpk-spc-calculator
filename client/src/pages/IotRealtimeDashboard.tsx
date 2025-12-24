import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
  Eye,
  Play,
  Pause,
  Link,
  Unlink,
  Server,
  Radio
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { trpc } from '@/lib/trpc';

// Types for IoT devices
interface IotDevice {
  id: string;
  name: string;
  type: 'mqtt' | 'opcua' | 'modbus' | 'http';
  protocol: string;
  status: 'connected' | 'disconnected' | 'error';
  host: string;
  port: number;
  topic?: string;
  nodeId?: string;
  lastSeen?: Date;
  latestValue?: number;
  unit?: string;
  machineId?: number;
}

interface TelemetryData {
  timestamp: Date;
  value: number;
  deviceId: string;
}

interface ConnectionConfig {
  mqtt: {
    broker: string;
    port: number;
    username?: string;
    password?: string;
    clientId: string;
    useTls: boolean;
  };
  opcua: {
    endpoint: string;
    securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
    securityPolicy: string;
    username?: string;
    password?: string;
  };
}

export default function IotRealtimeDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<'mqtt' | 'opcua'>('mqtt');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Connection status from API
  const [mqttConnected, setMqttConnected] = useState(false);
  const [opcuaConnected, setOpcuaConnected] = useState(false);

  // tRPC queries and mutations for IoT connections
  const { data: connections, refetch: refetchConnections } = trpc.iotDashboard.listConnections.useQuery();
  const { data: connectionStats } = trpc.iotDashboard.getConnectionStats.useQuery();
  
  const createConnectionMutation = trpc.iotDashboard.createConnection.useMutation({
    onSuccess: () => {
      refetchConnections();
      toast.success('Tạo kết nối thành công!');
    },
    onError: (error) => toast.error(error.message),
  });

  const connectMutation = trpc.iotDashboard.connect.useMutation({
    onSuccess: () => {
      refetchConnections();
      toast.success('Kết nối thành công!');
    },
    onError: (error) => toast.error(error.message),
  });

  const disconnectMutation = trpc.iotDashboard.disconnect.useMutation({
    onSuccess: () => {
      refetchConnections();
      toast.info('Đã ngắt kết nối');
    },
    onError: (error) => toast.error(error.message),
  });

  const testConnectionMutation = trpc.iotDashboard.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Kết nối thành công! Latency: ${data.latency}ms`);
      } else {
        toast.error(data.error || 'Kết nối thất bại');
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const startSimulationMutation = trpc.iotDashboard.startSimulation.useMutation({
    onSuccess: () => toast.success('Đã bắt đầu mô phỏng dữ liệu'),
    onError: (error) => toast.error(error.message),
  });

  const deleteConnectionMutation = trpc.iotDashboard.deleteConnection.useMutation({
    onSuccess: () => {
      refetchConnections();
      toast.success('Đã xóa kết nối');
    },
    onError: (error) => toast.error(error.message),
  });
  
  // Form states
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'mqtt' as 'mqtt' | 'opcua',
    host: '',
    port: 1883,
    topic: '',
    nodeId: '',
    machineId: ''
  });
  
  const [mqttConfig, setMqttConfig] = useState<ConnectionConfig['mqtt']>({
    broker: 'localhost',
    port: 1883,
    username: '',
    password: '',
    clientId: `cpk-spc-${Date.now()}`,
    useTls: false
  });
  
  const [opcuaConfig, setOpcuaConfig] = useState<ConnectionConfig['opcua']>({
    endpoint: 'opc.tcp://localhost:4840',
    securityMode: 'None',
    securityPolicy: 'None',
    username: '',
    password: ''
  });
  
  // Mock devices data
  const [devices, setDevices] = useState<IotDevice[]>([
    {
      id: 'dev_001',
      name: 'Temperature Sensor Line 1',
      type: 'mqtt',
      protocol: 'MQTT',
      status: 'connected',
      host: 'mqtt.example.com',
      port: 1883,
      topic: 'factory/line1/temp',
      lastSeen: new Date(),
      latestValue: 25.4,
      unit: '°C',
      machineId: 1
    },
    {
      id: 'dev_002',
      name: 'Pressure Sensor CNC-01',
      type: 'opcua',
      protocol: 'OPC-UA',
      status: 'connected',
      host: 'opc.tcp://192.168.1.100:4840',
      port: 4840,
      nodeId: 'ns=2;s=Pressure.Value',
      lastSeen: new Date(),
      latestValue: 1013.25,
      unit: 'hPa',
      machineId: 2
    },
    {
      id: 'dev_003',
      name: 'Vibration Monitor Assembly',
      type: 'mqtt',
      protocol: 'MQTT',
      status: 'disconnected',
      host: 'mqtt.example.com',
      port: 1883,
      topic: 'factory/assembly/vibration',
      lastSeen: new Date(Date.now() - 3600000),
      latestValue: 2.8,
      unit: 'mm/s',
      machineId: 3
    },
    {
      id: 'dev_004',
      name: 'Power Meter Main Panel',
      type: 'opcua',
      protocol: 'OPC-UA',
      status: 'error',
      host: 'opc.tcp://192.168.1.101:4840',
      port: 4840,
      nodeId: 'ns=2;s=Power.ActivePower',
      lastSeen: new Date(Date.now() - 7200000),
      latestValue: 0,
      unit: 'kW',
      machineId: 4
    },
  ]);
  
  // Mock telemetry data for charts
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>(() => {
    const data: TelemetryData[] = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      data.push({
        timestamp: new Date(now - i * 60000),
        value: 25 + Math.random() * 5,
        deviceId: 'dev_001'
      });
    }
    return data;
  });
  
  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          timestamp: new Date(),
          value: 25 + Math.random() * 5,
          deviceId: 'dev_001'
        });
        return newData;
      });
      
      // Update device values
      setDevices(prev => prev.map(device => {
        if (device.status === 'connected') {
          return {
            ...device,
            latestValue: device.latestValue! + (Math.random() - 0.5) * 0.5,
            lastSeen: new Date()
          };
        }
        return device;
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Stats
  const stats = {
    totalDevices: devices.length,
    connectedDevices: devices.filter(d => d.status === 'connected').length,
    disconnectedDevices: devices.filter(d => d.status === 'disconnected').length,
    errorDevices: devices.filter(d => d.status === 'error').length,
    dataPointsToday: 45230,
    alertsToday: devices.filter(d => d.status === 'error').length,
  };
  
  const handleConnectMqtt = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Create and connect MQTT connection via API
      const connection = await createConnectionMutation.mutateAsync({
        name: `MQTT-${mqttConfig.broker}`,
        protocol: 'mqtt',
        config: {
          host: mqttConfig.broker,
          port: mqttConfig.port,
          username: mqttConfig.username || undefined,
          password: mqttConfig.password || undefined,
          clientId: mqttConfig.clientId,
          useTls: mqttConfig.useTls,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: '#', qos: 0 }],
        },
      });
      await connectMutation.mutateAsync({ id: connection.id });
      setMqttConnected(true);
    } catch (error) {
      toast.error('Không thể kết nối MQTT Broker');
    } finally {
      setIsConnecting(false);
    }
  }, [mqttConfig, createConnectionMutation, connectMutation]);
  
  const handleConnectOpcua = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Create and connect OPC-UA connection via API
      const connection = await createConnectionMutation.mutateAsync({
        name: `OPCUA-${opcuaConfig.endpoint}`,
        protocol: 'opcua',
        config: {
          endpointUrl: opcuaConfig.endpoint,
          securityMode: opcuaConfig.securityMode,
          securityPolicy: opcuaConfig.securityPolicy,
          username: opcuaConfig.username || undefined,
          password: opcuaConfig.password || undefined,
          applicationName: 'CPK-SPC-Calculator',
          nodeIds: [],
          samplingInterval: 1000,
          publishingInterval: 1000,
        },
      });
      await connectMutation.mutateAsync({ id: connection.id });
      setOpcuaConnected(true);
    } catch (error) {
      toast.error('Không thể kết nối OPC-UA Server');
    } finally {
      setIsConnecting(false);
    }
  }, [opcuaConfig, createConnectionMutation, connectMutation]);
  
  const handleDisconnect = (type: 'mqtt' | 'opcua') => {
    // Find and disconnect the connection
    const conn = connections?.find(c => 
      c.config.protocol === type && c.status === 'connected'
    );
    if (conn) {
      disconnectMutation.mutate({ id: conn.id });
    }
    if (type === 'mqtt') {
      setMqttConnected(false);
    } else {
      setOpcuaConnected(false);
    }
  };

  const handleTestConnection = (protocol: 'mqtt' | 'opcua') => {
    if (protocol === 'mqtt') {
      testConnectionMutation.mutate({
        protocol: 'mqtt',
        config: {
          host: mqttConfig.broker,
          port: mqttConfig.port,
          username: mqttConfig.username || undefined,
          password: mqttConfig.password || undefined,
          clientId: mqttConfig.clientId,
          useTls: mqttConfig.useTls,
          cleanSession: true,
          keepAlive: 60,
          reconnectPeriod: 5000,
          topics: [{ topic: '#', qos: 0 }],
        },
      });
    } else {
      testConnectionMutation.mutate({
        protocol: 'opcua',
        config: {
          endpointUrl: opcuaConfig.endpoint,
          securityMode: opcuaConfig.securityMode,
          securityPolicy: opcuaConfig.securityPolicy,
          username: opcuaConfig.username || undefined,
          password: opcuaConfig.password || undefined,
          applicationName: 'CPK-SPC-Calculator',
          nodeIds: [],
          samplingInterval: 1000,
          publishingInterval: 1000,
        },
      });
    }
  };
  
  const handleAddDevice = () => {
    const device: IotDevice = {
      id: `dev_${Date.now()}`,
      name: newDevice.name,
      type: newDevice.type,
      protocol: newDevice.type === 'mqtt' ? 'MQTT' : 'OPC-UA',
      status: 'disconnected',
      host: newDevice.host,
      port: newDevice.port,
      topic: newDevice.topic || undefined,
      nodeId: newDevice.nodeId || undefined,
      machineId: newDevice.machineId ? parseInt(newDevice.machineId) : undefined,
      latestValue: 0,
      unit: ''
    };
    
    setDevices(prev => [...prev, device]);
    setIsAddingDevice(false);
    setNewDevice({
      name: '',
      type: 'mqtt',
      host: '',
      port: 1883,
      topic: '',
      nodeId: '',
      machineId: ''
    });
    toast.success('Đã thêm thiết bị mới');
  };
  
  const handleDeleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    toast.success('Đã xóa thiết bị');
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">Kết nối</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Ngắt kết nối</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge variant="secondary">Không xác định</Badge>;
    }
  };
  
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mqtt':
        return <Radio className="h-5 w-5" />;
      case 'opcua':
        return <Server className="h-5 w-5" />;
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
            <h1 className="text-2xl font-bold">IoT Realtime Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Giám sát và quản lý thiết bị IoT kết nối qua MQTT/OPC-UA
              </p>
              {/* Connection Status Indicators */}
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${mqttConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">MQTT</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${opcuaConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">OPC-UA</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Cấu hình kết nối
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cấu hình kết nối IoT</DialogTitle>
                  <DialogDescription>
                    Cấu hình kết nối MQTT Broker hoặc OPC-UA Server
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={selectedProtocol} onValueChange={(v) => setSelectedProtocol(v as 'mqtt' | 'opcua')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mqtt">MQTT</TabsTrigger>
                    <TabsTrigger value="opcua">OPC-UA</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mqtt" className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="mqttBroker">Broker Address</Label>
                          <Input 
                            id="mqttBroker" 
                            value={mqttConfig.broker}
                            onChange={(e) => setMqttConfig({...mqttConfig, broker: e.target.value})}
                            placeholder="mqtt.example.com" 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mqttPort">Port</Label>
                          <Input 
                            id="mqttPort" 
                            type="number"
                            value={mqttConfig.port}
                            onChange={(e) => setMqttConfig({...mqttConfig, port: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="mqttUser">Username (tùy chọn)</Label>
                          <Input 
                            id="mqttUser" 
                            value={mqttConfig.username}
                            onChange={(e) => setMqttConfig({...mqttConfig, username: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="mqttPass">Password (tùy chọn)</Label>
                          <Input 
                            id="mqttPass" 
                            type="password"
                            value={mqttConfig.password}
                            onChange={(e) => setMqttConfig({...mqttConfig, password: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="mqttClientId">Client ID</Label>
                        <Input 
                          id="mqttClientId" 
                          value={mqttConfig.clientId}
                          onChange={(e) => setMqttConfig({...mqttConfig, clientId: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="mqttTls" 
                          checked={mqttConfig.useTls}
                          onCheckedChange={(checked) => setMqttConfig({...mqttConfig, useTls: checked})}
                        />
                        <Label htmlFor="mqttTls">Sử dụng TLS/SSL</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestConnection('mqtt')}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="mr-2 h-4 w-4" />
                        )}
                        Test kết nối
                      </Button>
                      {mqttConnected ? (
                        <Button variant="destructive" onClick={() => handleDisconnect('mqtt')}>
                          <Unlink className="mr-2 h-4 w-4" />
                          Ngắt kết nối
                        </Button>
                      ) : (
                        <Button onClick={handleConnectMqtt} disabled={isConnecting}>
                          {isConnecting ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Link className="mr-2 h-4 w-4" />
                          )}
                          Kết nối MQTT
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="opcua" className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="opcuaEndpoint">Endpoint URL</Label>
                        <Input 
                          id="opcuaEndpoint" 
                          value={opcuaConfig.endpoint}
                          onChange={(e) => setOpcuaConfig({...opcuaConfig, endpoint: e.target.value})}
                          placeholder="opc.tcp://localhost:4840" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="opcuaSecurity">Security Mode</Label>
                          <Select 
                            value={opcuaConfig.securityMode}
                            onValueChange={(v) => setOpcuaConfig({...opcuaConfig, securityMode: v as 'None' | 'Sign' | 'SignAndEncrypt'})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              <SelectItem value="Sign">Sign</SelectItem>
                              <SelectItem value="SignAndEncrypt">Sign and Encrypt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="opcuaPolicy">Security Policy</Label>
                          <Select 
                            value={opcuaConfig.securityPolicy}
                            onValueChange={(v) => setOpcuaConfig({...opcuaConfig, securityPolicy: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              <SelectItem value="Basic128Rsa15">Basic128Rsa15</SelectItem>
                              <SelectItem value="Basic256">Basic256</SelectItem>
                              <SelectItem value="Basic256Sha256">Basic256Sha256</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="opcuaUser">Username (tùy chọn)</Label>
                          <Input 
                            id="opcuaUser" 
                            value={opcuaConfig.username}
                            onChange={(e) => setOpcuaConfig({...opcuaConfig, username: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="opcuaPass">Password (tùy chọn)</Label>
                          <Input 
                            id="opcuaPass" 
                            type="password"
                            value={opcuaConfig.password}
                            onChange={(e) => setOpcuaConfig({...opcuaConfig, password: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestConnection('opcua')}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="mr-2 h-4 w-4" />
                        )}
                        Test kết nối
                      </Button>
                      {opcuaConnected ? (
                        <Button variant="destructive" onClick={() => handleDisconnect('opcua')}>
                          <Unlink className="mr-2 h-4 w-4" />
                          Ngắt kết nối
                        </Button>
                      ) : (
                        <Button onClick={handleConnectOpcua} disabled={isConnecting}>
                          {isConnecting ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Link className="mr-2 h-4 w-4" />
                          )}
                          Kết nối OPC-UA
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddingDevice} onOpenChange={setIsAddingDevice}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm thiết bị
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Đăng ký thiết bị mới</DialogTitle>
                  <DialogDescription>
                    Thêm thiết bị IoT vào hệ thống giám sát
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deviceName">Tên thiết bị</Label>
                    <Input 
                      id="deviceName" 
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                      placeholder="Temperature Sensor A1" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="deviceType">Loại kết nối</Label>
                    <Select 
                      value={newDevice.type}
                      onValueChange={(v) => setNewDevice({...newDevice, type: v as 'mqtt' | 'opcua'})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mqtt">MQTT</SelectItem>
                        <SelectItem value="opcua">OPC-UA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newDevice.type === 'mqtt' && (
                    <div className="grid gap-2">
                      <Label htmlFor="topic">MQTT Topic</Label>
                      <Input 
                        id="topic" 
                        value={newDevice.topic}
                        onChange={(e) => setNewDevice({...newDevice, topic: e.target.value})}
                        placeholder="factory/line1/sensor1" 
                      />
                    </div>
                  )}
                  
                  {newDevice.type === 'opcua' && (
                    <div className="grid gap-2">
                      <Label htmlFor="nodeId">Node ID</Label>
                      <Input 
                        id="nodeId" 
                        value={newDevice.nodeId}
                        onChange={(e) => setNewDevice({...newDevice, nodeId: e.target.value})}
                        placeholder="ns=2;s=Temperature.Value" 
                      />
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="machineId">Liên kết với máy (ID)</Label>
                    <Input 
                      id="machineId" 
                      value={newDevice.machineId}
                      onChange={(e) => setNewDevice({...newDevice, machineId: e.target.value})}
                      placeholder="ID máy trong hệ thống" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingDevice(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleAddDevice} disabled={!newDevice.name}>
                    Thêm thiết bị
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
              <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.connectedDevices} đang kết nối
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang kết nối</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.connectedDevices}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.connectedDevices / stats.totalDevices) * 100)}% availability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Points hôm nay</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dataPointsToday.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ~{Math.round(stats.dataPointsToday / 24 / 60)} mỗi phút
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cảnh báo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.alertsToday}</div>
              <p className="text-xs text-muted-foreground">
                {stats.errorDevices} thiết bị lỗi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="devices">Thiết bị</TabsTrigger>
            <TabsTrigger value="realtime">Dữ liệu Realtime</TabsTrigger>
            <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Realtime Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ Realtime</CardTitle>
                <CardDescription>Dữ liệu nhiệt độ từ Temperature Sensor Line 1</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={telemetryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [value.toFixed(2) + '°C', 'Nhiệt độ']}
                      />
                      <ReferenceLine y={30} stroke="red" strokeDasharray="3 3" label="UCL" />
                      <ReferenceLine y={20} stroke="red" strokeDasharray="3 3" label="LCL" />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Connection Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    MQTT Broker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trạng thái</span>
                      {mqttConnected ? (
                        <Badge className="bg-green-500">Đã kết nối</Badge>
                      ) : (
                        <Badge variant="secondary">Chưa kết nối</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Broker</span>
                      <span className="font-mono text-sm">{mqttConfig.broker}:{mqttConfig.port}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thiết bị MQTT</span>
                      <span>{devices.filter(d => d.type === 'mqtt').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    OPC-UA Server
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trạng thái</span>
                      {opcuaConnected ? (
                        <Badge className="bg-green-500">Đã kết nối</Badge>
                      ) : (
                        <Badge variant="secondary">Chưa kết nối</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Endpoint</span>
                      <span className="font-mono text-sm truncate max-w-[200px]">{opcuaConfig.endpoint}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thiết bị OPC-UA</span>
                      <span>{devices.filter(d => d.type === 'opcua').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                          {device.protocol} • {device.type === 'mqtt' ? device.topic : device.nodeId}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Lần cuối</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Giá trị hiện tại</span>
                        <span className="font-mono">
                          {device.latestValue?.toFixed(2)} {device.unit}
                        </span>
                      </div>
                      {device.machineId && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Máy liên kết</span>
                          <span>ID: {device.machineId}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="mr-1 h-3 w-3" />
                          Chi tiết
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteDevice(device.id)}
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

          <TabsContent value="realtime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dữ liệu Realtime</CardTitle>
                <CardDescription>Dữ liệu trực tiếp từ các thiết bị đang kết nối</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devices
                    .filter((d) => d.status === 'connected')
                    .map((device) => (
                      <div key={device.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(device.type)}
                            <span className="font-medium">{device.name}</span>
                          </div>
                          <Badge className="bg-green-500">Live</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-muted p-2 rounded">
                            <div className="text-xs text-muted-foreground">Giá trị</div>
                            <div className="text-lg font-mono">
                              {device.latestValue?.toFixed(2)} {device.unit}
                            </div>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="text-xs text-muted-foreground">Protocol</div>
                            <div className="text-lg font-mono">{device.protocol}</div>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="text-xs text-muted-foreground">Cập nhật</div>
                            <div className="text-lg font-mono">
                              {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {devices.filter(d => d.status === 'connected').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Không có thiết bị nào đang kết nối
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo thiết bị</CardTitle>
                <CardDescription>Các cảnh báo và lỗi từ thiết bị IoT</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {devices
                    .filter(d => d.status === 'error' || d.status === 'disconnected')
                    .map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {device.status === 'error' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-gray-500" />
                          )}
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {device.status === 'error' ? 'Lỗi kết nối' : 'Mất kết nối'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Lần cuối: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(device.status)}
                          <Button size="sm" variant="outline">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Thử lại
                          </Button>
                        </div>
                      </div>
                    ))}
                  {devices.filter(d => d.status === 'error' || d.status === 'disconnected').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      Không có cảnh báo nào
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
