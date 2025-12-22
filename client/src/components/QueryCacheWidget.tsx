import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Database,
  RefreshCw,
  Trash2,
  Clock,
  Zap,
  HardDrive,
  TrendingUp,
  Settings,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function QueryCacheWidget() {
  const [activeTab, setActiveTab] = useState("overview");
  const [invalidateQuery, setInvalidateQuery] = useState("");
  const [invalidatePattern, setInvalidatePattern] = useState("");
  const [evictCount, setEvictCount] = useState(10);
  const [newTTLCategory, setNewTTLCategory] = useState("");
  const [newTTLSeconds, setNewTTLSeconds] = useState(300);
  const [newMaxEntries, setNewMaxEntries] = useState(1000);
  
  // Queries
  const statsQuery = trpc.queryCache.getStats.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  const entriesQuery = trpc.queryCache.getEntries.useQuery({ limit: 50 });
  
  // Mutations
  const clearMutation = trpc.queryCache.clear.useMutation({
    onSuccess: () => {
      toast.success("Cache đã được xóa");
      statsQuery.refetch();
      entriesQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const invalidateQueryMutation = trpc.queryCache.invalidateQuery.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.invalidatedCount} entries`);
      statsQuery.refetch();
      entriesQuery.refetch();
      setInvalidateQuery("");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const invalidatePatternMutation = trpc.queryCache.invalidatePattern.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.invalidatedCount} entries`);
      statsQuery.refetch();
      entriesQuery.refetch();
      setInvalidatePattern("");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const cleanupMutation = trpc.queryCache.cleanup.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã dọn dẹp ${data.cleanedCount} entries hết hạn`);
      statsQuery.refetch();
      entriesQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const evictLRUMutation = trpc.queryCache.evictLRU.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.evictedCount} entries ít sử dụng`);
      statsQuery.refetch();
      entriesQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const setTTLMutation = trpc.queryCache.setTTL.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật TTL");
      setNewTTLCategory("");
      setNewTTLSeconds(300);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const setMaxEntriesMutation = trpc.queryCache.setMaxEntries.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật max entries");
      statsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const stats = statsQuery.data;
  const entries = entriesQuery.data || [];
  
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cache Entries</p>
                  <p className="text-2xl font-bold">{stats.totalEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                  <p className="text-2xl font-bold">{(stats.hitRate * 100).toFixed(1)}%</p>
                </div>
              </div>
              <Progress value={stats.hitRate * 100} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hits / Misses</p>
                  <p className="text-2xl font-bold">
                    <span className="text-green-600">{stats.totalHits}</span>
                    {" / "}
                    <span className="text-red-600">{stats.totalMisses}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <HardDrive className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="text-2xl font-bold">{formatBytes(stats.memoryUsage)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="entries">
            <Database className="h-4 w-4 mr-2" />
            Cache Entries
          </TabsTrigger>
          <TabsTrigger value="management">
            <Settings className="h-4 w-4 mr-2" />
            Quản lý
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categories Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.entriesByCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{category}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{count as number}</span>
                          <Progress 
                            value={(count as number / stats.totalEntries) * 100} 
                            className="w-20 h-2"
                          />
                        </div>
                      </div>
                    ))}
                    {Object.keys(stats.entriesByCategory).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Cache Age Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin Cache</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entry cũ nhất</span>
                      <span className="font-medium">
                        {stats.oldestEntry 
                          ? formatDuration(Date.now() - stats.oldestEntry)
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entry mới nhất</span>
                      <span className="font-medium">
                        {stats.newestEntry 
                          ? formatDuration(Date.now() - stats.newestEntry)
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tổng requests</span>
                      <span className="font-medium">{stats.totalHits + stats.totalMisses}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hiệu quả</span>
                      <Badge className={stats.hitRate > 0.7 ? "bg-green-500" : stats.hitRate > 0.4 ? "bg-yellow-500" : "bg-red-500"}>
                        {stats.hitRate > 0.7 ? "Tốt" : stats.hitRate > 0.4 ? "Trung bình" : "Cần cải thiện"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cache Entries</CardTitle>
                <CardDescription>Danh sách các entries đang được cache</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => entriesQuery.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Hits</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Expires In</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[300px] truncate block">
                          {entry.key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.hits}</Badge>
                      </TableCell>
                      <TableCell>{formatDuration(entry.age)}</TableCell>
                      <TableCell>{formatDuration(entry.expiresIn)}</TableCell>
                      <TableCell>
                        {entry.expiresIn > 0 ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Không có cache entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cache Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Actions</CardTitle>
                <CardDescription>Các thao tác quản lý cache</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="flex-1">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa toàn bộ Cache
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Xác nhận xóa cache</DialogTitle>
                        <DialogDescription>
                          Bạn có chắc muốn xóa toàn bộ cache? Hành động này không thể hoàn tác.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="destructive" onClick={() => clearMutation.mutate()}>
                          Xóa toàn bộ
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => cleanupMutation.mutate()}
                    disabled={cleanupMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Dọn dẹp hết hạn
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Xóa entries ít sử dụng (LRU)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      min={1}
                      max={100}
                      value={evictCount}
                      onChange={(e) => setEvictCount(parseInt(e.target.value) || 10)}
                      className="w-24"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => evictLRUMutation.mutate({ count: evictCount })}
                      disabled={evictLRUMutation.isPending}
                    >
                      Evict LRU
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Invalidation */}
            <Card>
              <CardHeader>
                <CardTitle>Invalidation</CardTitle>
                <CardDescription>Xóa cache theo query hoặc pattern</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invalidate theo Query ID</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="VD: statistics, analytics..."
                      value={invalidateQuery}
                      onChange={(e) => setInvalidateQuery(e.target.value)}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => invalidateQueryMutation.mutate({ queryId: invalidateQuery })}
                      disabled={!invalidateQuery || invalidateQueryMutation.isPending}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Invalidate theo Pattern (Regex)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="VD: license.*, user_.*"
                      value={invalidatePattern}
                      onChange={(e) => setInvalidatePattern(e.target.value)}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => invalidatePatternMutation.mutate({ pattern: invalidatePattern })}
                      disabled={!invalidatePattern || invalidatePatternMutation.isPending}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình</CardTitle>
                <CardDescription>Thiết lập TTL và giới hạn cache</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Thiết lập TTL cho Category</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Category"
                      value={newTTLCategory}
                      onChange={(e) => setNewTTLCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Input 
                      type="number"
                      placeholder="Seconds"
                      value={newTTLSeconds}
                      onChange={(e) => setNewTTLSeconds(parseInt(e.target.value) || 300)}
                      className="w-24"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => setTTLMutation.mutate({ 
                        category: newTTLCategory, 
                        ttlSeconds: newTTLSeconds 
                      })}
                      disabled={!newTTLCategory || setTTLMutation.isPending}
                    >
                      Set
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Max Entries</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number"
                      min={100}
                      max={10000}
                      value={newMaxEntries}
                      onChange={(e) => setNewMaxEntries(parseInt(e.target.value) || 1000)}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => setMaxEntriesMutation.mutate({ maxEntries: newMaxEntries })}
                      disabled={setMaxEntriesMutation.isPending}
                    >
                      Cập nhật
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* TTL Reference */}
            <Card>
              <CardHeader>
                <CardTitle>TTL Reference</CardTitle>
                <CardDescription>Các TTL mặc định theo category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>statistics, analytics, dashboard</span>
                    <Badge variant="outline">10 phút</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>list, search</span>
                    <Badge variant="outline">2 phút</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>count, sum, avg</span>
                    <Badge variant="outline">5 phút</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>realtime, pool, performance</span>
                    <Badge variant="outline">30 giây</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>config, settings</span>
                    <Badge variant="outline">15 phút</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>user, auth</span>
                    <Badge variant="outline">1 phút</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
