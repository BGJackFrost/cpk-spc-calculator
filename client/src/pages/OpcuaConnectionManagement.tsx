/**
 * OPC-UA Connection Management Page
 * Quản lý kết nối OPC-UA server và nodes
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  RefreshCw, 
  Server, 
  ServerOff, 
  FolderTree,
  Eye,
  Loader2,
  ChevronRight,
  ChevronDown,
  FileText,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrowseNode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: number;
  typeDefinition?: string;
}

export default function OpcuaConnectionManagement() {
  const { toast } = useToast();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [browseNodeId, setBrowseNodeId] = useState('RootFolder');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['RootFolder']));
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    endpointUrl: 'opc.tcp://localhost:4840',
    securityMode: 'None' as 'None' | 'Sign' | 'SignAndEncrypt',
    securityPolicy: '',
    username: '',
    password: '',
    sessionTimeout: 60000,
    keepAliveInterval: 10000,
  });

  const [nodeForm, setNodeForm] = useState({
    nodeId: '',
    displayName: '',
    samplingInterval: 1000,
    unit: '',
  });

  // Queries
  const { data: connections, refetch: refetchConnections } = trpc.opcua.getConnections.useQuery();
  
  const { data: connectionStatus, refetch: refetchStatus } = trpc.opcua.getConnectionStatus.useQuery(
    { connectionId: selectedConnectionId! },
    { enabled: !!selectedConnectionId }
  );

  const { data: nodes, refetch: refetchNodes } = trpc.opcua.getNodes.useQuery(
    { connectionId: selectedConnectionId! },
    { enabled: !!selectedConnectionId }
  );

  const { data: browseResult } = trpc.opcua.browseNodes.useQuery(
    { connectionId: selectedConnectionId!, nodeId: browseNodeId },
    { enabled: !!selectedConnectionId && connectionStatus?.connected }
  );

  // Mutations
  const createConnectionMutation = trpc.opcua.createConnection.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã tạo connection' });
      refetchConnections();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const deleteConnectionMutation = trpc.opcua.deleteConnection.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã xóa connection' });
      refetchConnections();
      setSelectedConnectionId(null);
    },
  });

  const connectMutation = trpc.opcua.connect.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã kết nối OPC-UA server' });
      refetchStatus();
    },
    onError: (error) => {
      toast({ title: 'Lỗi kết nối', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectMutation = trpc.opcua.disconnect.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã ngắt kết nối' });
      refetchStatus();
    },
  });

  const createNodeMutation = trpc.opcua.createNode.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã thêm node' });
      refetchNodes();
      setIsNodeDialogOpen(false);
      setNodeForm({ nodeId: '', displayName: '', samplingInterval: 1000, unit: '' });
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const deleteNodeMutation = trpc.opcua.deleteNode.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã xóa node' });
      refetchNodes();
    },
  });

  const subscribeNodeMutation = trpc.opcua.subscribeNode.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã subscribe node' });
      refetchStatus();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const testConnectionMutation = trpc.opcua.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Test thành công', description: result.message });
      } else {
        toast({ title: 'Test thất bại', description: result.message, variant: 'destructive' });
      }
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      name: '',
      endpointUrl: 'opc.tcp://localhost:4840',
      securityMode: 'None',
      securityPolicy: '',
      username: '',
      password: '',
      sessionTimeout: 60000,
      keepAliveInterval: 10000,
    });
  };

  const handleCreateConnection = () => {
    createConnectionMutation.mutate(formData);
  };

  const handleConnect = (id: number) => {
    connectMutation.mutate({ connectionId: id });
  };

  const handleDisconnect = (id: number) => {
    disconnectMutation.mutate({ connectionId: id });
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate({
      endpointUrl: formData.endpointUrl,
      securityMode: formData.securityMode,
      username: formData.username || undefined,
      password: formData.password || undefined,
    });
  };

  const handleAddNode = (node: BrowseNode) => {
    setNodeForm({
      nodeId: node.nodeId,
      displayName: node.displayName || node.browseName,
      samplingInterval: 1000,
      unit: '',
    });
    setIsNodeDialogOpen(true);
  };

  const handleCreateNode = () => {
    if (selectedConnectionId && nodeForm.nodeId) {
      createNodeMutation.mutate({
        connectionId: selectedConnectionId,
        nodeId: nodeForm.nodeId,
        displayName: nodeForm.displayName,
        samplingInterval: nodeForm.samplingInterval,
        unit: nodeForm.unit || undefined,
      });
    }
  };

  const toggleNodeExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
      setBrowseNodeId(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (nodeClass: number) => {
    switch (nodeClass) {
      case 1: return <Folder className="w-4 h-4 text-yellow-500" />;
      case 2: return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý OPC-UA Connections</h1>
            <p className="text-muted-foreground">
              Kết nối với PLC/SCADA qua giao thức OPC-UA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetchConnections()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Thêm OPC-UA Connection</DialogTitle>
                  <DialogDescription>
                    Cấu hình kết nối đến OPC-UA server
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên connection</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="PLC Line 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      value={formData.endpointUrl}
                      onChange={(e) => setFormData({ ...formData, endpointUrl: e.target.value })}
                      placeholder="opc.tcp://192.168.1.100:4840"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Security Mode</Label>
                      <Select
                        value={formData.securityMode}
                        onValueChange={(v) => setFormData({ ...formData, securityMode: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Sign">Sign</SelectItem>
                          <SelectItem value="SignAndEncrypt">Sign & Encrypt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Security Policy</Label>
                      <Select
                        value={formData.securityPolicy || 'None'}
                        onValueChange={(v) => setFormData({ ...formData, securityPolicy: v === 'None' ? '' : v })}
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
                    <div className="space-y-2">
                      <Label>Username (optional)</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password (optional)</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Test Connection
                  </Button>
                  <Button
                    onClick={handleCreateConnection}
                    disabled={createConnectionMutation.isPending || !formData.name}
                  >
                    {createConnectionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Tạo Connection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connections List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Connections</CardTitle>
              <CardDescription>
                {connections?.length || 0} connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {connections?.map((conn) => (
                  <div
                    key={conn.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedConnectionId === conn.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedConnectionId(conn.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          connectionStatus?.connected && selectedConnectionId === conn.id
                            ? "bg-green-500"
                            : "bg-gray-400"
                        )} />
                        <span className="font-medium">{conn.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConnectionMutation.mutate({ id: conn.id });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {conn.endpointUrl}
                    </p>
                  </div>
                ))}
                {(!connections || connections.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có connection nào
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connection Detail */}
          <Card className="lg:col-span-2">
            {selectedConnectionId ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {connections?.find(c => c.id === selectedConnectionId)?.name}
                      </CardTitle>
                      <CardDescription>
                        {connections?.find(c => c.id === selectedConnectionId)?.endpointUrl}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={connectionStatus?.connected ? "default" : "secondary"}>
                        {connectionStatus?.connected ? (
                          <><Server className="w-3 h-3 mr-1" /> Connected</>
                        ) : (
                          <><ServerOff className="w-3 h-3 mr-1" /> Disconnected</>
                        )}
                      </Badge>
                      {connectionStatus?.connected ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(selectedConnectionId)}
                          disabled={disconnectMutation.isPending}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(selectedConnectionId)}
                          disabled={connectMutation.isPending}
                        >
                          {connectMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-1" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="browse">
                    <TabsList>
                      <TabsTrigger value="browse">
                        <FolderTree className="w-4 h-4 mr-2" />
                        Browse Nodes
                      </TabsTrigger>
                      <TabsTrigger value="subscribed">
                        <Eye className="w-4 h-4 mr-2" />
                        Subscribed ({nodes?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse">
                      {connectionStatus?.connected ? (
                        <ScrollArea className="h-80 border rounded-lg p-2">
                          {browseResult?.map((node) => (
                            <div
                              key={node.nodeId}
                              className="flex items-center justify-between py-1 px-2 hover:bg-muted rounded"
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleNodeExpand(node.nodeId)}
                                >
                                  {expandedNodes.has(node.nodeId) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                                {getNodeIcon(node.nodeClass)}
                                <span className="text-sm">{node.displayName || node.browseName}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddNode(node)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Kết nối để browse nodes
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="subscribed">
                      {nodes && nodes.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Node ID</TableHead>
                              <TableHead>Display Name</TableHead>
                              <TableHead>Interval</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nodes.map((node) => (
                              <TableRow key={node.id}>
                                <TableCell className="font-mono text-xs">{node.nodeId}</TableCell>
                                <TableCell>{node.displayName}</TableCell>
                                <TableCell>{node.samplingInterval}ms</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => subscribeNodeMutation.mutate({
                                        connectionId: selectedConnectionId,
                                        nodeId: node.nodeId,
                                        displayName: node.displayName,
                                        samplingInterval: node.samplingInterval,
                                      })}
                                      disabled={!connectionStatus?.connected}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteNodeMutation.mutate({ id: node.id })}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Chưa có node nào được subscribe
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">
                  Chọn một connection để xem chi tiết
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Add Node Dialog */}
        <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Node</DialogTitle>
              <DialogDescription>
                Cấu hình node để subscribe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Node ID</Label>
                <Input
                  value={nodeForm.nodeId}
                  onChange={(e) => setNodeForm({ ...nodeForm, nodeId: e.target.value })}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={nodeForm.displayName}
                  onChange={(e) => setNodeForm({ ...nodeForm, displayName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sampling Interval (ms)</Label>
                  <Input
                    type="number"
                    value={nodeForm.samplingInterval}
                    onChange={(e) => setNodeForm({ ...nodeForm, samplingInterval: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit (optional)</Label>
                  <Input
                    value={nodeForm.unit}
                    onChange={(e) => setNodeForm({ ...nodeForm, unit: e.target.value })}
                    placeholder="°C, bar, rpm..."
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateNode} disabled={createNodeMutation.isPending}>
                {createNodeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Thêm Node
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
