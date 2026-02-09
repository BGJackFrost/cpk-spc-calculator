import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CameraCapture } from "@/components/CameraCapture";
import { ImageAnnotator } from "@/components/ImageAnnotator";
import {
  Camera,
  Image as ImageIcon,
  Search,
  Filter,
  Upload,
  Trash2,
  Eye,
  Download,
  Sparkles,
  RefreshCw,
  Calendar,
  Package,
  Factory,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Grid3X3,
  List,
  Pencil,
} from "lucide-react";

interface SnImage {
  id: string;
  serialNumber: string;
  imageUrl: string;
  thumbnailUrl?: string;
  productId?: number;
  productName?: string;
  productionLineId?: number;
  productionLineName?: string;
  workstationId?: number;
  workstationName?: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  createdAt: Date;
  createdBy?: string;
  annotations?: string;
}

// Images are loaded from camera capture and file uploads - no mock data

export default function SnImages() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [images, setImages] = useState<SnImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<SnImage | null>(null);
  const [compareImages, setCompareImages] = useState<[SnImage | null, SnImage | null]>([null, null]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<SnImage | null>(null);

  // Get products for filter
  const { data: products } = trpc.product.list.useQuery();

  // Handle camera capture
  const handleCapture = useCallback((imageData: string, blob: Blob) => {
    const newImage: SnImage = {
      id: `img_${Date.now()}`,
      serialNumber: `SN-${Date.now()}`,
      imageUrl: imageData,
      status: "pending",
      createdAt: new Date(),
      createdBy: "Current User",
    };
    setImages((prev) => [newImage, ...prev]);
    toast.success("Đã chụp và lưu ảnh thành công!");
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: SnImage = {
          id: `img_${Date.now()}_${Math.random()}`,
          serialNumber: `SN-${Date.now()}`,
          imageUrl: event.target?.result as string,
          status: "pending",
          createdAt: new Date(),
          createdBy: "Current User",
        };
        setImages((prev) => [newImage, ...prev]);
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Đã tải lên ${files.length} ảnh`);
  }, []);

  // Filter images
  const filteredImages = images.filter((img) => {
    const matchesSearch =
      img.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.productionLineName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || img.status === statusFilter;
    const matchesProduct = productFilter === "all" || img.productId?.toString() === productFilter;
    return matchesSearch && matchesStatus && matchesProduct;
  });

  // Update image status
  const updateImageStatus = useCallback((id: string, status: SnImage["status"]) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status } : img))
    );
    toast.success(`Đã cập nhật trạng thái thành "${status}"`);
  }, []);

  // Delete image
  const deleteImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.success("Đã xóa ảnh");
  }, []);

  // AI Compare images
  const handleAICompare = useCallback(async () => {
    if (!compareImages[0] || !compareImages[1]) {
      toast.error("Vui lòng chọn 2 ảnh để so sánh");
      return;
    }

    setIsComparing(true);
    setComparisonResult(null);

    try {
      // Simulate AI comparison (in real app, call backend API)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = `
## Kết quả phân tích AI

### Điểm giống nhau:
- Cùng loại sản phẩm
- Kích thước tương đương
- Màu sắc cơ bản giống nhau

### Điểm khác biệt:
1. **Vùng góc trên bên phải**: Phát hiện vết xước nhỏ trên ảnh 2
2. **Vùng trung tâm**: Độ sáng khác nhau 15%
3. **Cạnh dưới**: Ảnh 1 có viền rõ hơn

### Đánh giá:
- Độ tương đồng: **87%**
- Mức độ khác biệt: **Nhẹ**
- Khuyến nghị: Kiểm tra lại vùng góc trên bên phải
      `;

      setComparisonResult(result);
      toast.success("Phân tích AI hoàn tất!");
    } catch {
      toast.error("Lỗi khi phân tích ảnh");
    } finally {
      setIsComparing(false);
    }
  }, [compareImages]);

  // Save annotations
  const handleSaveAnnotations = useCallback(
    (annotations: unknown[], imageWithAnnotations: string) => {
      if (!annotatingImage) return;

      setImages((prev) =>
        prev.map((img) =>
          img.id === annotatingImage.id
            ? {
                ...img,
                imageUrl: imageWithAnnotations,
                annotations: JSON.stringify(annotations),
              }
            : img
        )
      );
      setIsAnnotating(false);
      setAnnotatingImage(null);
      toast.success("Đã lưu annotations!");
    },
    [annotatingImage]
  );

  const getStatusBadge = (status: SnImage["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Từ chối
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Chờ duyệt
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Ảnh SN</h1>
            <p className="text-muted-foreground">
              Chụp, quản lý và phân tích ảnh serial number sản phẩm
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Tải ảnh lên
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gallery">
              <ImageIcon className="h-4 w-4 mr-2" />
              Thư viện ảnh
            </TabsTrigger>
            <TabsTrigger value="capture">
              <Camera className="h-4 w-4 mr-2" />
              Chụp ảnh
            </TabsTrigger>
            <TabsTrigger value="compare">
              <Sparkles className="h-4 w-4 mr-2" />
              So sánh AI
            </TabsTrigger>
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm theo SN, sản phẩm, dây chuyền..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Package className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image Gallery */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <Card key={image.id} className="overflow-hidden group">
                    <div className="relative aspect-square">
                      <img
                        src={image.imageUrl}
                        alt={image.serialNumber}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={() => setSelectedImage(image)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>{image.serialNumber}</DialogTitle>
                              <DialogDescription>
                                Chi tiết ảnh serial number
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid md:grid-cols-2 gap-4">
                              <img
                                src={image.imageUrl}
                                alt={image.serialNumber}
                                className="w-full rounded-lg"
                              />
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-muted-foreground">Serial Number</Label>
                                  <p className="font-medium">{image.serialNumber}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Sản phẩm</Label>
                                  <p className="font-medium">{image.productName || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Dây chuyền</Label>
                                  <p className="font-medium">{image.productionLineName || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Công trạm</Label>
                                  <p className="font-medium">{image.workstationName || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Trạng thái</Label>
                                  <div className="mt-1">{getStatusBadge(image.status)}</div>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Ngày tạo</Label>
                                  <p className="font-medium">
                                    {image.createdAt.toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                                {image.notes && (
                                  <div>
                                    <Label className="text-muted-foreground">Ghi chú</Label>
                                    <p className="font-medium">{image.notes}</p>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateImageStatus(image.id, "approved")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Duyệt
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateImageStatus(image.id, "rejected")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Từ chối
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAnnotatingImage(image);
                                      setIsAnnotating(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Annotate
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => {
                            setAnnotatingImage(image);
                            setIsAnnotating(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(image.status)}
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">{image.serialNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {image.createdAt.toLocaleDateString("vi-VN")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredImages.map((image) => (
                      <div
                        key={image.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50"
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.serialNumber}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{image.serialNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {image.productName || "N/A"} • {image.productionLineName || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(image.status)}
                          <span className="text-sm text-muted-foreground">
                            {image.createdAt.toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteImage(image.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredImages.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Không có ảnh nào</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Capture Tab */}
          <TabsContent value="capture" className="space-y-4">
            <CameraCapture
              onCapture={handleCapture}
              onError={(error) => toast.error(error)}
              showPreview={true}
              maxCaptures={20}
            />
          </TabsContent>

          {/* AI Compare Tab */}
          <TabsContent value="compare" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Image 1 Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ảnh 1 (Tham chiếu)</CardTitle>
                  <CardDescription>Chọn ảnh gốc để so sánh</CardDescription>
                </CardHeader>
                <CardContent>
                  {compareImages[0] ? (
                    <div className="relative">
                      <img
                        src={compareImages[0].imageUrl}
                        alt={compareImages[0].serialNumber}
                        className="w-full rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setCompareImages([null, compareImages[1]])}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <p className="mt-2 text-sm font-medium">{compareImages[0].serialNumber}</p>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => {
                        const img = images.find((i) => i.id === value);
                        if (img) setCompareImages([img, compareImages[1]]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ảnh..." />
                      </SelectTrigger>
                      <SelectContent>
                        {images.map((img) => (
                          <SelectItem key={img.id} value={img.id}>
                            {img.serialNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {/* Image 2 Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ảnh 2 (So sánh)</CardTitle>
                  <CardDescription>Chọn ảnh cần kiểm tra</CardDescription>
                </CardHeader>
                <CardContent>
                  {compareImages[1] ? (
                    <div className="relative">
                      <img
                        src={compareImages[1].imageUrl}
                        alt={compareImages[1].serialNumber}
                        className="w-full rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setCompareImages([compareImages[0], null])}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <p className="mt-2 text-sm font-medium">{compareImages[1].serialNumber}</p>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => {
                        const img = images.find((i) => i.id === value);
                        if (img) setCompareImages([compareImages[0], img]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ảnh..." />
                      </SelectTrigger>
                      <SelectContent>
                        {images.map((img) => (
                          <SelectItem key={img.id} value={img.id}>
                            {img.serialNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Compare Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleAICompare}
                disabled={!compareImages[0] || !compareImages[1] || isComparing}
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Phân tích AI
                  </>
                )}
              </Button>
            </div>

            {/* Comparison Result */}
            {comparisonResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Kết quả phân tích AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {comparisonResult}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Annotation Dialog */}
        <Dialog open={isAnnotating} onOpenChange={setIsAnnotating}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Annotation - {annotatingImage?.serialNumber}</DialogTitle>
              <DialogDescription>
                Sử dụng các công cụ để đánh dấu và ghi chú trên ảnh
              </DialogDescription>
            </DialogHeader>
            {annotatingImage && (
              <ImageAnnotator
                imageUrl={annotatingImage.imageUrl}
                onSave={handleSaveAnnotations}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
