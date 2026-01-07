import { useState, useRef, Suspense, lazy } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Model3DViewer } from "@/components/Model3DViewer";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Box,
  Upload,
  Trash2,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Download,
  FileBox,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  { value: "machine", label: "Máy móc" },
  { value: "equipment", label: "Thiết bị" },
  { value: "building", label: "Tòa nhà" },
  { value: "zone", label: "Khu vực" },
  { value: "furniture", label: "Nội thất" },
  { value: "custom", label: "Tùy chỉnh" },
];

export default function Model3DManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadPreviewOpen, setIsUploadPreviewOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<any>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "machine",
    modelUrl: "",
    modelFormat: "glb",
    thumbnailUrl: "",
    manufacturer: "",
    modelNumber: "",
    defaultScale: 1,
    defaultRotationX: 0,
    defaultRotationY: 0,
    defaultRotationZ: 0,
    isPublic: false,
    tags: [] as string[],
  });

  const utils = trpc.useUtils();

  const { data: models, isLoading } = trpc.model3d.getAll.useQuery({
    category: filterCategory === "all" ? undefined : filterCategory,
    isActive: true,
  });

  const createMutation = trpc.model3d.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo model 3D thành công");
      setIsCreateDialogOpen(false);
      resetForm();
      utils.model3d.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.model3d.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật model 3D thành công");
      setIsEditDialogOpen(false);
      utils.model3d.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.model3d.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa model 3D thành công");
      utils.model3d.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const uploadMutation = trpc.model3d.uploadFile.useMutation({
    onSuccess: (data) => {
      setFormData((prev) => ({
        ...prev,
        modelUrl: data.url,
      }));
      toast.success("Đã upload file thành công");
      setUploading(false);
    },
    onError: (error) => {
      toast.error(`Lỗi upload: ${error.message}`);
      setUploading(false);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "machine",
      modelUrl: "",
      modelFormat: "glb",
      thumbnailUrl: "",
      manufacturer: "",
      modelNumber: "",
      defaultScale: 1,
      defaultRotationX: 0,
      defaultRotationY: 0,
      defaultRotationZ: 0,
      isPublic: false,
      tags: [],
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".gltf", ".glb"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(ext)) {
      toast.error("Chỉ hỗ trợ file GLTF/GLB");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 50MB)");
      return;
    }

    // Create preview URL and show preview dialog
    const previewUrl = URL.createObjectURL(file);
    setUploadPreviewUrl(previewUrl);
    setPendingFile(file);
    setFormData((prev) => ({
      ...prev,
      modelFormat: ext === ".glb" ? "glb" : "gltf",
      name: prev.name || file.name.replace(/\.(gltf|glb)$/i, ""),
    }));
    setIsUploadPreviewOpen(true);
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    
    setUploading(true);
    setIsUploadPreviewOpen(false);

    // Read file as base64
    const reader = new FileReader();
    const ext = pendingFile.name.toLowerCase().slice(pendingFile.name.lastIndexOf("."));
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        fileName: pendingFile.name,
        fileData: base64,
        contentType: ext === ".glb" ? "model/gltf-binary" : "model/gltf+json",
      });
    };
    reader.readAsDataURL(pendingFile);
  };

  const cancelUploadPreview = () => {
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }
    setUploadPreviewUrl("");
    setPendingFile(null);
    setIsUploadPreviewOpen(false);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.modelUrl) {
      toast.error("Vui lòng nhập tên và upload file model");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedModel) return;
    updateMutation.mutate({
      id: selectedModel.id,
      ...formData,
    });
  };

  const handleDelete = (model: any) => {
    setModelToDelete(model);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (modelToDelete) {
      deleteMutation.mutate({ id: modelToDelete.id });
      setIsDeleteDialogOpen(false);
      setModelToDelete(null);
    }
  };

  const openEditDialog = (model: any) => {
    setSelectedModel(model);
    setFormData({
      name: model.name || "",
      description: model.description || "",
      category: model.category || "machine",
      modelUrl: model.model_url || "",
      modelFormat: model.model_format || "glb",
      thumbnailUrl: model.thumbnail_url || "",
      manufacturer: model.manufacturer || "",
      modelNumber: model.model_number || "",
      defaultScale: Number(model.default_scale) || 1,
      defaultRotationX: Number(model.default_rotation_x) || 0,
      defaultRotationY: Number(model.default_rotation_y) || 0,
      defaultRotationZ: Number(model.default_rotation_z) || 0,
      isPublic: Boolean(model.is_public),
      tags: model.tags ? JSON.parse(model.tags) : [],
    });
    setIsEditDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Model 3D</h1>
            <p className="text-muted-foreground">
              Upload và quản lý các model 3D (GLTF/GLB) cho sơ đồ nhà máy
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Model
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Label>Danh mục</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => utils.model3d.getAll.invalidate()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Models Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : models && models.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {models.map((model: any) => (
              <Card key={model.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {model.thumbnail_url ? (
                    <img
                      src={model.thumbnail_url}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileBox className="w-16 h-16 text-muted-foreground" />
                  )}
                  <Badge
                    className="absolute top-2 right-2"
                    variant={model.is_public ? "default" : "secondary"}
                  >
                    {model.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg truncate">{model.name}</CardTitle>
                  <CardDescription className="truncate">
                    {model.description || "Không có mô tả"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Danh mục:</span>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === model.category)?.label ||
                          model.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Định dạng:</span>
                      <span className="uppercase">{model.model_format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kích thước:</span>
                      <span>{formatFileSize(model.file_size)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedModel(model);
                        setIsPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Xem
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(model)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(model)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Box className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Chưa có model 3D nào</h3>
              <p className="text-muted-foreground mb-4">
                Bắt đầu bằng cách upload model GLTF/GLB đầu tiên
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Model
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm Model 3D mới</DialogTitle>
              <DialogDescription>
                Upload file GLTF/GLB và điền thông tin model
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label>File Model (GLTF/GLB) *</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gltf,.glb"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploading ? "Đang upload..." : "Chọn file"}
                    </Button>
                    {formData.modelUrl && (
                      <span className="text-sm text-green-600 flex items-center">
                        ✓ Đã upload
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tên model *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="VD: CNC Machine"
                  />
                </div>
                <div>
                  <Label>Danh mục</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, category: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Mô tả chi tiết về model..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nhà sản xuất</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))
                    }
                    placeholder="VD: Fanuc"
                  />
                </div>
                <div>
                  <Label>Mã model</Label>
                  <Input
                    value={formData.modelNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, modelNumber: e.target.value }))
                    }
                    placeholder="VD: ROBODRILL α-D21MiB5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Scale mặc định</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultScale}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultScale: parseFloat(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationX}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationX: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationY}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationY: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationZ}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationZ: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                  }
                />
                <Label htmlFor="isPublic">Cho phép sử dụng công khai</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !formData.modelUrl}
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo Model"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa Model 3D</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin model
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tên model *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Danh mục</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData((prev) => ({ ...prev, category: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nhà sản xuất</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Mã model</Label>
                  <Input
                    value={formData.modelNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, modelNumber: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Scale</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultScale}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultScale: parseFloat(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation X</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationX}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationX: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation Y</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationY}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationY: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Rotation Z</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultRotationZ}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRotationZ: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublicEdit"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                  }
                />
                <Label htmlFor="isPublicEdit">Cho phép sử dụng công khai</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                {selectedModel?.name}
              </DialogTitle>
              <DialogDescription>
                Xem trước model 3D - Sử dụng chuột để xoay, zoom và di chuyển
              </DialogDescription>
            </DialogHeader>

            <div className="h-[500px] rounded-lg overflow-hidden">
              {selectedModel?.model_url ? (
                <Model3DViewer
                  modelUrl={selectedModel.model_url}
                  modelName={selectedModel.name}
                  modelFormat={selectedModel.model_format || 'glb'}
                  defaultScale={Number(selectedModel.default_scale) || 1}
                  defaultRotationX={Number(selectedModel.default_rotation_x) || 0}
                  defaultRotationY={Number(selectedModel.default_rotation_y) || 0}
                  defaultRotationZ={Number(selectedModel.default_rotation_z) || 0}
                  showControls={true}
                  showInfo={true}
                  autoRotate={false}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <FileBox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Không có file model</p>
                  </div>
                </div>
              )}
            </div>

            {selectedModel && (
              <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
                <div>
                  <span className="text-muted-foreground">Danh mục:</span>{" "}
                  <Badge variant="outline">
                    {CATEGORIES.find((c) => c.value === selectedModel.category)?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Định dạng:</span>{" "}
                  <Badge>{selectedModel.model_format?.toUpperCase()}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Kích thước file:</span>{" "}
                  {formatFileSize(selectedModel.file_size)}
                </div>
                <div>
                  <span className="text-muted-foreground">Nhà sản xuất:</span>{" "}
                  {selectedModel.manufacturer || "N/A"}
                </div>
                <div>
                  <span className="text-muted-foreground">Mã model:</span>{" "}
                  {selectedModel.model_number || "N/A"}
                </div>
                <div>
                  <span className="text-muted-foreground">Scale mặc định:</span>{" "}
                  {selectedModel.default_scale || 1}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(selectedModel?.model_url, "_blank")}
                disabled={!selectedModel?.model_url}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải xuống file
              </Button>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Xác nhận xóa Model 3D
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa model này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>

            {modelToDelete && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  {modelToDelete.thumbnail_url ? (
                    <img
                      src={modelToDelete.thumbnail_url}
                      alt={modelToDelete.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
                      <FileBox className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{modelToDelete.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === modelToDelete.category)?.label || modelToDelete.category}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setModelToDelete(null);
                }}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa Model
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Preview Dialog */}
        <Dialog open={isUploadPreviewOpen} onOpenChange={(open) => {
          if (!open) cancelUploadPreview();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Xem trước Model 3D
              </DialogTitle>
              <DialogDescription>
                Kiểm tra model trước khi upload. Sử dụng chuột để xoay, zoom và di chuyển.
              </DialogDescription>
            </DialogHeader>

            <div className="h-[400px] rounded-lg overflow-hidden border bg-muted">
              {uploadPreviewUrl && (
                <Model3DViewer
                  modelUrl={uploadPreviewUrl}
                  modelName={pendingFile?.name || "Preview"}
                  modelFormat={formData.modelFormat as 'glb' | 'gltf'}
                  defaultScale={1}
                  showControls={true}
                  showInfo={true}
                  autoRotate={true}
                />
              )}
            </div>

            {pendingFile && (
              <div className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
                <div>
                  <span className="text-muted-foreground">Tên file:</span>{" "}
                  <span className="font-medium">{pendingFile.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Định dạng:</span>{" "}
                  <Badge>{formData.modelFormat.toUpperCase()}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Kích thước:</span>{" "}
                  {formatFileSize(pendingFile.size)}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={cancelUploadPreview}>
                Hủy
              </Button>
              <Button onClick={confirmUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Xác nhận Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
