/**
 * AiModelManagement - Trang quản lý mô hình AI cho AOI/AVI
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Brain, 
  Plus,
  Upload,
  Search,
  Play,
  Pause,
  RefreshCw,
  Settings,
  TrendingUp,
  Target,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Cpu,
  Layers,
  FileText,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AiModel {
  id: number;
  name: string;
  version: string;
  type: 'classification' | 'detection' | 'segmentation';
  status: 'active' | 'inactive' | 'training' | 'error';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDataCount: number;
  lastTrainedAt: Date;
  createdAt: Date;
  description?: string;
  inferenceTime: number; // ms
  totalInferences: number;
}

export default function AiModelManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedModel, setSelectedModel] = useState<AiModel | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Mock data
  const [models] = useState<AiModel[]>([
    {
      id: 1,
      name: "Defect Detection v3",
      version: "3.2.1",
      type: 'detection',
      status: 'active',
      accuracy: 98.5,
      precision: 97.8,
      recall: 96.2,
      f1Score: 97.0,
      trainingDataCount: 50000,
      lastTrainedAt: new Date("2024-03-01"),
      createdAt: new Date("2024-01-15"),
      description: "Mô hình phát hiện lỗi chính cho dây chuyền SMT",
      inferenceTime: 45,
      totalInferences: 1250000,
    },
    {
      id: 2,
      name: "Solder Quality Classifier",
      version: "2.1.0",
      type: 'classification',
      status: 'active',
      accuracy: 96.8,
      precision: 95.5,
      recall: 94.8,
      f1Score: 95.1,
      trainingDataCount: 35000,
      lastTrainedAt: new Date("2024-02-15"),
      createdAt: new Date("2023-11-20"),
      description: "Phân loại chất lượng mối hàn",
      inferenceTime: 32,
      totalInferences: 890000,
    },
    {
      id: 3,
      name: "Component Segmentation",
      version: "1.5.0",
      type: 'segmentation',
      status: 'training',
      accuracy: 94.2,
      precision: 93.1,
      recall: 92.5,
      f1Score: 92.8,
      trainingDataCount: 25000,
      lastTrainedAt: new Date("2024-03-10"),
      createdAt: new Date("2024-02-01"),
      description: "Phân vùng linh kiện trên PCB",
      inferenceTime: 78,
      totalInferences: 450000,
    },
    {
      id: 4,
      name: "Legacy Defect Model",
      version: "1.0.0",
      type: 'detection',
      status: 'inactive',
      accuracy: 89.5,
      precision: 88.2,
      recall: 87.5,
      f1Score: 87.8,
      trainingDataCount: 15000,
      lastTrainedAt: new Date("2023-06-01"),
      createdAt: new Date("2023-05-01"),
      description: "Mô hình cũ - đã thay thế bởi v3",
      inferenceTime: 120,
      totalInferences: 2500000,
    },
  ]);

  // Filter models
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || model.status === statusFilter;
    const matchesType = typeFilter === "all" || model.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Hoạt động</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Tạm dừng</Badge>;
      case 'training':
        return <Badge className="bg-blue-500">Đang train</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'detection':
        return <Badge variant="outline">Detection</Badge>;
      case 'classification':
        return <Badge variant="outline">Classification</Badge>;
      case 'segmentation':
        return <Badge variant="outline">Segmentation</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleActivate = (model: AiModel) => {
    toast({
      title: "Kích hoạt mô hình",
      description: `Đã kích hoạt ${model.name}`,
    });
  };

  const handleDeactivate = (model: AiModel) => {
    toast({
      title: "Tạm dừng mô hình",
      description: `Đã tạm dừng ${model.name}`,
    });
  };

  const handleRetrain = (model: AiModel) => {
    toast({
      title: "Bắt đầu training",
      description: `Đang train lại ${model.name}...`,
    });
  };

  // Statistics
  const stats = {
    total: models.length,
    active: models.filter(m => m.status === 'active').length,
    training: models.filter(m => m.status === 'training').length,
    avgAccuracy: (models.reduce((sum, m) => sum + m.accuracy, 0) / models.length).toFixed(1),
    totalInferences: models.reduce((sum, m) => sum + m.totalInferences, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              Quản lý Mô hình AI
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý và giám sát các mô hình AI cho AOI/AVI
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Thêm mô hình
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng mô hình</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Brain className="h-8 w-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-500">{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang training</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.training}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy TB</p>
                  <p className="text-2xl font-bold">{stats.avgAccuracy}%</p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng inferences</p>
                  <p className="text-2xl font-bold">{(stats.totalInferences / 1000000).toFixed(1)}M</p>
                </div>
                <Cpu className="h-8 w-8 text-muted-foreground opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm mô hình..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm dừng</SelectItem>
                  <SelectItem value="training">Đang train</SelectItem>
                  <SelectItem value="error">Lỗi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="detection">Detection</SelectItem>
                  <SelectItem value="classification">Classification</SelectItem>
                  <SelectItem value="segmentation">Segmentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Mô hình</CardTitle>
            <CardDescription>
              {filteredModels.length} mô hình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên mô hình</TableHead>
                  <TableHead>Phiên bản</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>F1 Score</TableHead>
                  <TableHead>Inference Time</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>v{model.version}</TableCell>
                    <TableCell>{getTypeBadge(model.type)}</TableCell>
                    <TableCell>{getStatusBadge(model.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={model.accuracy} className="w-16 h-2" />
                        <span className="text-sm">{model.accuracy}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{model.f1Score}%</TableCell>
                    <TableCell>{model.inferenceTime}ms</TableCell>
                    <TableCell>{model.lastTrainedAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedModel(model);
                            setIsDetailDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          {model.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleDeactivate(model)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Tạm dừng
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(model)}>
                              <Play className="h-4 w-4 mr-2" />
                              Kích hoạt
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleRetrain(model)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Train lại
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Xuất mô hình
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Chi tiết Mô hình AI</DialogTitle>
            </DialogHeader>
            {selectedModel && (
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tên mô hình</Label>
                      <p className="font-medium">{selectedModel.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phiên bản</Label>
                      <p>v{selectedModel.version}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Loại</Label>
                      <div className="mt-1">{getTypeBadge(selectedModel.type)}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                      <div className="mt-1">{getStatusBadge(selectedModel.status)}</div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Mô tả</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedModel.description || "Không có mô tả"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Dữ liệu training</Label>
                      <p>{selectedModel.trainingDataCount.toLocaleString()} samples</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tổng inferences</Label>
                      <p>{selectedModel.totalInferences.toLocaleString()}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-xs text-muted-foreground">Accuracy</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={selectedModel.accuracy} className="flex-1" />
                          <span className="font-bold">{selectedModel.accuracy}%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-xs text-muted-foreground">Precision</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={selectedModel.precision} className="flex-1" />
                          <span className="font-bold">{selectedModel.precision}%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-xs text-muted-foreground">Recall</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={selectedModel.recall} className="flex-1" />
                          <span className="font-bold">{selectedModel.recall}%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <Label className="text-xs text-muted-foreground">F1 Score</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={selectedModel.f1Score} className="flex-1" />
                          <span className="font-bold">{selectedModel.f1Score}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      <Label className="text-xs text-muted-foreground">Inference Time</Label>
                      <p className="text-2xl font-bold">{selectedModel.inferenceTime}ms</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="history">
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Lịch sử training sẽ hiển thị tại đây</p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
