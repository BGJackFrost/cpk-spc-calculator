import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, Play, Pause, StopCircle, RefreshCw, Database, 
  Brain, CheckCircle, AlertCircle, Loader2, FileText, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function ModelTraining() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateJobDialogOpen, setIsCreateJobDialogOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Form state for dataset upload
  const [datasetForm, setDatasetForm] = useState({
    name: '',
    description: '',
    datasetType: 'cpk_forecast' as const,
    file: null as File | null,
  });

  // Form state for training job
  const [jobForm, setJobForm] = useState({
    name: '',
    description: '',
    modelType: 'cpk_forecast' as const,
    algorithm: 'lstm',
    datasetId: 0,
    totalEpochs: 100,
    learningRate: 0.001,
    batchSize: 32,
  });

  // Queries
  const { data: datasets, isLoading: datasetsLoading, refetch: refetchDatasets } = trpc.aiTraining.listDatasets.useQuery();
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = trpc.aiTraining.listJobs.useQuery();
  const { data: stats } = trpc.aiTraining.getStats.useQuery();
  const { data: selectedJob } = trpc.aiTraining.getJob.useQuery(
    { id: selectedJobId || 0 },
    { enabled: !!selectedJobId, refetchInterval: 2000 }
  );
  const { data: jobHistory } = trpc.aiTraining.getJobHistory.useQuery(
    { jobId: selectedJobId || 0 },
    { enabled: !!selectedJobId, refetchInterval: 2000 }
  );

  // Mutations
  const createDatasetMutation = trpc.aiTraining.createDataset.useMutation({
    onSuccess: async (result) => {
      if (datasetForm.file) {
        // Upload file
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Content = e.target?.result?.toString().split(',')[1];
          if (base64Content) {
            await uploadFileMutation.mutateAsync({
              datasetId: result.id,
              fileContent: base64Content,
              fileName: datasetForm.file!.name,
              fileType: datasetForm.file!.type,
            });
          }
        };
        reader.readAsDataURL(datasetForm.file);
      }
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const uploadFileMutation = trpc.aiTraining.uploadDatasetFile.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã upload dataset" });
      setIsUploadDialogOpen(false);
      refetchDatasets();
      setDatasetForm({ name: '', description: '', datasetType: 'cpk_forecast', file: null });
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const createJobMutation = trpc.aiTraining.createJob.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo training job" });
      setIsCreateJobDialogOpen(false);
      refetchJobs();
      setJobForm({
        name: '',
        description: '',
        modelType: 'cpk_forecast',
        algorithm: 'lstm',
        datasetId: 0,
        totalEpochs: 100,
        learningRate: 0.001,
        batchSize: 32,
      });
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const startJobMutation = trpc.aiTraining.startJob.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã bắt đầu training" });
      refetchJobs();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const cancelJobMutation = trpc.aiTraining.cancelJob.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã hủy training" });
      refetchJobs();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDatasetForm({ ...datasetForm, file });
    }
  };

  const handleUploadDataset = async () => {
    if (!datasetForm.name || !datasetForm.file) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên và chọn file", variant: "destructive" });
      return;
    }

    await createDatasetMutation.mutateAsync({
      name: datasetForm.name,
      description: datasetForm.description,
      datasetType: datasetForm.datasetType,
    });
  };

  const handleCreateJob = async () => {
    if (!jobForm.name || !jobForm.datasetId) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên và chọn dataset", variant: "destructive" });
      return;
    }

    await createJobMutation.mutateAsync({
      name: jobForm.name,
      description: jobForm.description,
      modelType: jobForm.modelType,
      algorithm: jobForm.algorithm,
      datasetId: jobForm.datasetId,
      totalEpochs: jobForm.totalEpochs,
      hyperparameters: {
        learning_rate: jobForm.learningRate,
        batch_size: jobForm.batchSize,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-violet-500" />
              Model Training Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload datasets and train AI models
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchDatasets(); refetchJobs(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Datasets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalDatasets || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalJobs || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Running Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats?.runningJobs || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats?.completedJobs || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="datasets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
            <TabsTrigger value="jobs">Training Jobs</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          </TabsList>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Training Datasets</CardTitle>
                    <CardDescription>Upload and manage datasets for model training</CardDescription>
                  </div>
                  <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Dataset
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Training Dataset</DialogTitle>
                        <DialogDescription>
                          Upload CSV or Excel file with training data
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Dataset Name</Label>
                          <Input
                            value={datasetForm.name}
                            onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                            placeholder="e.g., CPK Historical Data 2024"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={datasetForm.description}
                            onChange={(e) => setDatasetForm({ ...datasetForm, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <Label>Dataset Type</Label>
                          <Select
                            value={datasetForm.datasetType}
                            onValueChange={(value: any) => setDatasetForm({ ...datasetForm, datasetType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpk_forecast">CPK Forecast</SelectItem>
                              <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                              <SelectItem value="quality_prediction">Quality Prediction</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>File (CSV/Excel)</Label>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileSelect}
                          />
                          {datasetForm.file && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Selected: {datasetForm.file.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleUploadDataset}
                          disabled={createDatasetMutation.isPending || uploadFileMutation.isPending}
                        >
                          {(createDatasetMutation.isPending || uploadFileMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Upload
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {datasetsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  </div>
                ) : datasets && datasets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Columns</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datasets.map((dataset) => (
                        <TableRow key={dataset.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-violet-500" />
                              <span className="font-medium">{dataset.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{dataset.datasetType}</Badge>
                          </TableCell>
                          <TableCell>{dataset.rowCount || 'N/A'}</TableCell>
                          <TableCell>{dataset.columnCount || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                          <TableCell>
                            {new Date(dataset.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No datasets found. Upload your first dataset to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Training Jobs</CardTitle>
                    <CardDescription>Create and manage model training jobs</CardDescription>
                  </div>
                  <Dialog open={isCreateJobDialogOpen} onOpenChange={setIsCreateJobDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Create Training Job
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Training Job</DialogTitle>
                        <DialogDescription>
                          Configure and start a new model training job
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Job Name</Label>
                          <Input
                            value={jobForm.name}
                            onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                            placeholder="e.g., CPK LSTM Training v1"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={jobForm.description}
                            onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <Label>Model Type</Label>
                          <Select
                            value={jobForm.modelType}
                            onValueChange={(value: any) => setJobForm({ ...jobForm, modelType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpk_forecast">CPK Forecast</SelectItem>
                              <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                              <SelectItem value="quality_prediction">Quality Prediction</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Algorithm</Label>
                          <Select
                            value={jobForm.algorithm}
                            onValueChange={(value) => setJobForm({ ...jobForm, algorithm: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lstm">LSTM</SelectItem>
                              <SelectItem value="random_forest">Random Forest</SelectItem>
                              <SelectItem value="xgboost">XGBoost</SelectItem>
                              <SelectItem value="prophet">Prophet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Dataset</Label>
                          <Select
                            value={jobForm.datasetId.toString()}
                            onValueChange={(value) => setJobForm({ ...jobForm, datasetId: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select dataset" />
                            </SelectTrigger>
                            <SelectContent>
                              {datasets?.filter(d => d.status === 'ready').map((dataset) => (
                                <SelectItem key={dataset.id} value={dataset.id.toString()}>
                                  {dataset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Total Epochs</Label>
                          <Input
                            type="number"
                            value={jobForm.totalEpochs}
                            onChange={(e) => setJobForm({ ...jobForm, totalEpochs: parseInt(e.target.value) })}
                            min={1}
                            max={1000}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateJobDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateJob}
                          disabled={createJobMutation.isPending}
                        >
                          {createJobMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Create Job
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  </div>
                ) : jobs && jobs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Model Type</TableHead>
                        <TableHead>Algorithm</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Brain className="h-4 w-4 text-violet-500" />
                              <span className="font-medium">{job.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.modelType}</Badge>
                          </TableCell>
                          <TableCell>{job.algorithm}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={job.progress} className="w-24" />
                              <span className="text-sm">{job.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {job.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startJobMutation.mutate({ id: job.id })}
                                  disabled={startJobMutation.isPending}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </Button>
                              )}
                              {job.status === 'running' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => cancelJobMutation.mutate({ id: job.id })}
                                  disabled={cancelJobMutation.isPending}
                                >
                                  <StopCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedJobId(job.id)}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No training jobs found. Create your first job to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tracking Tab */}
          <TabsContent value="progress" className="space-y-4">
            {selectedJob ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedJob.name}</CardTitle>
                    <CardDescription>Training progress and metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Progress</span>
                          <span className="text-sm text-muted-foreground">
                            Epoch {selectedJob.currentEpoch}/{selectedJob.totalEpochs}
                          </span>
                        </div>
                        <Progress value={selectedJob.progress} className="h-2" />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-muted-foreground">{selectedJob.progress}%</span>
                          {getStatusBadge(selectedJob.status)}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Training Loss</p>
                          <p className="text-2xl font-bold">
                            {selectedJob.trainingLoss ? parseFloat(selectedJob.trainingLoss).toFixed(4) : 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Validation Loss</p>
                          <p className="text-2xl font-bold">
                            {selectedJob.validationLoss ? parseFloat(selectedJob.validationLoss).toFixed(4) : 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Accuracy</p>
                          <p className="text-2xl font-bold">
                            {selectedJob.accuracy ? `${(parseFloat(selectedJob.accuracy) * 100).toFixed(2)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Training History Chart */}
                      {jobHistory && jobHistory.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium mb-4">Training History</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={jobHistory}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="epoch" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="trainingLoss" 
                                stroke="#3b82f6" 
                                name="Training Loss"
                                strokeWidth={2}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="validationLoss" 
                                stroke="#ef4444" 
                                name="Validation Loss"
                                strokeWidth={2}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="accuracy" 
                                stroke="#10b981" 
                                name="Accuracy"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a training job from the "Training Jobs" tab to view progress</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
