/**
 * GoldenSample - Trang quản lý mẫu chuẩn (Golden Sample) cho AOI/AVI
 */
import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Star, 
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  Eye,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Package,
  Loader2,
  Download,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface GoldenSampleData {
  id: number;
  productCode: string;
  productName: string;
  version: string;
  status: 'active' | 'inactive' | 'draft';
  imageUrl?: string;
  description?: string;
  specifications?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export default function GoldenSample() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<GoldenSampleData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    version: "1.0",
    description: "",
    imageUrl: "",
  });

  // Mock data - in production, this would come from tRPC
  const [goldenSamples] = useState<GoldenSampleData[]>([
    {
      id: 1,
      productCode: "PCB-001",
      productName: "Main Board Rev A",
      version: "1.0",
      status: 'active',
      imageUrl: "/placeholder-pcb.jpg",
      description: "Mẫu chuẩn cho Main Board phiên bản A",
      specifications: { width: 100, height: 80, layers: 4 },
      createdBy: "Admin",
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-20"),
      usageCount: 1250,
    },
    {
      id: 2,
      productCode: "PCB-002",
      productName: "Power Module",
      version: "2.1",
      status: 'active',
      description: "Mẫu chuẩn cho Power Module",
      specifications: { width: 50, height: 40, layers: 2 },
      createdBy: "QC Engineer",
      createdAt: new Date("2024-02-10"),
      updatedAt: new Date("2024-02-15"),
      usageCount: 890,
    },
    {
      id: 3,
      productCode: "PCB-003",
      productName: "Display Controller",
      version: "1.2",
      status: 'inactive',
      description: "Mẫu chuẩn cho Display Controller (đã ngừng sử dụng)",
      createdBy: "Admin",
      createdAt: new Date("2023-12-01"),
      updatedAt: new Date("2024-01-05"),
      usageCount: 450,
    },
    {
      id: 4,
      productCode: "PCB-004",
      productName: "Sensor Board",
      version: "1.0",
      status: 'draft',
      description: "Mẫu chuẩn cho Sensor Board (đang phát triển)",
      createdBy: "QC Engineer",
      createdAt: new Date("2024-03-01"),
      updatedAt: new Date("2024-03-01"),
      usageCount: 0,
    },
  ]);

  // Filter samples
  const filteredSamples = goldenSamples.filter(sample => {
    const matchesSearch = 
      sample.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    toast({
      title: "Tạo mẫu chuẩn",
      description: "Đã tạo mẫu chuẩn mới thành công.",
    });
    setIsCreateDialogOpen(false);
    setFormData({
      productCode: "",
      productName: "",
      version: "1.0",
      description: "",
      imageUrl: "",
    });
  };

  const handleDelete = (id: number) => {
    toast({
      title: "Xóa mẫu chuẩn",
      description: "Đã xóa mẫu chuẩn thành công.",
    });
  };

  const handleDuplicate = (sample: GoldenSampleData) => {
    toast({
      title: "Nhân bản mẫu chuẩn",
      description: `Đã tạo bản sao của ${sample.productName}.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Đang dùng</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Ngừng dùng</Badge>;
      case 'draft':
        return <Badge variant="outline">Bản nháp</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              Mẫu Chuẩn (Golden Sample)
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý mẫu chuẩn cho kiểm tra AOI/AVI
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo mẫu chuẩn
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo Mẫu Chuẩn Mới</DialogTitle>
                <DialogDescription>
                  Thêm mẫu chuẩn mới cho kiểm tra AOI/AVI
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productCode">Mã sản phẩm</Label>
                    <Input
                      id="productCode"
                      value={formData.productCode}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                      placeholder="VD: PCB-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Phiên bản</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="VD: 1.0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Tên sản phẩm</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="VD: Main Board Rev A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về mẫu chuẩn..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hình ảnh mẫu chuẩn</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Kéo thả hoặc click để tải lên
                    </p>
                    <Button variant="outline" size="sm">
                      Chọn file
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate}>
                  Tạo mẫu chuẩn
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo mã hoặc tên sản phẩm..."
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
                  <SelectItem value="active">Đang dùng</SelectItem>
                  <SelectItem value="inactive">Ngừng dùng</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng mẫu chuẩn</p>
                  <p className="text-2xl font-bold">{goldenSamples.length}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang dùng</p>
                  <p className="text-2xl font-bold text-green-500">
                    {goldenSamples.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bản nháp</p>
                  <p className="text-2xl font-bold">
                    {goldenSamples.filter(s => s.status === 'draft').length}
                  </p>
                </div>
                <Edit className="h-8 w-8 text-muted-foreground opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng sử dụng</p>
                  <p className="text-2xl font-bold">
                    {goldenSamples.reduce((sum, s) => sum + s.usageCount, 0).toLocaleString()}
                  </p>
                </div>
                <Package className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Mẫu Chuẩn</CardTitle>
            <CardDescription>
              {filteredSamples.length} mẫu chuẩn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã sản phẩm</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Phiên bản</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Số lần dùng</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-mono">{sample.productCode}</TableCell>
                    <TableCell className="font-medium">{sample.productName}</TableCell>
                    <TableCell>v{sample.version}</TableCell>
                    <TableCell>{getStatusBadge(sample.status)}</TableCell>
                    <TableCell>{sample.usageCount.toLocaleString()}</TableCell>
                    <TableCell>{sample.createdBy}</TableCell>
                    <TableCell>{sample.updatedAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedSample(sample);
                            setIsViewDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(sample)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Nhân bản
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Tải xuống
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500"
                            onClick={() => handleDelete(sample.id)}
                          >
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

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Chi tiết Mẫu Chuẩn</DialogTitle>
            </DialogHeader>
            {selectedSample && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    {selectedSample.imageUrl ? (
                      <img 
                        src={selectedSample.imageUrl} 
                        alt={selectedSample.productName}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mã sản phẩm</Label>
                    <p className="font-mono text-lg">{selectedSample.productCode}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tên sản phẩm</Label>
                    <p className="font-medium">{selectedSample.productName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phiên bản</Label>
                    <p>v{selectedSample.version}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                    <div className="mt-1">{getStatusBadge(selectedSample.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mô tả</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSample.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Người tạo</Label>
                      <p className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedSample.createdBy}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Số lần sử dụng</Label>
                      <p className="font-bold">{selectedSample.usageCount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedSample.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cập nhật</Label>
                      <p>{selectedSample.updatedAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Đóng
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
