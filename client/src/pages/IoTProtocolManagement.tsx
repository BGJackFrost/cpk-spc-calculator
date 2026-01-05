import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Wifi,
  WifiOff,
  Network,
  Radio,
  Server,
  Plus,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Activity,
  Zap,
  Cable,
  Router,
} from 'lucide-react';

// ============ MQTT Tab ============
function MQTTTab() {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [mqttConfig, setMqttConfig] = useState({
    deviceId: 0,
    host: '',
    port: 1883,
    clientId: '',
    username: '',
    password: '',
    useTls: false,
  });
  
  const { data: connections } = trpc.iotProtocol.getAllConnectionStatuses.useQuery();
  const mqttConnections = connections?.filter(c => c.protocol === 'mqtt') || [];
  
  const connectMutation = trpc.iotProtocol.connectMQTT.useMutation({
    onSuccess: () => {
      toast.success('MQTT connected successfully');
      setIsConnectOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const disconnectMutation = trpc.iotProtocol.disconnectMQTT.useMutation({
    onSuccess: () => toast.success('MQTT disconnected'),
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">MQTT Connections</h3>
          <p className="text-sm text-muted-foreground">Manage MQTT broker connections</p>
        </div>
        <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect MQTT Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <Input 
                  type="number"
                  value={mqttConfig.deviceId}
                  onChange={(e) => setMqttConfig({ ...mqttConfig, deviceId: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Host</Label>
                  <Input 
                    value={mqttConfig.host}
                    onChange={(e) => setMqttConfig({ ...mqttConfig, host: e.target.value })}
                    placeholder="broker.example.com"
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input 
                    type="number"
                    value={mqttConfig.port}
                    onChange={(e) => setMqttConfig({ ...mqttConfig, port: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Client ID</Label>
                <Input 
                  value={mqttConfig.clientId}
                  onChange={(e) => setMqttConfig({ ...mqttConfig, clientId: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input 
                    value={mqttConfig.username}
                    onChange={(e) => setMqttConfig({ ...mqttConfig, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password"
                    value={mqttConfig.password}
                    onChange={(e) => setMqttConfig({ ...mqttConfig, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={mqttConfig.useTls}
                  onCheckedChange={(v) => setMqttConfig({ ...mqttConfig, useTls: v })}
                />
                <Label>Use TLS</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConnectOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => connectMutation.mutate(mqttConfig)}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Messages Received</TableHead>
              <TableHead>Messages Sent</TableHead>
              <TableHead>Last Connected</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mqttConnections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No MQTT connections
                </TableCell>
              </TableRow>
            ) : (
              mqttConnections.map((conn) => (
                <TableRow key={conn.deviceId}>
                  <TableCell>Device #{conn.deviceId}</TableCell>
                  <TableCell>
                    <Badge variant={conn.isConnected ? 'default' : 'secondary'}>
                      {conn.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </TableCell>
                  <TableCell>{conn.messagesReceived}</TableCell>
                  <TableCell>{conn.messagesSent}</TableCell>
                  <TableCell>
                    {conn.lastConnectedAt 
                      ? new Date(conn.lastConnectedAt).toLocaleString('vi-VN')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {conn.isConnected ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => disconnectMutation.mutate({ deviceId: conn.deviceId })}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Reconnect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ OPC-UA Tab ============
function OPCUATab() {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [opcuaConfig, setOpcuaConfig] = useState({
    deviceId: 0,
    endpointUrl: '',
    securityMode: 'None' as const,
    username: '',
    password: '',
  });
  
  const { data: connections } = trpc.iotProtocol.getAllConnectionStatuses.useQuery();
  const opcuaConnections = connections?.filter(c => c.protocol === 'opc_ua') || [];
  
  const connectMutation = trpc.iotProtocol.connectOPCUA.useMutation({
    onSuccess: () => {
      toast.success('OPC-UA connected successfully');
      setIsConnectOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">OPC-UA Connections</h3>
          <p className="text-sm text-muted-foreground">Manage OPC-UA server connections</p>
        </div>
        <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect OPC-UA Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <Input 
                  type="number"
                  value={opcuaConfig.deviceId}
                  onChange={(e) => setOpcuaConfig({ ...opcuaConfig, deviceId: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Endpoint URL</Label>
                <Input 
                  value={opcuaConfig.endpointUrl}
                  onChange={(e) => setOpcuaConfig({ ...opcuaConfig, endpointUrl: e.target.value })}
                  placeholder="opc.tcp://server:4840"
                />
              </div>
              <div>
                <Label>Security Mode</Label>
                <Select 
                  value={opcuaConfig.securityMode}
                  onValueChange={(v: any) => setOpcuaConfig({ ...opcuaConfig, securityMode: v })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input 
                    value={opcuaConfig.username}
                    onChange={(e) => setOpcuaConfig({ ...opcuaConfig, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password"
                    value={opcuaConfig.password}
                    onChange={(e) => setOpcuaConfig({ ...opcuaConfig, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConnectOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => connectMutation.mutate(opcuaConfig)}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nodes Read</TableHead>
              <TableHead>Nodes Written</TableHead>
              <TableHead>Last Connected</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opcuaConnections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No OPC-UA connections
                </TableCell>
              </TableRow>
            ) : (
              opcuaConnections.map((conn) => (
                <TableRow key={conn.deviceId}>
                  <TableCell>Device #{conn.deviceId}</TableCell>
                  <TableCell>
                    <Badge variant={conn.isConnected ? 'default' : 'secondary'}>
                      {conn.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </TableCell>
                  <TableCell>{conn.messagesReceived}</TableCell>
                  <TableCell>{conn.messagesSent}</TableCell>
                  <TableCell>
                    {conn.lastConnectedAt 
                      ? new Date(conn.lastConnectedAt).toLocaleString('vi-VN')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ Modbus Tab ============
function ModbusTab() {
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [modbusConfig, setModbusConfig] = useState({
    deviceId: 0,
    host: '',
    port: 502,
    protocol: 'modbus_tcp' as const,
    unitId: 1,
  });
  
  const { data: connections } = trpc.iotProtocol.getAllConnectionStatuses.useQuery();
  const modbusConnections = connections?.filter(c => 
    c.protocol === 'modbus_tcp' || c.protocol === 'modbus_rtu'
  ) || [];
  
  const connectMutation = trpc.iotProtocol.connectModbus.useMutation({
    onSuccess: () => {
      toast.success('Modbus connected successfully');
      setIsConnectOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Modbus Connections</h3>
          <p className="text-sm text-muted-foreground">Manage Modbus TCP/RTU connections</p>
        </div>
        <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Modbus Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <Input 
                  type="number"
                  value={modbusConfig.deviceId}
                  onChange={(e) => setModbusConfig({ ...modbusConfig, deviceId: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Protocol</Label>
                <Select 
                  value={modbusConfig.protocol}
                  onValueChange={(v: any) => setModbusConfig({ ...modbusConfig, protocol: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modbus_tcp">Modbus TCP</SelectItem>
                    <SelectItem value="modbus_rtu">Modbus RTU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Host</Label>
                  <Input 
                    value={modbusConfig.host}
                    onChange={(e) => setModbusConfig({ ...modbusConfig, host: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input 
                    type="number"
                    value={modbusConfig.port}
                    onChange={(e) => setModbusConfig({ ...modbusConfig, port: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Unit ID</Label>
                <Input 
                  type="number"
                  value={modbusConfig.unitId}
                  onChange={(e) => setModbusConfig({ ...modbusConfig, unitId: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConnectOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => connectMutation.mutate(modbusConfig)}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device ID</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registers Read</TableHead>
              <TableHead>Registers Written</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modbusConnections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No Modbus connections
                </TableCell>
              </TableRow>
            ) : (
              modbusConnections.map((conn) => (
                <TableRow key={conn.deviceId}>
                  <TableCell>Device #{conn.deviceId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{conn.protocol.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conn.isConnected ? 'default' : 'secondary'}>
                      {conn.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </TableCell>
                  <TableCell>{conn.messagesReceived}</TableCell>
                  <TableCell>{conn.messagesSent}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============ Main Page ============
export default function IoTProtocolManagement() {
  const { data: stats, refetch } = trpc.iotProtocol.getStats.useQuery();
  
  const startAutoReconnect = trpc.iotProtocol.startAutoReconnect.useMutation({
    onSuccess: () => toast.success('Auto-reconnect started'),
  });
  
  const stopAutoReconnect = trpc.iotProtocol.stopAutoReconnect.useMutation({
    onSuccess: () => toast.success('Auto-reconnect stopped'),
  });
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Protocol Management</h1>
            <p className="text-muted-foreground">
              Manage MQTT, OPC-UA, and Modbus connections
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => startAutoReconnect.mutate({ intervalMs: 30000 })}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Auto-Reconnect
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalConnections || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Connections</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.activeConnections || 0}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalMessagesReceived || 0}</div>
                  <div className="text-xs text-muted-foreground">Messages Received</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalMessagesSent || 0}</div>
                  <div className="text-xs text-muted-foreground">Messages Sent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Protocol Tabs */}
        <Tabs defaultValue="mqtt" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mqtt">
              <Radio className="h-4 w-4 mr-2" />
              MQTT
            </TabsTrigger>
            <TabsTrigger value="opcua">
              <Server className="h-4 w-4 mr-2" />
              OPC-UA
            </TabsTrigger>
            <TabsTrigger value="modbus">
              <Cable className="h-4 w-4 mr-2" />
              Modbus
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mqtt">
            <MQTTTab />
          </TabsContent>
          
          <TabsContent value="opcua">
            <OPCUATab />
          </TabsContent>
          
          <TabsContent value="modbus">
            <ModbusTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
