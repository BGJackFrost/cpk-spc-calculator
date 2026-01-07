/**
 * Edge Gateway Dashboard
 * Quản lý và giám sát Edge Gateway MVP
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Server, Cpu, HardDrive, MemoryStick, Wifi, RefreshCw, Settings,
  Activity, Clock, AlertTriangle, CheckCircle, XCircle, Loader2
} from "lucide-react";

export default function EdgeGatewayDashboard() {
  const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
  
  const { data: gateways, isLoading: loadingGateways, refetch: refetchGateways } = trpc.edgeGateway.list.useQuery();
  const { data: devices, isLoading: loadingDevices } = trpc.edgeGateway.getDevices.useQuery(
    { gatewayId: selectedGateway! },
    { enabled: !!selectedGateway }
  );
  const { data: stats } = trpc.edgeGateway.getStats.useQuery(
    { gatewayId: selectedGateway! },
    { enabled: !!selectedGateway }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Online</Badge>;
      case 'offline': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Offline</Badge>;
      case 'syncing': return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing</Badge>;
      case 'error': return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Error</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimestamp = (ts: number | null | undefined) => ts ? new Date(ts).toLocaleString('vi-VN') : 'N/A';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edge Gateway Dashboard</h1>
            <p className="text-muted-foreground">Quản lý và giám sát Edge Gateway cho khu vực sản xuất</p>
          </div>
          <Button onClick={() => refetchGateways()}><RefreshCw className="w-4 h-4 mr-2" />Làm mới</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingGateways ? (
            <div className="col-span-full flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : gateways?.map((gateway) => (
            <Card key={gateway.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedGateway === gateway.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedGateway(gateway.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Server className="w-5 h-5" /><CardTitle className="text-lg">{gateway.name}</CardTitle></div>
                  {getStatusBadge(gateway.status)}
                </div>
                <CardDescription>{gateway.gatewayCode}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">📍 {gateway.location || 'Chưa xác định'}</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1"><Cpu className="w-4 h-4 text-blue-500" /><span>{gateway.cpuUsage?.toFixed(1) || 0}%</span></div>
                    <div className="flex items-center gap-1"><MemoryStick className="w-4 h-4 text-green-500" /><span>{gateway.memoryUsage?.toFixed(1) || 0}%</span></div>
                    <div className="flex items-center gap-1"><HardDrive className="w-4 h-4 text-orange-500" /><span>{gateway.diskUsage?.toFixed(1) || 0}%</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span>Buffer</span><span>{gateway.currentBufferSize}/{gateway.bufferCapacity}</span></div>
                    <Progress value={(gateway.currentBufferSize / gateway.bufferCapacity) * 100} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /><span>Đồng bộ: {formatTimestamp(gateway.lastSyncAt)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedGateway && (
          <Tabs defaultValue="devices" className="mt-6">
            <TabsList>
              <TabsTrigger value="devices"><Wifi className="w-4 h-4 mr-2" />Thiết bị ({devices?.length || 0})</TabsTrigger>
              <TabsTrigger value="stats"><Activity className="w-4 h-4 mr-2" />Thống kê</TabsTrigger>
              <TabsTrigger value="config"><Settings className="w-4 h-4 mr-2" />Cấu hình</TabsTrigger>
            </TabsList>

            <TabsContent value="devices" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Danh sách thiết bị kết nối</CardTitle><CardDescription>Các sensor và thiết bị được quản lý bởi gateway này</CardDescription></CardHeader>
                <CardContent>
                  {loadingDevices ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Mã thiết bị</TableHead><TableHead>Tên</TableHead><TableHead>Loại</TableHead><TableHead>Protocol</TableHead><TableHead>Giá trị cuối</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {devices?.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell className="font-mono">{device.deviceCode}</TableCell>
                            <TableCell>{device.name}</TableCell>
                            <TableCell><Badge variant="outline">{device.deviceType}</Badge></TableCell>
                            <TableCell>{device.protocol}</TableCell>
                            <TableCell>{device.lastValue != null ? `${device.lastValue} ${device.unit || ''}` : 'N/A'}</TableCell>
                            <TableCell>{device.status === 'active' ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">{device.status}</Badge>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.totalDevices || 0}</div><p className="text-xs text-muted-foreground">{stats?.activeDevices || 0} đang hoạt động</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Điểm dữ liệu</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.totalDataPoints?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">Tổng số đã thu thập</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ đồng bộ</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.pendingSync || 0}</div><p className="text-xs text-muted-foreground">Trong buffer</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Độ trễ TB</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.avgLatency || 0}ms</div><p className="text-xs text-muted-foreground">Sync latency</p></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Cấu hình Gateway</CardTitle><CardDescription>Thông tin chi tiết và cấu hình của gateway</CardDescription></CardHeader>
                <CardContent>
                  {gateways?.find(g => g.id === selectedGateway) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">IP Address:</span><span className="font-mono">{gateways.find(g => g.id === selectedGateway)?.ipAddress || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">MAC Address:</span><span className="font-mono">{gateways.find(g => g.id === selectedGateway)?.macAddress || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Firmware:</span><span>{gateways.find(g => g.id === selectedGateway)?.firmwareVersion || 'N/A'}</span></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">Sync Interval:</span><span>{gateways.find(g => g.id === selectedGateway)?.syncInterval || 60}s</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Buffer Capacity:</span><span>{gateways.find(g => g.id === selectedGateway)?.bufferCapacity?.toLocaleString() || 10000}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Last Heartbeat:</span><span>{formatTimestamp(gateways.find(g => g.id === selectedGateway)?.lastHeartbeat)}</span></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
