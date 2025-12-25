import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Video,
  Play,
  Eye,
  ExternalLink,
  GripVertical,
  Search,
  Filter,
} from "lucide-react";

// Video categories
const VIDEO_CATEGORIES = [
  { value: "getting_started", label: "Bắt đầu sử dụng" },
  { value: "spc_analysis", label: "Phân tích SPC/CPK" },
  { value: "production_setup", label: "Thiết lập Sản xuất" },
  { value: "spc_plan", label: "Kế hoạch SPC" },
  { value: "realtime_monitoring", label: "Giám sát Realtime" },
  { value: "alerts_notifications", label: "Cảnh báo & Thông báo" },
  { value: "reports", label: "Báo cáo & Xuất dữ liệu" },
  { value: "admin", label: "Quản trị hệ thống" },
  { value: "mms", label: "Quản lý Thiết bị (MMS)" },
  { value: "knowledge", label: "Kiến thức SPC/CPK" },
];

// Video levels
const VIDEO_LEVELS = [
  { value: "beginner", label: "Cơ bản", color: "bg-green-500" },
  { value: "intermediate", label: "Trung cấp", color: "bg-yellow-500" },
  { value: "advanced", label: "Nâng cao", color: "bg-red-500" },
];

interface VideoFormData {
  title: string;
  description: string;
  youtubeUrl: string;
  duration: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  sortOrder: number;
  isActive: boolean;
}

const defaultFormData: VideoFormData = {
  title: "",
  description: "",
  youtubeUrl: "",
  duration: "",
  category: "getting_started",
  level: "beginner",
  sortOrder: 0,
  isActive: true,
};

export default function VideoManagement() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<number | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<VideoFormData>(defaultFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch videos
  const { data: videos, isLoading, refetch } = trpc.videoTutorial.list.useQuery({
    activeOnly: false,
    category: filterCategory !== "all" ? filterCategory : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const createMutation = trpc.videoTutorial.create.useMutation({
    onSuccess: () => {
      toast.success("Thêm video thành công!");
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Có lỗi xảy ra khi thêm video");
    },
  });

  const updateMutation = trpc.videoTutorial.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật video thành công!");
      setIsDialogOpen(false);
      setEditingVideo(null);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Có lỗi xảy ra khi cập nhật video");
    },
  });

  const deleteMutation = trpc.videoTutorial.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa video thành công!");
      setIsDeleteDialogOpen(false);
      setDeletingVideoId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Có lỗi xảy ra khi xóa video");
    },
  });

  // Check admin permission
  const isAdmin = user?.role === "admin" || user?.role === "manager";

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-500">Không có quyền truy cập</CardTitle>
              <CardDescription>
                Chỉ quản trị viên mới có quyền quản lý video hướng dẫn.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Extract YouTube ID for preview
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleOpenDialog = (video?: typeof videos extends (infer T)[] ? T : never) => {
    if (video) {
      setEditingVideo(video.id);
      setFormData({
        title: video.title,
        description: video.description || "",
        youtubeUrl: video.youtubeUrl,
        duration: video.duration || "",
        category: video.category,
        level: video.level as "beginner" | "intermediate" | "advanced",
        sortOrder: video.sortOrder,
        isActive: video.isActive === 1,
      });
      setPreviewUrl(video.youtubeId);
    } else {
      setEditingVideo(null);
      setFormData(defaultFormData);
      setPreviewUrl(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.youtubeUrl || !formData.category) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (editingVideo) {
      updateMutation.mutate({
        id: editingVideo,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    setDeletingVideoId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingVideoId) {
      deleteMutation.mutate({ id: deletingVideoId });
    }
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, youtubeUrl: url });
    const videoId = extractYouTubeId(url);
    setPreviewUrl(videoId);
  };

  const getCategoryLabel = (value: string) => {
    return VIDEO_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getLevelInfo = (value: string) => {
    return VIDEO_LEVELS.find((l) => l.value === value) || VIDEO_LEVELS[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Quản lý Video Hướng dẫn
            </h1>
            <p className="text-muted-foreground mt-1">
              Thêm, sửa, xóa video YouTube cho trang Hướng dẫn sử dụng
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm Video
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm video..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {VIDEO_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Videos Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Video ({videos?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải...
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[120px]">Thumbnail</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Cấp độ</TableHead>
                      <TableHead className="text-center">Lượt xem</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video, index) => (
                      <TableRow key={video.id}>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="relative w-[100px] h-[56px] rounded overflow-hidden bg-muted">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Video className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium truncate">{video.title}</p>
                            {video.duration && (
                              <p className="text-xs text-muted-foreground">
                                {video.duration}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCategoryLabel(video.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getLevelInfo(video.level).color} text-white`}
                          >
                            {getLevelInfo(video.level).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            {video.viewCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={video.isActive ? "default" : "secondary"}
                          >
                            {video.isActive ? "Hiển thị" : "Ẩn"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                window.open(video.youtubeUrl, "_blank")
                              }
                              title="Xem trên YouTube"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(video)}
                              title="Sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(video.id)}
                              className="text-red-500 hover:text-red-600"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Chưa có video nào. Nhấn "Thêm Video" để bắt đầu.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? "Sửa Video" : "Thêm Video Mới"}
              </DialogTitle>
              <DialogDescription>
                {editingVideo
                  ? "Cập nhật thông tin video hướng dẫn"
                  : "Thêm video YouTube mới vào trang hướng dẫn sử dụng"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* YouTube URL */}
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl">
                  URL YouTube <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="youtubeUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtubeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
                {previewUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-muted aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${previewUrl}`}
                      title="Video preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Tiêu đề <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Nhập tiêu đề video"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả ngắn về nội dung video"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* Category & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Danh mục <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cấp độ</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: "beginner" | "intermediate" | "advanced") =>
                      setFormData({ ...formData, level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cấp độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duration & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Thời lượng</Label>
                  <Input
                    id="duration"
                    placeholder="VD: 15:30"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Thứ tự sắp xếp</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Hiển thị video</Label>
                  <p className="text-sm text-muted-foreground">
                    Video sẽ hiển thị trên trang Hướng dẫn sử dụng
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Đang lưu..."
                  : editingVideo
                  ? "Cập nhật"
                  : "Thêm Video"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa video?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Video sẽ bị xóa vĩnh viễn khỏi
                hệ thống.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
