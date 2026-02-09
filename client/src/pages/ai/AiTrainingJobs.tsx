import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Cpu, RefreshCw, Plus, Play, Pause, Square, Eye, Trash2, Clock, CheckCircle, AlertTriangle, XCircle, RotateCcw, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";

export default function AiTrainingJobs() {
  const { toast } = useToast();
  
  // Load training jobs from API
  const { data: jobs, isLoading, refetch } = trpc.aiTraining.listJobs.useQuery(undefined, {
    refetchInterval: 5000, // Auto-refresh every 5s for running jobs
  });
  const { data: stats } = trpc.aiTraining.getStats.useQuery();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const { data: selectedJobDetails } = trpc.aiTraining.getJob.useQuery(
    { id: selectedJobId || 0 },
    { enabled: !!selectedJobId, refetchInterval: 2000 }
  );
  const { data: jobHistory } = trpc.aiTraining.getJobHistory.useQuery(
    { jobId: selectedJobId || 0 },
    { enabled: !!selectedJobId, refetchInterval: 2000 }
  );

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const handleViewDetails = (jobId: number) => {
    setSelectedJobId(jobId);
    setIsDetailsOpen(true);
  };

// Mock training jobs data (for display fallback)
// Mock data removed - mockJobsData (data comes from tRPC or is not yet implemented)

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    name: "",
    model: "xgboost",
    epochs: "100",
    batchSize: "32",
    learningRate: "0.001",
  });

  const handleCreateJob = () => {
    toast({ title: "Đã tạo job", description: "Training job mới đã được thêm vào hàng đợi" });
    setIsCreateOpen(false);
    setNewJob({ name: "", model: "xgboost", epochs: "100", batchSize: "32", learningRate: "0.001" });
  };

  const handleStopJob = (id: string) => {
    toast({ title: "Đã dừng job", description: `Job ${id} đã được dừng` });
  };

  const handleRetryJob = (id: string) => {
    toast({ title: "Đang retry", description: `Job ${id} đang được chạy lại` });
  };

  const handleDeleteJob = (id: string) => {
    toast({ title: "Đã xóa", description: `Job ${id} đã được xóa` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running": return <Badge className="bg-blue-500"><Cpu className="w-3 h-3 mr-1 animate-spin" />Đang chạy</Badge>;
      case "completed": return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Hoàn thành</Badge>;
      case "failed": return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Lỗi</Badge>;
      case "queued": return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Đang chờ</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredJobs = mockJobsData.jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Cpu className="w-8 h-8 text-indigo-500" />
              AI Training Jobs
            </h1>
            <p className="text-muted-foreground mt-1">Quản lý các job training model AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Tạo job mới</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo Training Job mới</DialogTitle>
                  <DialogDescription>Cấu hình và khởi chạy training job</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên job</Label>
                    <Input value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })} placeholder="CPK Predictor v2.2" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Model</Label>
                    <Select value={newJob.model} onValueChange={(v) => setNewJob({ ...newJob, model: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xgboost">XGBoost</SelectItem>
                        <SelectItem value="randomforest">Random Forest</SelectItem>
                        <SelectItem value="lstm">LSTM</SelectItem>
                        <SelectItem value="isolationforest">Isolation Forest</SelectItem>
                        <SelectItem value="neuralnet">Neural Network</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Epochs</Label>
                      <Input type="number" value={newJob.epochs} onChange={(e) => setNewJob({ ...newJob, epochs: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Batch Size</Label>
                      <Input type="number" value={newJob.batchSize} onChange={(e) => setNewJob({ ...newJob, batchSize: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Learning Rate</Label>
                      <Input type="number" step="0.0001" value={newJob.learningRate} onChange={(e) => setNewJob({ ...newJob, learningRate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreateJob}><Play className="w-4 h-4 mr-2" />Bắt đầu training</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng Jobs</p>
              <p className="text-3xl font-bold">{mockJobsData.summary.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-700">Đang chạy</p>
              <p className="text-3xl font-bold text-blue-800">{mockJobsData.summary.running}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">Hoàn thành</p>
              <p className="text-3xl font-bold text-green-800">{mockJobsData.summary.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">Lỗi</p>
              <p className="text-3xl font-bold text-red-800">{mockJobsData.summary.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Thời gian TB</p>
              <p className="text-3xl font-bold">{mockJobsData.summary.avgDuration}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="running">Đang chạy</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="failed">Lỗi</SelectItem>
              <SelectItem value="queued">Đang chờ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Training Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-sm">{job.id}</TableCell>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell><Badge variant="outline">{job.model}</Badge></TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={job.progress} className="w-20 h-2" />
                        <span className="text-sm">{job.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.metrics.accuracy ? (
                        <span className="font-medium">{(job.metrics.accuracy * 100).toFixed(1)}%</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{job.duration}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {job.status === "running" && (
                          <Button size="sm" variant="ghost" onClick={() => handleStopJob(job.id)}>
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button size="sm" variant="ghost" onClick={() => handleRetryJob(job.id)}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        {job.status === "completed" && (
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setSelectedJob(job.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteJob(job.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Training Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Training Progress</CardTitle>
            <CardDescription>Loss và Accuracy theo epoch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockJobsData.trainingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="trainLoss" stroke="#ef4444" name="Train Loss" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="valLoss" stroke="#f97316" name="Val Loss" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#22c55e" name="Accuracy" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
