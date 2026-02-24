import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  FlaskConical, Play, Pause, CheckCircle2, XCircle, Trophy,
  BarChart3, Clock, Plus, RefreshCw, Eye, TrendingUp, Target, Activity
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, ComposedChart, Area
} from "recharts";

export default function ABTestingManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "", description: "", modelAId: "", modelBId: "",
    trafficSplitA: 50, trafficSplitB: 50, minSampleSize: 1000, confidenceLevel: 0.95,
  });

  const { data: tests, refetch: refetchTests, isLoading } = trpc.aiAdvanced.abTest.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as any, limit: 50,
  });
  const { data: runningTests } = trpc.aiAdvanced.abTest.getRunning.useQuery();
  const { data: testStats } = trpc.aiAdvanced.abTest.getStats.useQuery(
    { testId: selectedTest! }, { enabled: !!selectedTest }
  );
  const { data: comparison } = trpc.aiAdvanced.abTest.compare.useQuery(
    { testId: selectedTest! }, { enabled: !!selectedTest }
  );

  const createTest = trpc.aiAdvanced.abTest.create.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã tạo A/B test mới" }); setIsCreateOpen(false); refetchTests(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });
  const startTest = trpc.aiAdvanced.abTest.start.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã bắt đầu A/B test" }); refetchTests(); } });
  const pauseTest = trpc.aiAdvanced.abTest.pause.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã tạm dừng A/B test" }); refetchTests(); } });
  const completeTest = trpc.aiAdvanced.abTest.complete.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã hoàn thành A/B test" }); refetchTests(); } });
  const cancelTest = trpc.aiAdvanced.abTest.cancel.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã hủy A/B test" }); refetchTests(); } });

  const handleCreate = () => {
    if (!formData.name || !formData.modelAId || !formData.modelBId) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin", variant: "destructive" }); return;
    }
    createTest.mutate({ ...formData, modelAId: parseInt(formData.modelAId), modelBId: parseInt(formData.modelBId) });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: "bg-gray-500", icon: <Clock className="w-3 h-3" /> },
      running: { color: "bg-green-500", icon: <Play className="w-3 h-3" /> },
      paused: { color: "bg-yellow-500", icon: <Pause className="w-3 h-3" /> },
      completed: { color: "bg-blue-500", icon: <CheckCircle2 className="w-3 h-3" /> },
      cancelled: { color: "bg-red-500", icon: <XCircle className="w-3 h-3" /> },
    };
    const v = variants[status] || variants.draft;
    return <Badge className={`${v.color} text-white flex items-center gap-1`}>{v.icon}{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  // Prepare chart data for comparison
  const comparisonBarData = testStats ? [
    { metric: 'Accuracy', modelA: (parseFloat(testStats.modelA?.accuracy || '0') * 100), modelB: (parseFloat(testStats.modelB?.accuracy || '0') * 100) },
    { metric: 'Precision', modelA: (parseFloat(testStats.modelA?.precision || '0') * 100), modelB: (parseFloat(testStats.modelB?.precision || '0') * 100) },
    { metric: 'Recall', modelA: (parseFloat(testStats.modelA?.recall || '0') * 100), modelB: (parseFloat(testStats.modelB?.recall || '0') * 100) },
    { metric: 'F1 Score', modelA: (parseFloat(testStats.modelA?.f1Score || '0') * 100), modelB: (parseFloat(testStats.modelB?.f1Score || '0') * 100) },
  ] : [];

  // Radar chart data
  const radarData = testStats ? [
    { subject: 'Accuracy', A: parseFloat(testStats.modelA?.accuracy || '0') * 100, B: parseFloat(testStats.modelB?.accuracy || '0') * 100, fullMark: 100 },
    { subject: 'Precision', A: parseFloat(testStats.modelA?.precision || '0') * 100, B: parseFloat(testStats.modelB?.precision || '0') * 100, fullMark: 100 },
    { subject: 'Recall', A: parseFloat(testStats.modelA?.recall || '0') * 100, B: parseFloat(testStats.modelB?.recall || '0') * 100, fullMark: 100 },
    { subject: 'F1 Score', A: parseFloat(testStats.modelA?.f1Score || '0') * 100, B: parseFloat(testStats.modelB?.f1Score || '0') * 100, fullMark: 100 },
    { subject: 'Speed', A: Math.max(0, 100 - (parseFloat(testStats.modelA?.avgResponseTimeMs || '0') / 10)), B: Math.max(0, 100 - (parseFloat(testStats.modelB?.avgResponseTimeMs || '0') / 10)), fullMark: 100 },
  ] : [];

  // Sample size progress data
  const sampleProgress = testStats ? {
    modelA: testStats.modelA?.totalPredictions || 0,
    modelB: testStats.modelB?.totalPredictions || 0,
    target: 1000, // Default min sample size
  } : { modelA: 0, modelB: 0, target: 1000 };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><FlaskConical className="w-8 h-8 text-purple-500" />A/B Testing Management</h1>
            <p className="text-muted-foreground mt-1">So sánh hiệu quả giữa các model versions trong production</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button className="flex items-center gap-2"><Plus className="w-4 h-4" />Tạo A/B Test</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Tạo A/B Test mới</DialogTitle><DialogDescription>Thiết lập thử nghiệm để so sánh hiệu suất giữa hai model</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Tên test</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Test CPK Prediction Model v2 vs v3" /></div>
                <div className="grid gap-2"><Label>Mô tả</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả mục đích và giả thuyết của test..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Model A (Control)</Label><Input type="number" value={formData.modelAId} onChange={(e) => setFormData({ ...formData, modelAId: e.target.value })} placeholder="Model ID" /></div>
                  <div className="grid gap-2"><Label>Model B (Variant)</Label><Input type="number" value={formData.modelBId} onChange={(e) => setFormData({ ...formData, modelBId: e.target.value })} placeholder="Model ID" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Traffic Split A (%)</Label><Input type="number" min={0} max={100} value={formData.trafficSplitA} onChange={(e) => { const val = parseInt(e.target.value); setFormData({ ...formData, trafficSplitA: val, trafficSplitB: 100 - val }); }} /></div>
                  <div className="grid gap-2"><Label>Traffic Split B (%)</Label><Input type="number" min={0} max={100} value={formData.trafficSplitB} disabled /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Min Sample Size</Label><Input type="number" value={formData.minSampleSize} onChange={(e) => setFormData({ ...formData, minSampleSize: parseInt(e.target.value) })} /></div>
                  <div className="grid gap-2"><Label>Confidence Level</Label><Select value={String(formData.confidenceLevel)} onValueChange={(v) => setFormData({ ...formData, confidenceLevel: parseFloat(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.90">90%</SelectItem><SelectItem value="0.95">95%</SelectItem><SelectItem value="0.99">99%</SelectItem></SelectContent></Select></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button><Button onClick={handleCreate} disabled={createTest.isPending}>{createTest.isPending ? "Đang tạo..." : "Tạo Test"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tổng số Tests</CardTitle><FlaskConical className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{tests?.total || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Đang chạy</CardTitle><Play className="w-4 h-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">{runningTests?.length || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Hoàn thành</CardTitle><CheckCircle2 className="w-4 h-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-500">{tests?.tests?.filter(t => t.status === 'completed').length || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Có kết quả</CardTitle><Trophy className="w-4 h-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-500">{tests?.tests?.filter(t => t.winnerId).length || 0}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList><TabsTrigger value="list">Danh sách Tests</TabsTrigger><TabsTrigger value="details" disabled={!selectedTest}>Chi tiết Test</TabsTrigger><TabsTrigger value="charts" disabled={!selectedTest}>Biểu đồ So sánh</TabsTrigger></TabsList>
          
          {/* List Tab */}
          <TabsContent value="list" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Lọc theo trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="running">Đang chạy</SelectItem><SelectItem value="paused">Tạm dừng</SelectItem><SelectItem value="completed">Hoàn thành</SelectItem><SelectItem value="cancelled">Đã hủy</SelectItem></SelectContent></Select>
              <Button variant="outline" size="icon" onClick={() => refetchTests()}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Tên Test</TableHead><TableHead>Models</TableHead><TableHead>Traffic Split</TableHead><TableHead>Trạng thái</TableHead><TableHead>Kết quả</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
                  : tests?.tests?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có A/B test nào</TableCell></TableRow>
                  : tests?.tests?.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell><div><div className="font-medium">{test.name}</div><div className="text-sm text-muted-foreground truncate max-w-[200px]">{test.description}</div></div></TableCell>
                      <TableCell><div className="text-sm"><div>A: Model #{test.modelAId}</div><div>B: Model #{test.modelBId}</div></div></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={test.trafficSplitA} className="w-20" /><span className="text-sm">{test.trafficSplitA}/{test.trafficSplitB}</span></div></TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>{test.winnerId ? <Badge variant="outline" className="flex items-center gap-1 w-fit"><Trophy className="w-3 h-3 text-yellow-500" />Model {test.winnerId === test.modelAId ? 'A' : 'B'}</Badge> : test.isSignificant ? <Badge variant="outline">Có ý nghĩa</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedTest(test.id)}><Eye className="w-4 h-4" /></Button>
                          {test.status === 'draft' && <Button variant="ghost" size="icon" onClick={() => startTest.mutate({ testId: test.id })}><Play className="w-4 h-4 text-green-500" /></Button>}
                          {test.status === 'running' && <Button variant="ghost" size="icon" onClick={() => pauseTest.mutate({ testId: test.id })}><Pause className="w-4 h-4 text-yellow-500" /></Button>}
                          {test.status === 'paused' && <><Button variant="ghost" size="icon" onClick={() => startTest.mutate({ testId: test.id })}><Play className="w-4 h-4 text-green-500" /></Button><Button variant="ghost" size="icon" onClick={() => completeTest.mutate({ testId: test.id })}><CheckCircle2 className="w-4 h-4 text-blue-500" /></Button></>}
                          {(test.status === 'draft' || test.status === 'running' || test.status === 'paused') && <Button variant="ghost" size="icon" onClick={() => cancelTest.mutate({ testId: test.id })}><XCircle className="w-4 h-4 text-red-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {selectedTest && testStats && (
              <>
                {/* Sample Size Progress */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" />Tiến độ thu thập mẫu</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Model A: {sampleProgress.modelA} / {sampleProgress.target}</span>
                          <span>{Math.min(100, (sampleProgress.modelA / sampleProgress.target * 100)).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(100, sampleProgress.modelA / sampleProgress.target * 100)} className="h-3" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Model B: {sampleProgress.modelB} / {sampleProgress.target}</span>
                          <span>{Math.min(100, (sampleProgress.modelB / sampleProgress.target * 100)).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(100, sampleProgress.modelB / sampleProgress.target * 100)} className="h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Model Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-blue-500/50"><CardHeader><CardTitle className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" />Model A (Control)</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><div className="text-sm text-muted-foreground">Predictions</div><div className="text-2xl font-bold">{testStats.modelA?.totalPredictions || 0}</div></div><div><div className="text-sm text-muted-foreground">Accuracy</div><div className="text-2xl font-bold">{testStats.modelA?.accuracy ? `${(parseFloat(testStats.modelA.accuracy) * 100).toFixed(2)}%` : '-'}</div></div><div><div className="text-sm text-muted-foreground">MAE</div><div className="text-lg font-medium">{testStats.modelA?.meanAbsoluteError ? parseFloat(testStats.modelA.meanAbsoluteError).toFixed(4) : '-'}</div></div><div><div className="text-sm text-muted-foreground">Avg Response</div><div className="text-lg font-medium">{testStats.modelA?.avgResponseTimeMs ? `${parseFloat(testStats.modelA.avgResponseTimeMs).toFixed(0)}ms` : '-'}</div></div></div></CardContent></Card>
                  <Card className="border-purple-500/50"><CardHeader><CardTitle className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" />Model B (Variant)</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><div className="text-sm text-muted-foreground">Predictions</div><div className="text-2xl font-bold">{testStats.modelB?.totalPredictions || 0}</div></div><div><div className="text-sm text-muted-foreground">Accuracy</div><div className="text-2xl font-bold">{testStats.modelB?.accuracy ? `${(parseFloat(testStats.modelB.accuracy) * 100).toFixed(2)}%` : '-'}</div></div><div><div className="text-sm text-muted-foreground">MAE</div><div className="text-lg font-medium">{testStats.modelB?.meanAbsoluteError ? parseFloat(testStats.modelB.meanAbsoluteError).toFixed(4) : '-'}</div></div><div><div className="text-sm text-muted-foreground">Avg Response</div><div className="text-lg font-medium">{testStats.modelB?.avgResponseTimeMs ? `${parseFloat(testStats.modelB.avgResponseTimeMs).toFixed(0)}ms` : '-'}</div></div></div></CardContent></Card>
                </div>

                {/* Statistical Analysis */}
                {comparison && (
                  <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Phân tích thống kê</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-6"><div><div className="text-sm text-muted-foreground">Accuracy Difference</div><div className={`text-2xl font-bold ${comparison.accuracyDiff > 0 ? 'text-green-500' : comparison.accuracyDiff < 0 ? 'text-red-500' : ''}`}>{comparison.accuracyDiff > 0 ? '+' : ''}{(comparison.accuracyDiff * 100).toFixed(2)}%</div><div className="text-sm text-muted-foreground">{comparison.accuracyDiff > 0 ? 'Model B tốt hơn' : comparison.accuracyDiff < 0 ? 'Model A tốt hơn' : 'Tương đương'}</div></div><div><div className="text-sm text-muted-foreground">P-Value</div><div className="text-2xl font-bold">{comparison.pValue?.toFixed(6) || '-'}</div><div className="text-sm text-muted-foreground">{comparison.isSignificant ? 'Có ý nghĩa thống kê' : 'Chưa có ý nghĩa'}</div></div><div><div className="text-sm text-muted-foreground">Kết luận</div>{comparison.winner ? <div className="flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500" /><span className="text-xl font-bold">Model {comparison.winner === 'A' ? 'A' : 'B'} thắng</span></div> : <div className="text-lg text-muted-foreground">Cần thêm dữ liệu</div>}</div></div></CardContent></Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            {selectedTest && testStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar Chart Comparison */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />So sánh Metrics</CardTitle><CardDescription>So sánh các chỉ số giữa Model A và Model B</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis dataKey="metric" type="category" width={80} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <Bar dataKey="modelA" fill="#3b82f6" name="Model A" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="modelB" fill="#8b5cf6" name="Model B" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Radar Chart</CardTitle><CardDescription>So sánh đa chiều giữa hai models</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Model A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Model B" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Accuracy Comparison Over Time (Simulated) */}
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Accuracy Trend</CardTitle><CardDescription>Biến động accuracy theo thời gian (dữ liệu mô phỏng)</CardDescription></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={[
                        { time: 'T1', modelA: 85, modelB: 82 },
                        { time: 'T2', modelA: 86, modelB: 84 },
                        { time: 'T3', modelA: 84, modelB: 85 },
                        { time: 'T4', modelA: 87, modelB: 86 },
                        { time: 'T5', modelA: 86, modelB: 88 },
                        { time: 'T6', modelA: 88, modelB: 89 },
                        { time: 'T7', modelA: 87, modelB: 90 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[75, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <Area type="monotone" dataKey="modelA" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} name="Model A" />
                        <Area type="monotone" dataKey="modelB" fill="#8b5cf6" fillOpacity={0.1} stroke="#8b5cf6" strokeWidth={2} name="Model B" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Winner Summary */}
                {comparison && (
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Kết quả A/B Test</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-8 py-8">
                        <div className={`text-center p-6 rounded-lg border-2 ${comparison.winner === 'A' ? 'border-yellow-500 bg-yellow-500/10' : 'border-muted'}`}>
                          <div className="text-4xl font-bold text-blue-500">A</div>
                          <div className="text-lg font-medium mt-2">Model A</div>
                          <div className="text-2xl font-bold mt-1">{(parseFloat(testStats.modelA?.accuracy || '0') * 100).toFixed(2)}%</div>
                          {comparison.winner === 'A' && <Badge className="mt-2 bg-yellow-500"><Trophy className="w-3 h-3 mr-1" />Winner</Badge>}
                        </div>
                        <div className="text-4xl font-bold text-muted-foreground">VS</div>
                        <div className={`text-center p-6 rounded-lg border-2 ${comparison.winner === 'B' ? 'border-yellow-500 bg-yellow-500/10' : 'border-muted'}`}>
                          <div className="text-4xl font-bold text-purple-500">B</div>
                          <div className="text-lg font-medium mt-2">Model B</div>
                          <div className="text-2xl font-bold mt-1">{(parseFloat(testStats.modelB?.accuracy || '0') * 100).toFixed(2)}%</div>
                          {comparison.winner === 'B' && <Badge className="mt-2 bg-yellow-500"><Trophy className="w-3 h-3 mr-1" />Winner</Badge>}
                        </div>
                      </div>
                      <div className="text-center text-muted-foreground">
                        {comparison.isSignificant 
                          ? `Kết quả có ý nghĩa thống kê với p-value = ${comparison.pValue?.toFixed(6)}`
                          : 'Cần thêm dữ liệu để đạt được kết quả có ý nghĩa thống kê'}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
