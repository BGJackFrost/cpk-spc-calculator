import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Rocket, RotateCcw, Archive, RefreshCw, Plus, History, TrendingUp, CheckCircle2 } from "lucide-react";

export default function ModelVersioningPage() {
  const { toast } = useToast();
  const [selectedModelId, setSelectedModelId] = useState<number>(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRollbackOpen, setIsRollbackOpen] = useState(false);
  const [rollbackData, setRollbackData] = useState({ toVersionId: "", reason: "" });
  const [formData, setFormData] = useState({
    accuracy: "", precision: "", recall: "", f1Score: "",
    meanAbsoluteError: "", rootMeanSquaredError: "",
    trainingDataSize: "", validationDataSize: "", changeLog: "",
  });

  const { data: versions, refetch: refetchVersions, isLoading } = trpc.aiAdvanced.modelVersion.list.useQuery({ modelId: selectedModelId, includeRetired: true, limit: 50 });
  const { data: activeVersion } = trpc.aiAdvanced.modelVersion.getActive.useQuery({ modelId: selectedModelId });
  const { data: rollbackHistory } = trpc.aiAdvanced.modelVersion.getRollbackHistory.useQuery({ modelId: selectedModelId, limit: 20 });
  const { data: performanceTrend } = trpc.aiAdvanced.modelVersion.getPerformanceTrend.useQuery({ modelId: selectedModelId, metric: "accuracy" });

  const createVersion = trpc.aiAdvanced.modelVersion.create.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã tạo version mới" }); setIsCreateOpen(false); refetchVersions(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });
  const deployVersion = trpc.aiAdvanced.modelVersion.deploy.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã deploy version" }); refetchVersions(); } });
  const rollbackVersion = trpc.aiAdvanced.modelVersion.rollback.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã rollback thành công" }); setIsRollbackOpen(false); refetchVersions(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });
  const retireVersion = trpc.aiAdvanced.modelVersion.retire.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã retire version" }); refetchVersions(); } });
  const restoreVersion = trpc.aiAdvanced.modelVersion.restore.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã restore version" }); refetchVersions(); } });

  const handleCreate = () => {
    createVersion.mutate({
      modelId: selectedModelId,
      accuracy: formData.accuracy ? parseFloat(formData.accuracy) : undefined,
      precision: formData.precision ? parseFloat(formData.precision) : undefined,
      recall: formData.recall ? parseFloat(formData.recall) : undefined,
      f1Score: formData.f1Score ? parseFloat(formData.f1Score) : undefined,
      meanAbsoluteError: formData.meanAbsoluteError ? parseFloat(formData.meanAbsoluteError) : undefined,
      rootMeanSquaredError: formData.rootMeanSquaredError ? parseFloat(formData.rootMeanSquaredError) : undefined,
      trainingDataSize: formData.trainingDataSize ? parseInt(formData.trainingDataSize) : undefined,
      validationDataSize: formData.validationDataSize ? parseInt(formData.validationDataSize) : undefined,
      changeLog: formData.changeLog || undefined,
    });
  };

  const handleRollback = () => {
    if (!rollbackData.toVersionId || !rollbackData.reason) {
      toast({ title: "Lỗi", description: "Vui lòng chọn version và nhập lý do", variant: "destructive" }); return;
    }
    rollbackVersion.mutate({ modelId: selectedModelId, toVersionId: parseInt(rollbackData.toVersionId), reason: rollbackData.reason, rollbackType: "manual" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><GitBranch className="w-8 h-8 text-blue-500" />Model Versioning</h1>
            <p className="text-muted-foreground mt-1">Quản lý phiên bản model với khả năng rollback</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedModelId)} onValueChange={(v) => setSelectedModelId(parseInt(v))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Chọn Model" /></SelectTrigger>
              <SelectContent><SelectItem value="1">Model #1</SelectItem><SelectItem value="2">Model #2</SelectItem><SelectItem value="3">Model #3</SelectItem></SelectContent>
            </Select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild><Button className="flex items-center gap-2"><Plus className="w-4 h-4" />Tạo Version</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Tạo Version mới</DialogTitle><DialogDescription>Thêm phiên bản mới cho model #{selectedModelId}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Accuracy</Label><Input type="number" step="0.0001" value={formData.accuracy} onChange={(e) => setFormData({ ...formData, accuracy: e.target.value })} placeholder="0.95" /></div>
                    <div className="grid gap-2"><Label>Precision</Label><Input type="number" step="0.0001" value={formData.precision} onChange={(e) => setFormData({ ...formData, precision: e.target.value })} placeholder="0.92" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Recall</Label><Input type="number" step="0.0001" value={formData.recall} onChange={(e) => setFormData({ ...formData, recall: e.target.value })} placeholder="0.88" /></div>
                    <div className="grid gap-2"><Label>F1 Score</Label><Input type="number" step="0.0001" value={formData.f1Score} onChange={(e) => setFormData({ ...formData, f1Score: e.target.value })} placeholder="0.90" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>MAE</Label><Input type="number" step="0.0001" value={formData.meanAbsoluteError} onChange={(e) => setFormData({ ...formData, meanAbsoluteError: e.target.value })} placeholder="0.05" /></div>
                    <div className="grid gap-2"><Label>RMSE</Label><Input type="number" step="0.0001" value={formData.rootMeanSquaredError} onChange={(e) => setFormData({ ...formData, rootMeanSquaredError: e.target.value })} placeholder="0.08" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Training Data Size</Label><Input type="number" value={formData.trainingDataSize} onChange={(e) => setFormData({ ...formData, trainingDataSize: e.target.value })} placeholder="10000" /></div>
                    <div className="grid gap-2"><Label>Validation Data Size</Label><Input type="number" value={formData.validationDataSize} onChange={(e) => setFormData({ ...formData, validationDataSize: e.target.value })} placeholder="2000" /></div>
                  </div>
                  <div className="grid gap-2"><Label>Change Log</Label><Textarea value={formData.changeLog} onChange={(e) => setFormData({ ...formData, changeLog: e.target.value })} placeholder="Mô tả các thay đổi trong version này..." /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button><Button onClick={handleCreate} disabled={createVersion.isPending}>{createVersion.isPending ? "Đang tạo..." : "Tạo Version"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isRollbackOpen} onOpenChange={setIsRollbackOpen}>
              <DialogTrigger asChild><Button variant="outline" className="flex items-center gap-2"><RotateCcw className="w-4 h-4" />Rollback</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Rollback Model</DialogTitle><DialogDescription>Quay về phiên bản trước đó</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label>Chọn Version</Label><Select value={rollbackData.toVersionId} onValueChange={(v) => setRollbackData({ ...rollbackData, toVersionId: v })}><SelectTrigger><SelectValue placeholder="Chọn version để rollback" /></SelectTrigger><SelectContent>{versions?.versions?.filter(v => v.isRollbackTarget && !v.isActive).map(v => (<SelectItem key={v.id} value={String(v.id)}>{v.version} - Accuracy: {v.accuracy ? (parseFloat(v.accuracy as string) * 100).toFixed(2) : '-'}%</SelectItem>))}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label>Lý do rollback</Label><Textarea value={rollbackData.reason} onChange={(e) => setRollbackData({ ...rollbackData, reason: e.target.value })} placeholder="Nhập lý do rollback..." /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsRollbackOpen(false)}>Hủy</Button><Button onClick={handleRollback} disabled={rollbackVersion.isPending} variant="destructive">{rollbackVersion.isPending ? "Đang rollback..." : "Rollback"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tổng Versions</CardTitle><GitBranch className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{versions?.total || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Version Active</CardTitle><CheckCircle2 className="w-4 h-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">{activeVersion?.version || '-'}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Accuracy Hiện tại</CardTitle><TrendingUp className="w-4 h-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-500">{activeVersion?.accuracy ? `${(parseFloat(activeVersion.accuracy as string) * 100).toFixed(2)}%` : '-'}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Rollbacks</CardTitle><History className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{rollbackHistory?.total || 0}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList><TabsTrigger value="versions">Danh sách Versions</TabsTrigger><TabsTrigger value="history">Lịch sử Rollback</TabsTrigger><TabsTrigger value="trend">Performance Trend</TabsTrigger></TabsList>
          <TabsContent value="versions" className="space-y-4">
            <div className="flex items-center gap-4"><Button variant="outline" size="icon" onClick={() => refetchVersions()}><RefreshCw className="w-4 h-4" /></Button></div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Accuracy</TableHead><TableHead>F1 Score</TableHead><TableHead>MAE</TableHead><TableHead>Trạng thái</TableHead><TableHead>Deployed</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
                  : versions?.versions?.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa có version nào</TableCell></TableRow>
                  : versions?.versions?.map((v) => (
                    <TableRow key={v.id} className={v.isActive ? "bg-green-500/10" : ""}>
                      <TableCell><div className="font-medium">{v.version}</div></TableCell>
                      <TableCell>{v.accuracy ? `${(parseFloat(v.accuracy as string) * 100).toFixed(2)}%` : '-'}</TableCell>
                      <TableCell>{v.f1Score ? parseFloat(v.f1Score as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{v.meanAbsoluteError ? parseFloat(v.meanAbsoluteError as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{v.isActive ? <Badge className="bg-green-500">Active</Badge> : v.isRollbackTarget ? <Badge variant="outline">Available</Badge> : <Badge variant="secondary">Retired</Badge>}</TableCell>
                      <TableCell>{v.deployedAt ? new Date(v.deployedAt).toLocaleDateString('vi-VN') : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!v.isActive && v.isRollbackTarget && <Button variant="ghost" size="icon" onClick={() => deployVersion.mutate({ versionId: v.id })}><Rocket className="w-4 h-4 text-blue-500" /></Button>}
                          {!v.isActive && v.isRollbackTarget && <Button variant="ghost" size="icon" onClick={() => retireVersion.mutate({ versionId: v.id })}><Archive className="w-4 h-4 text-orange-500" /></Button>}
                          {!v.isRollbackTarget && <Button variant="ghost" size="icon" onClick={() => restoreVersion.mutate({ versionId: v.id })}><RefreshCw className="w-4 h-4 text-green-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Từ Version</TableHead><TableHead>Đến Version</TableHead><TableHead>Loại</TableHead><TableHead>Lý do</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rollbackHistory?.history?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có lịch sử rollback</TableCell></TableRow>
                  : rollbackHistory?.history?.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{h.fromVersionId || '-'}</TableCell>
                      <TableCell>{h.toVersionId}</TableCell>
                      <TableCell><Badge variant={h.rollbackType === 'automatic' ? 'destructive' : 'outline'}>{h.rollbackType === 'automatic' ? 'Tự động' : 'Thủ công'}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{h.reason}</TableCell>
                      <TableCell>{h.status === 'completed' ? <Badge className="bg-green-500">Hoàn thành</Badge> : h.status === 'failed' ? <Badge variant="destructive">Thất bại</Badge> : <Badge variant="secondary">{h.status}</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="trend" className="space-y-4">
            <Card><CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader><CardContent>
              {performanceTrend?.length === 0 ? <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu trend</div>
              : <div className="space-y-4">{performanceTrend?.map((t, i) => (<div key={i} className="flex items-center gap-4"><div className="w-20 text-sm font-medium">{t.version}</div><div className="flex-1 h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(t.value || 0) * 100}%` }} /></div><div className="w-16 text-sm text-right">{((t.value || 0) * 100).toFixed(2)}%</div></div>))}</div>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
