/**
 * Sync Dashboard - Hiển thị trạng thái đồng bộ và xử lý conflicts
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Cloud, AlertTriangle, CheckCircle, Clock, ArrowUpDown, Database, Smartphone } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function SyncDashboard() {
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  const { data: status, refetch: refetchStatus } = trpc.sync.getStatus.useQuery();
  const { data: conflicts, refetch: refetchConflicts } = trpc.sync.getConflicts.useQuery();
  const { data: history } = trpc.sync.getHistory.useQuery();
  const { data: statistics } = trpc.sync.getStatistics.useQuery();

  const createTestConflict = trpc.sync.createTestConflict.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo conflict test');
      refetchConflicts();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resolveConflict = trpc.sync.resolveConflict.useMutation({
    onSuccess: () => {
      toast.success('Đã giải quyết conflict');
      setResolveDialogOpen(false);
      setSelectedConflict(null);
      refetchConflicts();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleResolve = (resolution: 'client_wins' | 'server_wins' | 'merge') => {
    if (!selectedConflict) return;
    resolveConflict.mutate({
      conflictId: selectedConflict.id,
      resolution,
      mergedData: resolution === 'merge' ? { ...selectedConflict.serverData, ...selectedConflict.clientData } : undefined,
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sync Dashboard</h1>
            <p className="text-muted-foreground">Quản lý đồng bộ dữ liệu offline và xử lý conflicts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetchStatus(); refetchConflicts(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={() => createTestConflict.mutate({})}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Tạo Test Conflict
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cloud className="h-4 w-4 text-green-500" />
                Trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Online</div>
              <p className="text-xs text-muted-foreground">
                Server time: {status ? formatTime(status.serverTime) : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Pending Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.pendingConflicts || 0}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-blue-500" />
                Tổng Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.totalOperations || 0}</div>
              <p className="text-xs text-muted-foreground">7 ngày qua</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.successRate || 100}%</div>
              <p className="text-xs text-muted-foreground">Tỷ lệ thành công</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="conflicts">
          <TabsList>
            <TabsTrigger value="conflicts">Conflicts ({conflicts?.total || 0})</TabsTrigger>
            <TabsTrigger value="history">Lịch sử Sync</TabsTrigger>
            <TabsTrigger value="statistics">Thống kê</TabsTrigger>
          </TabsList>

          <TabsContent value="conflicts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Conflicts</CardTitle>
                <CardDescription>Các conflicts cần được giải quyết</CardDescription>
              </CardHeader>
              <CardContent>
                {conflicts?.conflicts && conflicts.conflicts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Client Time</TableHead>
                        <TableHead>Server Time</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conflicts.conflicts.map((conflict: any) => (
                        <TableRow key={conflict.id}>
                          <TableCell className="font-mono text-xs">{conflict.id.substring(0, 15)}...</TableCell>
                          <TableCell><Badge variant="outline">{conflict.entityType}</Badge></TableCell>
                          <TableCell>{conflict.entityId}</TableCell>
                          <TableCell className="text-xs">{formatTime(conflict.clientTimestamp)}</TableCell>
                          <TableCell className="text-xs">{formatTime(conflict.serverTimestamp)}</TableCell>
                          <TableCell>
                            <Badge variant={conflict.status === 'pending' ? 'destructive' : 'default'}>{conflict.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => { setSelectedConflict(conflict); setResolveDialogOpen(true); }}>
                              Giải quyết
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Không có conflicts nào cần xử lý</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Sync</CardTitle>
                <CardDescription>Các hoạt động đồng bộ gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                {history?.items && history.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Conflicts</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{formatTime(item.timestamp)}</TableCell>
                          <TableCell><Badge variant="outline">{item.action}</Badge></TableCell>
                          <TableCell>{item.changesCount}</TableCell>
                          <TableCell>{item.conflictsCount}</TableCell>
                          <TableCell>{item.duration}ms</TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>{item.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4" />
                    <p>Chưa có lịch sử sync</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Thống kê Operations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Push Operations</span>
                    <span className="font-bold">{statistics?.pushOperations || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pull Operations</span>
                    <span className="font-bold">{statistics?.pullOperations || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Resolve Operations</span>
                    <span className="font-bold">{statistics?.resolveOperations || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Thống kê Data</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Changes</span>
                    <span className="font-bold">{statistics?.totalChanges || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Conflicts</span>
                    <span className="font-bold">{statistics?.totalConflicts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-bold text-green-500">{statistics?.successRate || 100}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Giải quyết Conflict</DialogTitle>
              <DialogDescription>Chọn phương thức giải quyết conflict giữa dữ liệu client và server</DialogDescription>
            </DialogHeader>

            {selectedConflict && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Client Data
                      </CardTitle>
                      <CardDescription className="text-xs">{formatTime(selectedConflict.clientTimestamp)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(selectedConflict.clientData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Server Data
                      </CardTitle>
                      <CardDescription className="text-xs">{formatTime(selectedConflict.serverTimestamp)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(selectedConflict.serverData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => handleResolve('client_wins')}>
                <Smartphone className="h-4 w-4 mr-2" />
                Dùng Client
              </Button>
              <Button variant="outline" onClick={() => handleResolve('server_wins')}>
                <Database className="h-4 w-4 mr-2" />
                Dùng Server
              </Button>
              <Button onClick={() => handleResolve('merge')}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Merge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
