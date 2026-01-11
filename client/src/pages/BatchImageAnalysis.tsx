import { useState, useCallback, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Images,
  Upload,
  Play,
  Pause,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  FileImage,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Plus,
  BarChart3,
  TrendingUp,
  Brain,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface BatchJob {
  id: number;
  name: string;
  description: string;
  analysisType: string;
  status: string;
  totalImages: number;
  processedImages: number;
  successImages: number;
  failedImages: number;
  okCount: number;
  ngCount: number;
  warningCount: number;
  avgQualityScore: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  processingTimeMs: number | null;
}

interface BatchItem {
  id: number;
  fileName: string;
  imageUrl: string;
  status: string;
  result: string;
  qualityScore: number;
  confidence: number;
  defectsFound: number;
  defectTypes: string[];
  aiAnalysis: any;
  processingTimeMs: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const resultColors: Record<string, string> = {
  ok: "bg-green-500/10 text-green-500 border-green-500/20",
  ng: "bg-red-500/10 text-red-500 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  unknown: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  cancelled: <X className="h-4 w-4" />,
};

const analysisTypeLabels: Record<string, string> = {
  defect_detection: "Phát hiện lỗi",
  quality_inspection: "Kiểm tra chất lượng",
  comparison: "So sánh hình ảnh",
  ocr: "Nhận dạng ký tự",
  custom: "Tùy chỉnh",
};

export default function BatchImageAnalysis() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [jobName, setJobName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysisType, setAnalysisType] = useState("defect_detection");

  // Fetch jobs
  const { data: jobs, isLoading: loadingJobs, refetch: refetchJobs } = trpc.batchImageAnalysis.getJobs.useQuery({
    limit: 50,
  });

  // Fetch job details
  const { data: jobDetails, refetch: refetchJobDetails } = trpc.batchImageAnalysis.getJob.useQuery(
    { jobId: selectedJob?.id || 0 },
    { enabled: !!selectedJob }
  );

  // Fetch progress (polling when processing)
  const { data: progress } = trpc.batchImageAnalysis.getProgress.useQuery(
    { jobId: selectedJob?.id || 0 },
    { 
      enabled: !!selectedJob && selectedJob.status === 'processing',
      refetchInterval: 2000,
    }
  );

  // Update selected job with progress
  useEffect(() => {
    if (progress && selectedJob) {
      setSelectedJob(prev => prev ? {
        ...prev,
        status: progress.status,
        processedImages: progress.processedImages,
        successImages: progress.successImages,
        failedImages: progress.failedImages,
        okCount: progress.okCount,
        ngCount: progress.ngCount,
        warningCount: progress.warningCount,
        avgQualityScore: progress.avgQualityScore || 0,
      } : null);

      if (progress.status === 'completed' || progress.status === 'failed') {
        refetchJobs();
        refetchJobDetails();
      }
    }
  }, [progress]);

  // Mutations
  const createJobMutation = trpc.batchImageAnalysis.createJob.useMutation({
    onSuccess: (data) => {
      toast({ title: "Thành công", description: "Đã tạo job phân tích mới" });
      setIsCreateDialogOpen(false);
      refetchJobs();
      // Auto-select the new job
      setSelectedJob({
        id: data.jobId,
        name: jobName,
        description: jobDescription,
        analysisType,
        status: 'pending',
        totalImages: 0,
        processedImages: 0,
        successImages: 0,
        failedImages: 0,
        okCount: 0,
        ngCount: 0,
        warningCount: 0,
        avgQualityScore: 0,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        processingTimeMs: null,
      });
      // Reset form
      setJobName("");
      setJobDescription("");
      setAnalysisType("defect_detection");
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const uploadImageMutation = trpc.batchImageAnalysis.uploadImage.useMutation();

  const startAnalysisMutation = trpc.batchImageAnalysis.startAnalysis.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã bắt đầu phân tích" });
      if (selectedJob) {
        setSelectedJob({ ...selectedJob, status: 'processing' });
      }
      refetchJobs();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const cancelJobMutation = trpc.batchImageAnalysis.cancelJob.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã hủy job" });
      if (selectedJob) {
        setSelectedJob({ ...selectedJob, status: 'cancelled' });
      }
      refetchJobs();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    setUploadedFiles(prev => [...prev, ...imageFiles]);
  }, []);

  // Handle file upload
  const handleUploadFiles = useCallback(async () => {
    if (!selectedJob || uploadedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of uploadedFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadImageMutation.mutateAsync({
          jobId: selectedJob.id,
          fileName: file.name,
          base64Data: base64,
          contentType: file.type,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        failCount++;
      }
    }

    setIsUploading(false);
    setUploadedFiles([]);
    refetchJobDetails();

    if (successCount > 0) {
      toast({
        title: "Upload hoàn tất",
        description: `Đã upload ${successCount} hình ảnh${failCount > 0 ? `, ${failCount} thất bại` : ''}`,
      });
    }
  }, [selectedJob, uploadedFiles, uploadImageMutation, refetchJobDetails, toast]);

  // Transform jobs data
  const jobList: BatchJob[] = (jobs || []).map((j: any) => ({
    id: j.id,
    name: j.name,
    description: j.description,
    analysisType: j.analysis_type,
    status: j.status,
    totalImages: j.total_images,
    processedImages: j.processed_images,
    successImages: j.success_images,
    failedImages: j.failed_images,
    okCount: j.ok_count,
    ngCount: j.ng_count,
    warningCount: j.warning_count,
    avgQualityScore: j.avg_quality_score || 0,
    createdAt: j.created_at,
    startedAt: j.started_at,
    completedAt: j.completed_at,
    processingTimeMs: j.processing_time_ms,
  }));

  // Transform items data
  const itemList: BatchItem[] = (jobDetails?.items || []).map((i: any) => ({
    id: i.id,
    fileName: i.file_name,
    imageUrl: i.image_url,
    status: i.status,
    result: i.result,
    qualityScore: i.quality_score || 0,
    confidence: i.confidence || 0,
    defectsFound: i.defects_found || 0,
    defectTypes: i.defectTypes || [],
    aiAnalysis: i.aiAnalysis,
    processingTimeMs: i.processing_time_ms || 0,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Images className="h-8 w-8 text-primary" />
              Phân tích Hình ảnh Hàng loạt
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload và phân tích nhiều hình ảnh cùng lúc với AI Vision
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Job mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo Job Phân tích mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin để tạo job phân tích hình ảnh hàng loạt
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="job-name">Tên Job</Label>
                  <Input
                    id="job-name"
                    placeholder="VD: Kiểm tra PCB Lot 2024-01"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-desc">Mô tả</Label>
                  <Textarea
                    id="job-desc"
                    placeholder="Mô tả chi tiết về job phân tích..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysis-type">Loại phân tích</Label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defect_detection">Phát hiện lỗi</SelectItem>
                      <SelectItem value="quality_inspection">Kiểm tra chất lượng</SelectItem>
                      <SelectItem value="comparison">So sánh hình ảnh</SelectItem>
                      <SelectItem value="ocr">Nhận dạng ký tự (OCR)</SelectItem>
                      <SelectItem value="custom">Tùy chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => createJobMutation.mutate({
                    name: jobName,
                    description: jobDescription,
                    analysisType: analysisType as any,
                  })}
                  disabled={!jobName || createJobMutation.isPending}
                >
                  {createJobMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Tạo Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Danh sách Job</span>
                <Button size="icon" variant="ghost" onClick={() => refetchJobs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : jobList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có job nào</p>
                    <p className="text-sm">Tạo job mới để bắt đầu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobList.map((job) => (
                      <div
                        key={job.id}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedJob?.id === job.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}
                        `}
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium truncate">{job.name}</span>
                          <Badge variant="outline" className={statusColors[job.status]}>
                            {statusIcons[job.status]}
                            <span className="ml-1 capitalize">{job.status}</span>
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {analysisTypeLabels[job.analysisType]}
                        </div>
                        {job.totalImages > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{job.processedImages}/{job.totalImages} hình ảnh</span>
                              <span>{Math.round((job.processedImages / job.totalImages) * 100)}%</span>
                            </div>
                            <Progress value={(job.processedImages / job.totalImages) * 100} className="h-1" />
                          </div>
                        )}
                        <div className="flex gap-2 mt-2 text-xs">
                          <span className="text-green-500">OK: {job.okCount}</span>
                          <span className="text-red-500">NG: {job.ngCount}</span>
                          <span className="text-amber-500">Warning: {job.warningCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card className="lg:col-span-2">
            {selectedJob ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedJob.name}</CardTitle>
                      <CardDescription>{selectedJob.description || "Không có mô tả"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedJob.status === 'pending' && selectedJob.totalImages > 0 && (
                        <Button
                          onClick={() => startAnalysisMutation.mutate({ jobId: selectedJob.id })}
                          disabled={startAnalysisMutation.isPending}
                        >
                          {startAnalysisMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Bắt đầu phân tích
                        </Button>
                      )}
                      {selectedJob.status === 'processing' && (
                        <Button
                          variant="destructive"
                          onClick={() => cancelJobMutation.mutate({ jobId: selectedJob.id })}
                          disabled={cancelJobMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Hủy
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upload">
                    <TabsList>
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                      <TabsTrigger value="results">Kết quả ({itemList.length})</TabsTrigger>
                      <TabsTrigger value="stats">Thống kê</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                      {/* Upload area */}
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium">Click để chọn hình ảnh</p>
                        <p className="text-sm text-muted-foreground">
                          Hỗ trợ: JPG, PNG, BMP, TIFF
                        </p>
                      </div>

                      {/* Selected files */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Đã chọn: {uploadedFiles.length} hình ảnh</span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUploadedFiles([])}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xóa tất cả
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleUploadFiles}
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-[200px]">
                            <div className="grid grid-cols-4 gap-2">
                              {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-20 object-cover rounded-lg"
                                  />
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate rounded-b-lg">
                                    {file.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Already uploaded images */}
                      {itemList.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-medium">Đã upload: {itemList.length} hình ảnh</span>
                          <ScrollArea className="h-[200px]">
                            <div className="grid grid-cols-4 gap-2">
                              {itemList.slice(0, 20).map((item) => (
                                <div
                                  key={item.id}
                                  className="relative cursor-pointer"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  <img
                                    src={item.imageUrl}
                                    alt={item.fileName}
                                    className="w-full h-20 object-cover rounded-lg"
                                  />
                                  <Badge
                                    variant="outline"
                                    className={`absolute top-1 right-1 ${resultColors[item.result]}`}
                                  >
                                    {item.result.toUpperCase()}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="results">
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Hình ảnh</TableHead>
                              <TableHead>Trạng thái</TableHead>
                              <TableHead>Kết quả</TableHead>
                              <TableHead>Điểm chất lượng</TableHead>
                              <TableHead>Số lỗi</TableHead>
                              <TableHead>Thời gian</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemList.map((item) => (
                              <TableRow
                                key={item.id}
                                className="cursor-pointer"
                                onClick={() => setSelectedItem(item)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={item.imageUrl}
                                      alt={item.fileName}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="truncate max-w-[150px]">{item.fileName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusColors[item.status]}>
                                    {statusIcons[item.status]}
                                    <span className="ml-1 capitalize">{item.status}</span>
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={resultColors[item.result]}>
                                    {item.result.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={
                                    item.qualityScore >= 90 ? 'text-green-500' :
                                    item.qualityScore >= 70 ? 'text-amber-500' : 'text-red-500'
                                  }>
                                    {item.qualityScore.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell>{item.defectsFound}</TableCell>
                                <TableCell>{item.processingTimeMs}ms</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="stats">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-500">{selectedJob.okCount}</div>
                            <div className="text-sm text-muted-foreground">OK</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-500">{selectedJob.ngCount}</div>
                            <div className="text-sm text-muted-foreground">NG</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-amber-500">{selectedJob.warningCount}</div>
                            <div className="text-sm text-muted-foreground">Warning</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{selectedJob.avgQualityScore.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Điểm TB</div>
                          </CardContent>
                        </Card>
                      </div>

                      {selectedJob.totalImages > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-4">Tiến độ phân tích</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Đã xử lý: {selectedJob.processedImages}/{selectedJob.totalImages}</span>
                              <span>{Math.round((selectedJob.processedImages / selectedJob.totalImages) * 100)}%</span>
                            </div>
                            <Progress value={(selectedJob.processedImages / selectedJob.totalImages) * 100} />
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Thành công:</span>
                              <span className="ml-2 text-green-500">{selectedJob.successImages}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Thất bại:</span>
                              <span className="ml-2 text-red-500">{selectedJob.failedImages}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-[500px]">
                <div className="text-center text-muted-foreground">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Chọn một job để xem chi tiết</p>
                  <p className="text-sm">Hoặc tạo job mới để bắt đầu phân tích</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Image Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Chi tiết phân tích: {selectedItem?.fileName}</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.fileName}
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={resultColors[selectedItem.result]} size="lg">
                      {selectedItem.result.toUpperCase()}
                    </Badge>
                    <span className="text-2xl font-bold">
                      {selectedItem.qualityScore.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Độ tin cậy:</span>
                      <span>{(selectedItem.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số lỗi phát hiện:</span>
                      <span>{selectedItem.defectsFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thời gian xử lý:</span>
                      <span>{selectedItem.processingTimeMs}ms</span>
                    </div>
                  </div>

                  {selectedItem.defectTypes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Loại lỗi phát hiện:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.defectTypes.map((type, idx) => (
                          <Badge key={idx} variant="outline" className="bg-red-500/10 text-red-500">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.aiAnalysis?.summary && (
                    <div>
                      <h4 className="font-medium mb-2">Phân tích AI:</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedItem.aiAnalysis.summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
