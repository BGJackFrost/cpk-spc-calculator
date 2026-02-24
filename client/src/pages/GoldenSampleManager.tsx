/**
 * GoldenSampleManager - Quản lý hình ảnh mẫu chuẩn
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { Plus, Pencil, Trash2, Image as ImageIcon, Search, ExternalLink } from "lucide-react";

const IMAGE_TYPES = [
  { value: "front", label: "Mặt trước" },
  { value: "back", label: "Mặt sau" },
  { value: "top", label: "Mặt trên" },
  { value: "bottom", label: "Mặt dưới" },
  { value: "left", label: "Mặt trái" },
  { value: "right", label: "Mặt phải" },
  { value: "angle", label: "Góc nghiêng" },
  { value: "other", label: "Khác" },
];

type GoldenSample = {
  id: number;
  name: string;
  description: string | null;
  productId: number | null;
  machineId: number | null;
  imageUrl: string;
  imageKey: string;
  imageType: "front" | "back" | "top" | "bottom" | "left" | "right" | "angle" | "other";
  version: string | null;
  isActive: number;
  createdAt: string;
};

export default function GoldenSampleManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<GoldenSample | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    imageKey: "",
    imageType: "front" as const,
    version: "1.0",
  });

  const { data: goldenSamples, refetch } = trpc.aoiAvi.goldenSample.list.useQuery();
  
  const createMutation = trpc.aoiAvi.goldenSample.create.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã thêm mẫu chuẩn mới" });
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.aoiAvi.goldenSample.update.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật mẫu chuẩn" });
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.aoiAvi.goldenSample.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa mẫu chuẩn" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", imageUrl: "", imageKey: "", imageType: "front", version: "1.0" });
    setEditingSample(null);
  };

  const handleEdit = (sample: GoldenSample) => {
    setEditingSample(sample);
    setFormData({
      name: sample.name,
      description: sample.description || "",
      imageUrl: sample.imageUrl,
      imageKey: sample.imageKey,
      imageType: sample.imageType,
      version: sample.version || "1.0",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.imageUrl) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên và upload hình ảnh", variant: "destructive" });
      return;
    }

    if (editingSample) {
      updateMutation.mutate({
        id: editingSample.id,
        name: formData.name,
        description: formData.description,
        imageType: formData.imageType,
        version: formData.version,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa mẫu chuẩn này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (sample: GoldenSample) => {
    updateMutation.mutate({ id: sample.id, isActive: sample.isActive === 1 ? false : true });
  };

  const handleUploadComplete = (url: string, fileKey: string) => {
    setFormData({ ...formData, imageUrl: url, imageKey: fileKey });
    toast({ title: "Thành công", description: "Đã tải lên hình ảnh" });
  };

  const filteredSamples = goldenSamples?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || s.imageType === filterType;
    return matchesSearch && matchesType;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Mẫu chuẩn</h1>
            <p className="text-muted-foreground">Quản lý hình ảnh Golden Sample cho AOI/AVI</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Thêm mẫu chuẩn</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSample ? "Chỉnh sửa mẫu chuẩn" : "Thêm mẫu chuẩn mới"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên mẫu *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: PCB Board A - Front View" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả chi tiết về mẫu chuẩn..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loại hình ảnh</Label>
                    <Select value={formData.imageType} onValueChange={(v) => setFormData({ ...formData, imageType: v as typeof formData.imageType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {IMAGE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Phiên bản</Label>
                    <Input id="version" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="1.0" />
                  </div>
                </div>
                {!editingSample && (
                  <div className="space-y-2">
                    <Label>Hình ảnh *</Label>
                    <ImageUploader
                      category="golden_sample"
                      onUploadComplete={handleUploadComplete}
                      onError={(err) => toast({ title: "Lỗi", description: err, variant: "destructive" })}
                    />
                    {formData.imageUrl && <p className="text-xs text-green-600">✓ Đã tải lên hình ảnh</p>}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSample ? "Cập nhật" : "Thêm mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tìm kiếm theo tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Loại hình ảnh" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {IMAGE_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSamples.map(sample => (
            <Card key={sample.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted cursor-pointer" onClick={() => setPreviewImage(sample.imageUrl)}>
                <img src={sample.imageUrl} alt={sample.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">{IMAGE_TYPES.find(t => t.value === sample.imageType)?.label}</Badge>
                  {sample.version && <Badge variant="outline" className="text-xs bg-background">v{sample.version}</Badge>}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{sample.name}</h3>
                    {sample.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{sample.description}</p>}
                  </div>
                  <Switch checked={sample.isActive === 1} onCheckedChange={() => handleToggleActive(sample)} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">{new Date(sample.createdAt).toLocaleDateString("vi-VN")}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(sample.imageUrl, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sample)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(sample.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSamples.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có mẫu chuẩn nào</p>
                <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm mẫu chuẩn" để bắt đầu</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Xem hình ảnh</DialogTitle></DialogHeader>
            {previewImage && <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain" />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
