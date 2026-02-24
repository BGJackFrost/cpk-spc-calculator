import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, Edit, Trash2, Building2, GitBranch, MapPin, Layers, 
  ChevronRight, ChevronDown, Settings, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Area {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parentId: number | null;
  type: "factory" | "line" | "zone" | "area" | null;
  sortOrder: number | null;
  isActive: number;
  children?: Area[];
  machineCount?: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  factory: <Building2 className="h-4 w-4" />,
  line: <GitBranch className="h-4 w-4" />,
  zone: <MapPin className="h-4 w-4" />,
  area: <Layers className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  factory: "Nhà máy",
  line: "Dây chuyền",
  zone: "Khu vực",
  area: "Vùng",
};

export default function MachineAreaManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [selectedAreaForAssign, setSelectedAreaForAssign] = useState<Area | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());
  const [selectedMachines, setSelectedMachines] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    parentId: null as number | null,
    type: "area" as "factory" | "line" | "zone" | "area",
    sortOrder: 0,
  });

  const { data: areas, refetch: refetchAreas } = trpc.machineArea.list.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: assignments, refetch: refetchAssignments } = trpc.machineArea.getAssignments.useQuery();

  const createMutation = trpc.machineArea.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo khu vực thành công");
      setDialogOpen(false);
      resetForm();
      refetchAreas();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.machineArea.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật khu vực thành công");
      setDialogOpen(false);
      resetForm();
      refetchAreas();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.machineArea.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa khu vực thành công");
      refetchAreas();
    },
    onError: (error) => toast.error(error.message),
  });

  const assignMutation = trpc.machineArea.assignMachines.useMutation({
    onSuccess: () => {
      toast.success("Gán máy thành công");
      setAssignDialogOpen(false);
      setSelectedMachines([]);
      refetchAssignments();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      parentId: null,
      type: "area",
      sortOrder: 0,
    });
    setEditingArea(null);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      code: area.code,
      description: area.description || "",
      parentId: area.parentId,
      type: area.type ?? "area",
      sortOrder: area.sortOrder ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAssignMachines = () => {
    if (!selectedAreaForAssign) return;
    assignMutation.mutate({
      areaId: selectedAreaForAssign.id,
      machineIds: selectedMachines,
    });
  };

  const toggleExpand = (areaId: number) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  // Build tree structure
  const buildTree = (items: Area[], parentId: number | null = null): Area[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
        machineCount: assignments?.filter(a => a.areaId === item.id).length || 0,
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  };

  const areaTree = areas ? buildTree(areas) : [];

  const renderAreaRow = (area: Area, level: number = 0): React.ReactNode => {
    const hasChildren = area.children && area.children.length > 0;
    const isExpanded = expandedAreas.has(area.id);

    return (
      <>
        <TableRow key={area.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleExpand(area.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              {area.type && typeIcons[area.type]}
              <span className="font-medium">{area.name}</span>
            </div>
          </TableCell>
          <TableCell>{area.code}</TableCell>
          <TableCell>
            <Badge variant="outline">{area.type ? typeLabels[area.type] : "N/A"}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">
              <Monitor className="h-3 w-3 mr-1" />
              {area.machineCount} máy
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={area.isActive ? "default" : "secondary"}>
              {area.isActive ? "Hoạt động" : "Tạm dừng"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedAreaForAssign(area);
                  setSelectedMachines(
                    assignments?.filter(a => a.areaId === area.id).map(a => a.machineId) || []
                  );
                  setAssignDialogOpen(true);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(area)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Bạn có chắc muốn xóa khu vực này?")) {
                    deleteMutation.mutate({ id: area.id });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && area.children?.map(child => renderAreaRow(child, level + 1))}
      </>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Khu vực / Dây chuyền</h1>
            <p className="text-muted-foreground">
              Tổ chức máy móc theo nhà máy, dây chuyền và khu vực
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm khu vực
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingArea ? "Sửa khu vực" : "Thêm khu vực mới"}</DialogTitle>
                <DialogDescription>
                  Tạo cấu trúc phân cấp cho máy móc
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên khu vực</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Dây chuyền 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mã khu vực</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="VD: LINE-01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loại</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="factory">Nhà máy</SelectItem>
                        <SelectItem value="line">Dây chuyền</SelectItem>
                        <SelectItem value="zone">Khu vực</SelectItem>
                        <SelectItem value="area">Vùng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thuộc khu vực</Label>
                    <Select
                      value={formData.parentId?.toString() || "none"}
                      onValueChange={(v) => setFormData({ ...formData, parentId: v === "none" ? null : parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Không có" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không có (Cấp cao nhất)</SelectItem>
                        {areas?.filter(a => a.id !== editingArea?.id).map(area => (
                          <SelectItem key={area.id} value={area.id.toString()}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả khu vực..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thứ tự sắp xếp</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingArea ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách khu vực</CardTitle>
            <CardDescription>Cấu trúc phân cấp các khu vực và dây chuyền</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khu vực</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Số máy</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[120px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaTree.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có khu vực nào. Nhấn "Thêm khu vực" để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  areaTree.map(area => renderAreaRow(area))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Machines Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gán máy vào khu vực: {selectedAreaForAssign?.name}</DialogTitle>
              <DialogDescription>
                Chọn các máy để gán vào khu vực này
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Chọn</TableHead>
                    <TableHead>Tên máy</TableHead>
                    <TableHead>Mã máy</TableHead>
                    <TableHead>Khu vực hiện tại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines?.map(machine => {
                    const currentAssignment = assignments?.find(a => a.machineId === machine.id);
                    const currentArea = currentAssignment ? areas?.find(a => a.id === currentAssignment.areaId) : null;
                    
                    return (
                      <TableRow key={machine.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMachines.includes(machine.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMachines([...selectedMachines, machine.id]);
                              } else {
                                setSelectedMachines(selectedMachines.filter(id => id !== machine.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{machine.name}</TableCell>
                        <TableCell>{machine.code}</TableCell>
                        <TableCell>
                          {currentArea ? (
                            <Badge variant="outline">{currentArea.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Chưa gán</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAssignMachines} disabled={assignMutation.isPending}>
                Lưu ({selectedMachines.length} máy)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
