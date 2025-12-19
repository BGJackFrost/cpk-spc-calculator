import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  PlusCircle,
  Settings,
  History,
  Database,
  Loader2,
  Calendar,
  Hash,
  FileText,
  Download,
  Trash2,
  Eye
} from "lucide-react";

// Types
interface ChangeDetectionConfig {
  method: "timestamp" | "hash" | "version" | "custom";
  timestampColumn?: string;
  hashColumns?: string[];
  versionColumn?: string;
  customQuery?: string;
}

interface SyncMode {
  insertNew: boolean;
  updateExisting: boolean;
  deleteRemoved: boolean;
  softDelete: boolean;
  softDeleteColumn?: string;
}

interface ChangeStats {
  newRecords: number;
  updatedRecords: number;
  deletedRecords: number;
  unchangedRecords: number;
  totalSource: number;
  totalTarget: number;
}

interface SyncHistory {
  id: string;
  timestamp: Date;
  tableName: string;
  stats: ChangeStats;
  duration: number;
  status: "success" | "failed" | "partial";
  errorMessage?: string;
}

interface TableSyncConfig {
  tableName: string;
  enabled: boolean;
  changeDetection: ChangeDetectionConfig;
  syncMode: SyncMode;
  lastSyncTimestamp?: Date;
  lastSyncVersion?: number;
}

interface ColumnInfo {
  name: string;
  type: string;
}

interface IncrementalMigrationProps {
  tables: { name: string; columns: ColumnInfo[] }[];
  onSync?: (configs: TableSyncConfig[]) => Promise<void>;
  onDetectChanges?: (config: TableSyncConfig) => Promise<ChangeStats>;
}

export default function IncrementalMigration({ tables, onSync, onDetectChanges }: IncrementalMigrationProps) {
  const [tableConfigs, setTableConfigs] = useState<TableSyncConfig[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [changeStats, setChangeStats] = useState<Map<string, ChangeStats>>(new Map());
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [activeTab, setActiveTab] = useState("config");
  const [syncProgress, setSyncProgress] = useState(0);

  const { toast } = useToast();

  // Get current table config
  const currentConfig = useMemo(() => {
    return tableConfigs.find(c => c.tableName === selectedTable);
  }, [tableConfigs, selectedTable]);

  // Get current table columns
  const currentTableColumns = useMemo(() => {
    return tables.find(t => t.name === selectedTable)?.columns || [];
  }, [tables, selectedTable]);

  // Initialize table config
  const initializeTableConfig = (tableName: string) => {
    const existing = tableConfigs.find(c => c.tableName === tableName);
    if (existing) return;

    const newConfig: TableSyncConfig = {
      tableName,
      enabled: true,
      changeDetection: {
        method: "timestamp",
        timestampColumn: "",
      },
      syncMode: {
        insertNew: true,
        updateExisting: true,
        deleteRemoved: false,
        softDelete: false,
      },
    };

    setTableConfigs([...tableConfigs, newConfig]);
  };

  // Update table config
  const updateTableConfig = (tableName: string, updates: Partial<TableSyncConfig>) => {
    setTableConfigs(configs =>
      configs.map(c => c.tableName === tableName ? { ...c, ...updates } : c)
    );
  };

  // Update change detection config
  const updateChangeDetection = (updates: Partial<ChangeDetectionConfig>) => {
    if (!currentConfig) return;
    updateTableConfig(selectedTable, {
      changeDetection: { ...currentConfig.changeDetection, ...updates },
    });
  };

  // Update sync mode
  const updateSyncMode = (updates: Partial<SyncMode>) => {
    if (!currentConfig) return;
    updateTableConfig(selectedTable, {
      syncMode: { ...currentConfig.syncMode, ...updates },
    });
  };

  // Detect changes for a table
  const detectChanges = async (tableName: string) => {
    const config = tableConfigs.find(c => c.tableName === tableName);
    if (!config) return;

    setIsDetecting(true);
    try {
      let stats: ChangeStats;
      if (onDetectChanges) {
        stats = await onDetectChanges(config);
      } else {
        // Mock detection
        await new Promise(resolve => setTimeout(resolve, 1000));
        stats = {
          newRecords: Math.floor(Math.random() * 100),
          updatedRecords: Math.floor(Math.random() * 50),
          deletedRecords: Math.floor(Math.random() * 20),
          unchangedRecords: Math.floor(Math.random() * 500) + 100,
          totalSource: 0,
          totalTarget: 0,
        };
        stats.totalSource = stats.newRecords + stats.updatedRecords + stats.unchangedRecords;
        stats.totalTarget = stats.updatedRecords + stats.deletedRecords + stats.unchangedRecords;
      }

      setChangeStats(new Map(changeStats.set(tableName, stats)));
      toast({ title: "Phát hiện thay đổi", description: `Đã phân tích bảng ${tableName}` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể phát hiện thay đổi", variant: "destructive" });
    } finally {
      setIsDetecting(false);
    }
  };

  // Detect all changes
  const detectAllChanges = async () => {
    const enabledConfigs = tableConfigs.filter(c => c.enabled);
    for (const config of enabledConfigs) {
      await detectChanges(config.tableName);
    }
  };

  // Run sync
  const runSync = async () => {
    const enabledConfigs = tableConfigs.filter(c => c.enabled);
    if (enabledConfigs.length === 0) {
      toast({ title: "Lỗi", description: "Không có bảng nào được chọn", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setActiveTab("progress");

    try {
      if (onSync) {
        await onSync(enabledConfigs);
      } else {
        // Mock sync
        for (let i = 0; i < enabledConfigs.length; i++) {
          const config = enabledConfigs[i];
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const stats = changeStats.get(config.tableName) || {
            newRecords: Math.floor(Math.random() * 100),
            updatedRecords: Math.floor(Math.random() * 50),
            deletedRecords: Math.floor(Math.random() * 20),
            unchangedRecords: Math.floor(Math.random() * 500),
            totalSource: 0,
            totalTarget: 0,
          };

          const historyEntry: SyncHistory = {
            id: Date.now().toString(),
            timestamp: new Date(),
            tableName: config.tableName,
            stats,
            duration: Math.floor(Math.random() * 5000) + 1000,
            status: Math.random() > 0.1 ? "success" : "partial",
          };

          setSyncHistory(prev => [historyEntry, ...prev]);
          setSyncProgress(((i + 1) / enabledConfigs.length) * 100);

          // Update last sync timestamp
          updateTableConfig(config.tableName, {
            lastSyncTimestamp: new Date(),
          });
        }
      }

      toast({ title: "Sync hoàn tất", description: `Đã đồng bộ ${enabledConfigs.length} bảng` });
    } catch {
      toast({ title: "Lỗi", description: "Sync thất bại", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear history
  const clearHistory = () => {
    setSyncHistory([]);
    toast({ title: "Đã xóa", description: "Lịch sử đồng bộ đã được xóa" });
  };

  // Export history
  const exportHistory = () => {
    const data = JSON.stringify(syncHistory, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sync-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Đã xuất", description: "File lịch sử đã được tải xuống" });
  };

  // Get status badge
  const getStatusBadge = (status: SyncHistory["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Một phần</Badge>;
    }
  };

  // Calculate totals
  const totalStats = useMemo(() => {
    const stats = { new: 0, updated: 0, deleted: 0, unchanged: 0 };
    changeStats.forEach(s => {
      stats.new += s.newRecords;
      stats.updated += s.updatedRecords;
      stats.deleted += s.deletedRecords;
      stats.unchanged += s.unchangedRecords;
    });
    return stats;
  }, [changeStats]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="changes">
              <Eye className="h-4 w-4 mr-2" />
              Thay đổi
              {changeStats.size > 0 && (
                <Badge variant="secondary" className="ml-2">{changeStats.size}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tiến trình
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Lịch sử
              {syncHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">{syncHistory.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={detectAllChanges} disabled={isDetecting || tableConfigs.length === 0}>
              {isDetecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Phát hiện thay đổi
            </Button>
            <Button onClick={runSync} disabled={isSyncing || tableConfigs.filter(c => c.enabled).length === 0}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang đồng bộ...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Chạy Sync
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="grid grid-cols-[300px_1fr] gap-4">
            {/* Table List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chọn bảng</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {tables.map((table) => {
                      const config = tableConfigs.find(c => c.tableName === table.name);
                      const stats = changeStats.get(table.name);
                      return (
                        <div
                          key={table.name}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedTable === table.name ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            setSelectedTable(table.name);
                            initializeTableConfig(table.name);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{table.name}</span>
                            </div>
                            {config && (
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) => {
                                  updateTableConfig(table.name, { enabled: checked });
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                          {stats && (
                            <div className="flex gap-2 mt-2 text-xs">
                              <span className="text-green-600">+{stats.newRecords}</span>
                              <span className="text-yellow-600">~{stats.updatedRecords}</span>
                              <span className="text-red-600">-{stats.deletedRecords}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Config Panel */}
            {currentConfig ? (
              <div className="space-y-4">
                {/* Change Detection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Phương thức phát hiện thay đổi</CardTitle>
                    <CardDescription>Chọn cách xác định records đã thay đổi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={currentConfig.changeDetection.method}
                      onValueChange={(value) => updateChangeDetection({ method: value as ChangeDetectionConfig["method"] })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="timestamp" id="timestamp" />
                        <Label htmlFor="timestamp" className="flex items-center gap-2 cursor-pointer">
                          <Clock className="h-4 w-4" />
                          Timestamp Column
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hash" id="hash" />
                        <Label htmlFor="hash" className="flex items-center gap-2 cursor-pointer">
                          <Hash className="h-4 w-4" />
                          Hash Comparison
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="version" id="version" />
                        <Label htmlFor="version" className="flex items-center gap-2 cursor-pointer">
                          <FileText className="h-4 w-4" />
                          Version Column
                        </Label>
                      </div>
                    </RadioGroup>

                    {currentConfig.changeDetection.method === "timestamp" && (
                      <div className="space-y-2">
                        <Label>Cột Timestamp</Label>
                        <Select
                          value={currentConfig.changeDetection.timestampColumn || ""}
                          onValueChange={(value) => updateChangeDetection({ timestampColumn: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cột" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentTableColumns
                              .filter(c => c.type.toLowerCase().includes("date") || c.type.toLowerCase().includes("time"))
                              .map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name} ({col.type})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {currentConfig.changeDetection.method === "hash" && (
                      <div className="space-y-2">
                        <Label>Cột để tính Hash (chọn nhiều)</Label>
                        <div className="flex flex-wrap gap-2">
                          {currentTableColumns.map((col) => (
                            <Badge
                              key={col.name}
                              variant={currentConfig.changeDetection.hashColumns?.includes(col.name) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = currentConfig.changeDetection.hashColumns || [];
                                const updated = current.includes(col.name)
                                  ? current.filter(c => c !== col.name)
                                  : [...current, col.name];
                                updateChangeDetection({ hashColumns: updated });
                              }}
                            >
                              {col.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentConfig.changeDetection.method === "version" && (
                      <div className="space-y-2">
                        <Label>Cột Version</Label>
                        <Select
                          value={currentConfig.changeDetection.versionColumn || ""}
                          onValueChange={(value) => updateChangeDetection({ versionColumn: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cột" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentTableColumns
                              .filter(c => c.type.toLowerCase().includes("int") || c.type.toLowerCase().includes("number"))
                              .map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name} ({col.type})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sync Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Chế độ đồng bộ</CardTitle>
                    <CardDescription>Chọn loại thay đổi cần đồng bộ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-green-500" />
                        <Label>Insert records mới</Label>
                      </div>
                      <Switch
                        checked={currentConfig.syncMode.insertNew}
                        onCheckedChange={(checked) => updateSyncMode({ insertNew: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-yellow-500" />
                        <Label>Update records đã thay đổi</Label>
                      </div>
                      <Switch
                        checked={currentConfig.syncMode.updateExisting}
                        onCheckedChange={(checked) => updateSyncMode({ updateExisting: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MinusCircle className="h-4 w-4 text-red-500" />
                        <Label>Delete records đã xóa</Label>
                      </div>
                      <Switch
                        checked={currentConfig.syncMode.deleteRemoved}
                        onCheckedChange={(checked) => updateSyncMode({ deleteRemoved: checked })}
                      />
                    </div>
                    {currentConfig.syncMode.deleteRemoved && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Soft Delete (đánh dấu thay vì xóa)</Label>
                          <Switch
                            checked={currentConfig.syncMode.softDelete}
                            onCheckedChange={(checked) => updateSyncMode({ softDelete: checked })}
                          />
                        </div>
                        {currentConfig.syncMode.softDelete && (
                          <div className="space-y-2">
                            <Label>Cột Soft Delete</Label>
                            <Input
                              value={currentConfig.syncMode.softDeleteColumn || ""}
                              onChange={(e) => updateSyncMode({ softDeleteColumn: e.target.value })}
                              placeholder="deleted_at, is_deleted, ..."
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Last Sync Info */}
                {currentConfig.lastSyncTimestamp && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Lần sync cuối:</span>
                        </div>
                        <span className="font-medium">
                          {currentConfig.lastSyncTimestamp.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detect Button */}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => detectChanges(selectedTable)}
                  disabled={isDetecting}
                >
                  {isDetecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Phát hiện thay đổi cho bảng này
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chọn bảng để cấu hình</h3>
                  <p className="text-muted-foreground">
                    Click vào bảng bên trái để thiết lập cấu hình đồng bộ
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Changes Tab */}
        <TabsContent value="changes" className="mt-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6 text-center">
                <PlusCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <div className="text-3xl font-bold text-green-600">{totalStats.new.toLocaleString()}</div>
                <div className="text-sm text-green-600">Records mới</div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="pt-6 text-center">
                <ArrowUpCircle className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                <div className="text-3xl font-bold text-yellow-600">{totalStats.updated.toLocaleString()}</div>
                <div className="text-sm text-yellow-600">Records cập nhật</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6 text-center">
                <MinusCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <div className="text-3xl font-bold text-red-600">{totalStats.deleted.toLocaleString()}</div>
                <div className="text-sm text-red-600">Records xóa</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <div className="text-3xl font-bold">{totalStats.unchanged.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Không đổi</div>
              </CardContent>
            </Card>
          </div>

          {/* Per-table changes */}
          {changeStats.size > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết thay đổi theo bảng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bảng</TableHead>
                      <TableHead className="text-right text-green-600">Mới</TableHead>
                      <TableHead className="text-right text-yellow-600">Cập nhật</TableHead>
                      <TableHead className="text-right text-red-600">Xóa</TableHead>
                      <TableHead className="text-right">Không đổi</TableHead>
                      <TableHead className="text-right">Tổng nguồn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(changeStats.entries()).map(([tableName, stats]) => (
                      <TableRow key={tableName}>
                        <TableCell className="font-mono">{tableName}</TableCell>
                        <TableCell className="text-right text-green-600">+{stats.newRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-yellow-600">~{stats.updatedRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">-{stats.deletedRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{stats.unchangedRecords.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{stats.totalSource.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu thay đổi</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Phát hiện thay đổi" để quét các bảng đã cấu hình
                </p>
                <Button onClick={detectAllChanges} disabled={isDetecting || tableConfigs.length === 0}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Phát hiện thay đổi
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tiến trình đồng bộ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Tổng tiến trình</span>
                <span className="text-2xl font-bold">{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="h-4" />
              
              {isSyncing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang đồng bộ...</span>
                </div>
              )}

              {!isSyncing && syncProgress === 100 && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Đồng bộ hoàn tất!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={exportHistory} disabled={syncHistory.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Xuất lịch sử
            </Button>
            <Button variant="outline" onClick={clearHistory} disabled={syncHistory.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa lịch sử
            </Button>
          </div>

          {syncHistory.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Bảng</TableHead>
                      <TableHead className="text-right">Mới</TableHead>
                      <TableHead className="text-right">Cập nhật</TableHead>
                      <TableHead className="text-right">Xóa</TableHead>
                      <TableHead className="text-right">Thời lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.timestamp.toLocaleString("vi-VN")}</TableCell>
                        <TableCell className="font-mono">{entry.tableName}</TableCell>
                        <TableCell className="text-right text-green-600">+{entry.stats.newRecords}</TableCell>
                        <TableCell className="text-right text-yellow-600">~{entry.stats.updatedRecords}</TableCell>
                        <TableCell className="text-right text-red-600">-{entry.stats.deletedRecords}</TableCell>
                        <TableCell className="text-right">{(entry.duration / 1000).toFixed(1)}s</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có lịch sử đồng bộ</h3>
                <p className="text-muted-foreground">
                  Lịch sử sẽ hiển thị sau khi bạn chạy sync
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
