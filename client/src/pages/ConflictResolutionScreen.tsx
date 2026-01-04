/**
 * ConflictResolutionScreen - Offline Conflict Resolution UI
 * Hiển thị và xử lý conflicts khi có xung đột dữ liệu offline
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Cloud,
  Smartphone,
  GitMerge,
  History,
  Clock,
  Database,
  FileText,
  ArrowRight,
  ArrowLeft,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
  Eye,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Types
interface ConflictItem {
  id: string;
  entityType: 'measurement' | 'inspection' | 'defect' | 'setting';
  entityId: number;
  entityName: string;
  localData: Record<string, any>;
  serverData: Record<string, any>;
  localTimestamp: number;
  serverTimestamp: number;
  conflictType: 'update' | 'delete' | 'create';
  status: 'pending' | 'resolved' | 'ignored';
  resolution?: 'local' | 'server' | 'merged';
  resolvedAt?: number;
  resolvedBy?: string;
}

interface ResolvedConflict extends ConflictItem {
  status: 'resolved';
  resolution: 'local' | 'server' | 'merged';
  resolvedAt: number;
}

export default function ConflictResolutionScreen() {
  // State
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [resolvedHistory, setResolvedHistory] = useState<ResolvedConflict[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());
  const [detailDialog, setDetailDialog] = useState<ConflictItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load mock conflicts (in real app, this would come from IndexedDB/sync service)
  useEffect(() => {
    loadConflicts();
    loadResolvedHistory();
  }, []);

  const loadConflicts = () => {
    // Mock data - in real app, load from IndexedDB sync queue
    const mockConflicts: ConflictItem[] = [
      {
        id: 'conflict-1',
        entityType: 'measurement',
        entityId: 1001,
        entityName: 'Measurement #1001',
        localData: {
          value: 25.5,
          unit: 'mm',
          operator: 'Nguyễn Văn A',
          timestamp: Date.now() - 3600000,
          notes: 'Đo lại lần 2'
        },
        serverData: {
          value: 25.3,
          unit: 'mm',
          operator: 'Trần Văn B',
          timestamp: Date.now() - 7200000,
          notes: 'Đo ban đầu'
        },
        localTimestamp: Date.now() - 3600000,
        serverTimestamp: Date.now() - 7200000,
        conflictType: 'update',
        status: 'pending'
      },
      {
        id: 'conflict-2',
        entityType: 'inspection',
        entityId: 2001,
        entityName: 'Inspection #2001',
        localData: {
          result: 'PASS',
          cpk: 1.45,
          inspector: 'Lê Văn C',
          checkedAt: Date.now() - 1800000
        },
        serverData: {
          result: 'FAIL',
          cpk: 1.28,
          inspector: 'Phạm Văn D',
          checkedAt: Date.now() - 5400000
        },
        localTimestamp: Date.now() - 1800000,
        serverTimestamp: Date.now() - 5400000,
        conflictType: 'update',
        status: 'pending'
      },
      {
        id: 'conflict-3',
        entityType: 'defect',
        entityId: 3001,
        entityName: 'Defect Report #3001',
        localData: {
          type: 'Scratch',
          severity: 'Minor',
          location: 'Surface A',
          reportedBy: 'Hoàng Văn E'
        },
        serverData: null,
        localTimestamp: Date.now() - 900000,
        serverTimestamp: 0,
        conflictType: 'create',
        status: 'pending'
      },
      {
        id: 'conflict-4',
        entityType: 'setting',
        entityId: 4001,
        entityName: 'Alert Threshold',
        localData: {
          cpkWarning: 1.33,
          cpkCritical: 1.0,
          enabled: true
        },
        serverData: {
          cpkWarning: 1.5,
          cpkCritical: 1.2,
          enabled: false
        },
        localTimestamp: Date.now() - 600000,
        serverTimestamp: Date.now() - 3600000,
        conflictType: 'update',
        status: 'pending'
      }
    ];
    setConflicts(mockConflicts);
  };

  const loadResolvedHistory = () => {
    // Load from localStorage
    const saved = localStorage.getItem('conflict_resolution_history');
    if (saved) {
      try {
        setResolvedHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  };

  const saveResolvedHistory = (history: ResolvedConflict[]) => {
    localStorage.setItem('conflict_resolution_history', JSON.stringify(history.slice(0, 100)));
  };

  // Toggle conflict selection
  const toggleSelection = (conflictId: string) => {
    setSelectedConflicts(prev => {
      const next = new Set(prev);
      if (next.has(conflictId)) {
        next.delete(conflictId);
      } else {
        next.add(conflictId);
      }
      return next;
    });
  };

  // Select all pending conflicts
  const selectAll = () => {
    const pendingIds = conflicts.filter(c => c.status === 'pending').map(c => c.id);
    setSelectedConflicts(new Set(pendingIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedConflicts(new Set());
  };

  // Resolve single conflict
  const resolveConflict = (conflictId: string, resolution: 'local' | 'server' | 'merged') => {
    setConflicts(prev => prev.map(c => {
      if (c.id === conflictId) {
        const resolved: ResolvedConflict = {
          ...c,
          status: 'resolved',
          resolution,
          resolvedAt: Date.now(),
          resolvedBy: 'Current User'
        };
        
        // Add to history
        setResolvedHistory(prevHistory => {
          const newHistory = [resolved, ...prevHistory];
          saveResolvedHistory(newHistory);
          return newHistory;
        });
        
        return resolved;
      }
      return c;
    }));
    
    toast.success(`Đã xử lý conflict: ${resolution === 'local' ? 'Giữ Local' : resolution === 'server' ? 'Giữ Server' : 'Merge'}`);
  };

  // Batch resolve selected conflicts
  const batchResolve = (resolution: 'local' | 'server') => {
    if (selectedConflicts.size === 0) {
      toast.error('Vui lòng chọn ít nhất một conflict');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      const resolvedItems: ResolvedConflict[] = [];
      
      setConflicts(prev => prev.map(c => {
        if (selectedConflicts.has(c.id) && c.status === 'pending') {
          const resolved: ResolvedConflict = {
            ...c,
            status: 'resolved',
            resolution,
            resolvedAt: Date.now(),
            resolvedBy: 'Current User'
          };
          resolvedItems.push(resolved);
          return resolved;
        }
        return c;
      }));

      // Add to history
      setResolvedHistory(prevHistory => {
        const newHistory = [...resolvedItems, ...prevHistory];
        saveResolvedHistory(newHistory);
        return newHistory;
      });

      setSelectedConflicts(new Set());
      setIsLoading(false);
      toast.success(`Đã xử lý ${resolvedItems.length} conflicts`);
    }, 500);
  };

  // Ignore conflict
  const ignoreConflict = (conflictId: string) => {
    setConflicts(prev => prev.map(c => 
      c.id === conflictId ? { ...c, status: 'ignored' as const } : c
    ));
    toast.info('Đã bỏ qua conflict');
  };

  // Undo resolved conflict
  const undoResolution = (conflictId: string) => {
    setResolvedHistory(prev => {
      const newHistory = prev.filter(c => c.id !== conflictId);
      saveResolvedHistory(newHistory);
      return newHistory;
    });
    
    // Add back to pending
    const conflict = resolvedHistory.find(c => c.id === conflictId);
    if (conflict) {
      setConflicts(prev => [...prev, { ...conflict, status: 'pending', resolution: undefined, resolvedAt: undefined }]);
    }
    
    toast.success('Đã hoàn tác xử lý conflict');
  };

  // Get entity type badge
  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'measurement':
        return <Badge className="bg-blue-500">Measurement</Badge>;
      case 'inspection':
        return <Badge className="bg-green-500">Inspection</Badge>;
      case 'defect':
        return <Badge variant="destructive">Defect</Badge>;
      case 'setting':
        return <Badge className="bg-purple-500">Setting</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get conflict type badge
  const getConflictTypeBadge = (type: string) => {
    switch (type) {
      case 'update':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Update</Badge>;
      case 'delete':
        return <Badge variant="outline" className="border-red-500 text-red-500">Delete</Badge>;
      case 'create':
        return <Badge variant="outline" className="border-green-500 text-green-500">Create</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get resolution badge
  const getResolutionBadge = (resolution: string) => {
    switch (resolution) {
      case 'local':
        return <Badge className="bg-blue-500"><Smartphone className="mr-1 h-3 w-3" />Local</Badge>;
      case 'server':
        return <Badge className="bg-green-500"><Cloud className="mr-1 h-3 w-3" />Server</Badge>;
      case 'merged':
        return <Badge className="bg-purple-500"><GitMerge className="mr-1 h-3 w-3" />Merged</Badge>;
      default:
        return <Badge variant="outline">{resolution}</Badge>;
    }
  };

  const pendingConflicts = conflicts.filter(c => c.status === 'pending');
  const ignoredConflicts = conflicts.filter(c => c.status === 'ignored');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Conflict Resolution
            </h1>
            <p className="text-muted-foreground">
              Xử lý xung đột dữ liệu giữa local và server
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadConflicts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-500">{pendingConflicts.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã chọn</p>
                  <p className="text-2xl font-bold text-blue-500">{selectedConflicts.size}</p>
                </div>
                <Layers className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã xử lý</p>
                  <p className="text-2xl font-bold text-green-500">{resolvedHistory.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bỏ qua</p>
                  <p className="text-2xl font-bold text-gray-500">{ignoredConflicts.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Actions */}
        {selectedConflicts.size > 0 && (
          <Card className="bg-accent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium">
                    Đã chọn {selectedConflicts.size} conflicts
                  </span>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Bỏ chọn tất cả
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => batchResolve('local')}
                    disabled={isLoading}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Giữ tất cả Local
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => batchResolve('server')}
                    disabled={isLoading}
                  >
                    <Cloud className="mr-2 h-4 w-4" />
                    Giữ tất cả Server
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending ({pendingConflicts.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Lịch sử ({resolvedHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Conflicts Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conflicts chờ xử lý</CardTitle>
                    <CardDescription>
                      Xem và xử lý các xung đột dữ liệu giữa thiết bị và server
                    </CardDescription>
                  </div>
                  {pendingConflicts.length > 0 && (
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      <Check className="mr-1 h-4 w-4" />
                      Chọn tất cả
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingConflicts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Không có conflict nào</h3>
                    <p className="text-muted-foreground">
                      Dữ liệu đã được đồng bộ hoàn toàn
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className={`p-4 rounded-lg border ${
                          selectedConflicts.has(conflict.id) ? 'border-primary bg-accent/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedConflicts.has(conflict.id)}
                            onCheckedChange={() => toggleSelection(conflict.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{conflict.entityName}</span>
                              {getEntityTypeBadge(conflict.entityType)}
                              {getConflictTypeBadge(conflict.conflictType)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {/* Local Data */}
                              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <Smartphone className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-blue-500">Local</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {format(conflict.localTimestamp, 'HH:mm dd/MM', { locale: vi })}
                                  </span>
                                </div>
                                <div className="text-sm space-y-1">
                                  {conflict.localData && Object.entries(conflict.localData).slice(0, 3).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-muted-foreground">{key}:</span>
                                      <span className="font-mono">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Server Data */}
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <Cloud className="h-4 w-4 text-green-500" />
                                  <span className="font-medium text-green-500">Server</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {conflict.serverTimestamp > 0 
                                      ? format(conflict.serverTimestamp, 'HH:mm dd/MM', { locale: vi })
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                <div className="text-sm space-y-1">
                                  {conflict.serverData ? (
                                    Object.entries(conflict.serverData).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-muted-foreground">{key}:</span>
                                        <span className="font-mono">{String(value)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground italic">Không có dữ liệu</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                                onClick={() => resolveConflict(conflict.id, 'local')}
                              >
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Giữ Local
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-500 hover:bg-green-500/10"
                                onClick={() => resolveConflict(conflict.id, 'server')}
                              >
                                <ArrowRight className="mr-1 h-4 w-4" />
                                Giữ Server
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-purple-500 text-purple-500 hover:bg-purple-500/10"
                                onClick={() => setDetailDialog(conflict)}
                              >
                                <GitMerge className="mr-1 h-4 w-4" />
                                Merge
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailDialog(conflict)}
                              >
                                <Eye className="mr-1 h-4 w-4" />
                                Chi tiết
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => ignoreConflict(conflict.id)}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Bỏ qua
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử xử lý</CardTitle>
                <CardDescription>
                  Các conflicts đã được xử lý gần đây
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chưa có lịch sử</h3>
                    <p className="text-muted-foreground">
                      Các conflicts đã xử lý sẽ hiển thị ở đây
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Conflict</TableHead>
                        <TableHead>Resolution</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resolvedHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.entityName}</TableCell>
                          <TableCell>{getEntityTypeBadge(item.entityType)}</TableCell>
                          <TableCell>{getConflictTypeBadge(item.conflictType)}</TableCell>
                          <TableCell>{getResolutionBadge(item.resolution)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.resolvedAt && format(item.resolvedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => undoResolution(item.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Chi tiết Conflict
              </DialogTitle>
              <DialogDescription>
                So sánh chi tiết dữ liệu local và server
              </DialogDescription>
            </DialogHeader>

            {detailDialog && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{detailDialog.entityName}</span>
                  {getEntityTypeBadge(detailDialog.entityType)}
                  {getConflictTypeBadge(detailDialog.conflictType)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Local Data Full */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-blue-500">Local Data</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {format(detailDialog.localTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi })}
                    </div>
                    <ScrollArea className="h-[200px]">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(detailDialog.localData, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>

                  {/* Server Data Full */}
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Cloud className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-500">Server Data</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {detailDialog.serverTimestamp > 0
                        ? format(detailDialog.serverTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi })
                        : 'N/A'
                      }
                    </div>
                    <ScrollArea className="h-[200px]">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {detailDialog.serverData 
                          ? JSON.stringify(detailDialog.serverData, null, 2)
                          : 'null'
                        }
                      </pre>
                    </ScrollArea>
                  </div>
                </div>

                {/* Diff Highlight */}
                {detailDialog.localData && detailDialog.serverData && (
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Differences</h4>
                    <div className="space-y-1 text-sm">
                      {Object.keys({ ...detailDialog.localData, ...detailDialog.serverData }).map(key => {
                        const localVal = detailDialog.localData?.[key];
                        const serverVal = detailDialog.serverData?.[key];
                        if (localVal !== serverVal) {
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <span className="font-medium">{key}:</span>
                              <span className="text-blue-500">{String(localVal ?? 'null')}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <span className="text-green-500">{String(serverVal ?? 'null')}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(null)}>
                Đóng
              </Button>
              {detailDialog && (
                <>
                  <Button
                    variant="outline"
                    className="border-blue-500 text-blue-500"
                    onClick={() => {
                      resolveConflict(detailDialog.id, 'local');
                      setDetailDialog(null);
                    }}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Giữ Local
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-500"
                    onClick={() => {
                      resolveConflict(detailDialog.id, 'server');
                      setDetailDialog(null);
                    }}
                  >
                    <Cloud className="mr-2 h-4 w-4" />
                    Giữ Server
                  </Button>
                  <Button
                    className="bg-purple-500 hover:bg-purple-600"
                    onClick={() => {
                      resolveConflict(detailDialog.id, 'merged');
                      setDetailDialog(null);
                    }}
                  >
                    <GitMerge className="mr-2 h-4 w-4" />
                    Merge
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
