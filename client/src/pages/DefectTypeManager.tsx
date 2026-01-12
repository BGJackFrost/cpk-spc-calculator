/**
 * DefectTypeManager - Quản lý loại lỗi AOI/AVI
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, AlertCircle, Search } from "lucide-react";

const CATEGORIES = [
  { value: "visual", label: "Visual (Ngoại quan)" },
  { value: "dimensional", label: "Dimensional (Kích thước)" },
  { value: "surface", label: "Surface (Bề mặt)" },
  { value: "structural", label: "Structural (Cấu trúc)" },
  { value: "other", label: "Other (Khác)" },
];

const SEVERITIES = [
  { value: "critical", label: "Critical", color: "bg-red-500" },
  { value: "major", label: "Major", color: "bg-orange-500" },
  { value: "minor", label: "Minor", color: "bg-yellow-500" },
  { value: "cosmetic", label: "Cosmetic", color: "bg-blue-500" },
];

type DefectType = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: "visual" | "dimensional" | "surface" | "structural" | "other";
  severity: "critical" | "major" | "minor" | "cosmetic";
  isActive: number;
};

export default function DefectTypeManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectType | null>(null);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "visual" as const,
    severity: "minor" as const,
  });

  const { data: defectTypes, refetch } = trpc.aoiAvi.defectTypes.list.useQuery();
  
  const createMutation = trpc.aoiAvi.defectTypes.create.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã thêm loại lỗi mới" });
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.aoiAvi.defectTypes.update.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật loại lỗi" });
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.aoiAvi.defectTypes.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa loại lỗi" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ code: "", name: "", description: "", category: "visual", severity: "minor" });
    setEditingDefect(null);
  };

  const handleEdit = (defect: DefectType) => {
    setEditingDefect(defect);
    setFormData({
      code: defect.code,
      name: defect.name,
      description: defect.description || "",
      category: defect.category,
      severity: defect.severity,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mã và tên loại lỗi", variant: "destructive" });
      return;
    }

    if (editingDefect) {
      updateMutation.mutate({ id: editingDefect.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa loại lỗi này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (defect: DefectType) => {
    updateMutation.mutate({ id: defect.id, isActive: defect.isActive === 1 ? false : true });
  };

  const filteredDefects = defectTypes?.filter(d => {
    const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || d.category === filterCategory;
    const matchesSeverity = filterSeverity === "all" || d.severity === filterSeverity;
    return matchesSearch && matchesCategory && matchesSeverity;
  }) || [];

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITIES.find(s => s.value === severity);
    return <Badge className={`${config?.color} text-white`}>{config?.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Loại lỗi</h1>
            <p className="text-muted-foreground">Định nghĩa và quản lý các loại lỗi cho AOI/AVI</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Thêm loại lỗi</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingDefect ? "Chỉnh sửa loại lỗi" : "Thêm loại lỗi mới"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã lỗi *</Label>
                    <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="VD: SCRATCH" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên lỗi *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Trầy xước" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả chi tiết về loại lỗi..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as typeof formData.category })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mức độ</Label>
                    <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v as typeof formData.severity })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingDefect ? "Cập nhật" : "Thêm mới"}
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
                  <Input placeholder="Tìm kiếm theo mã hoặc tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {CATEGORIES.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Mức độ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả mức độ</SelectItem>
                  {SEVERITIES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách loại lỗi</CardTitle>
            <CardDescription>Tổng cộng {filteredDefects.length} loại lỗi</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lỗi</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefects.map(defect => (
                  <TableRow key={defect.id}>
                    <TableCell className="font-mono font-medium">{defect.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{defect.name}</p>
                        {defect.description && <p className="text-xs text-muted-foreground line-clamp-1">{defect.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{CATEGORIES.find(c => c.value === defect.category)?.label}</Badge></TableCell>
                    <TableCell>{getSeverityBadge(defect.severity)}</TableCell>
                    <TableCell><Switch checked={defect.isActive === 1} onCheckedChange={() => handleToggleActive(defect)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(defect)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(defect.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDefects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Không tìm thấy loại lỗi nào</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
