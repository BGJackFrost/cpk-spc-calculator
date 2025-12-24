import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Server, RefreshCw, Plus, Play, CheckCircle, XCircle, Clock, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

export default function ErpIntegration() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState({ name: "", type: "sap" as const, connectionString: "" });
  
  const { data: stats, refetch: refetchStats } = trpc.erpIntegration.getStats.useQuery();
  const { data: integrations, refetch: refetchIntegrations } = trpc.erpIntegration.listIntegrations.useQuery();
  const { data: syncLogs } = trpc.erpIntegration.getSyncLogs.useQuery({ limit: 10 });
  
  const createIntegration = trpc.erpIntegration.createIntegration.useMutation({
    onSuccess: () => {
      toast.success("Integration đã được tạo thành công");
      setIsAddDialogOpen(false);
      setNewIntegration({ name: "", type: "sap", connectionString: "" });
      refetchIntegrations();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const testConnection = trpc.erpIntegration.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Kết nối thành công! Latency: ${result.latency}ms`);
      } else {
        toast.error(`Kết nối thất bại: ${result.message}`);
      }
      refetchIntegrations();
    },
  });
  
  const syncData = trpc.erpIntegration.syncData.useMutation({
    onSuccess: (result) => {
      toast.success(`Đồng bộ thành công! ${result.recordsProcessed} records trong ${result.duration}ms`);
      refetchStats();
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Active</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getTypeIcon = (type: string) => {
    return <Server className="h-5 w-5" />;
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ERP Integration</h1>
            <p className="text-muted-foreground mt-1">Quản lý tích hợp với hệ thống ERP/MES</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetchStats(); refetchIntegrations(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm Integration</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm ERP Integration</DialogTitle>
                  <DialogDescription>Cấu hình kết nối với hệ thống ERP</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên Integration</Label>
                    <Input value={newIntegration.name} onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })} placeholder="SAP Production" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Loại ERP</Label>
                    <Select value={newIntegration.type} onValueChange={(v: any) => setNewIntegration({ ...newIntegration, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sap">SAP</SelectItem>
                        <SelectItem value="oracle">Oracle</SelectItem>
                        <SelectItem value="dynamics">Microsoft Dynamics</SelectItem>
                        <SelectItem value="custom">Custom API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Connection String</Label>
                    <Input value={newIntegration.connectionString} onChange={(e) => setNewIntegration({ ...newIntegration, connectionString: e.target.value })} placeholder="https://erp.example.com/api" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                  <Button onClick={() => createIntegration.mutate(newIntegration)} disabled={createIntegration.isPending}>
                    {createIntegration.isPending ? "Đang tạo..." : "Tạo Integration"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng Integrations</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.totalIntegrations || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Active</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{stats?.activeIntegrations || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" />Error</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-500">{stats?.errorIntegrations || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Last Sync</CardTitle></CardHeader>
            <CardContent><div className="text-sm">{stats?.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleString("vi-VN") : "N/A"}</div></CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="integrations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations?.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(integration.type)}
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                    <CardDescription>{integration.type.toUpperCase()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Last sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString("vi-VN") : "Chưa đồng bộ"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testConnection.mutate({ id: integration.id })}
                        disabled={testConnection.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => syncData.mutate({ id: integration.id, direction: "import" })}
                        disabled={syncData.isPending}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!integrations || integrations.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Chưa có integration nào. Nhấn "Thêm Integration" để bắt đầu.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Sync Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncLogs?.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-4">
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>
                          {log.status}
                        </Badge>
                        <div>
                          <p className="font-medium">{log.direction === "import" ? "Import" : "Export"}</p>
                          <p className="text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString("vi-VN")}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{log.recordsProcessed} records</p>
                        <p className="text-muted-foreground">{log.duration}ms</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
