import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock, Search, Filter, ShieldCheck, ShieldX, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

const SEVERITY_OPTIONS = [
  { value: "low", label: "Thấp", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Trung bình", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Cao", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Nghiêm trọng", color: "bg-red-100 text-red-800" },
];

const CATEGORY_OPTIONS = [
  { value: "Machine", label: "Máy móc (Machine)" },
  { value: "Material", label: "Nguyên vật liệu (Material)" },
  { value: "Method", label: "Phương pháp (Method)" },
  { value: "Man", label: "Con người (Man)" },
  { value: "Environment", label: "Môi trường (Environment)" },
  { value: "Measurement", label: "Đo lường (Measurement)" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Mở", color: "bg-red-100 text-red-800" },
  { value: "investigating", label: "Đang điều tra", color: "bg-yellow-100 text-yellow-800" },
  { value: "resolved", label: "Đã giải quyết", color: "bg-green-100 text-green-800" },
  { value: "closed", label: "Đã đóng", color: "bg-gray-100 text-gray-800" },
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: "pending", label: "Chưa xác nhận", color: "bg-gray-100 text-gray-800" },
  { value: "real_ng", label: "Real NG", color: "bg-red-100 text-red-800" },
  { value: "ntf", label: "NTF", color: "bg-blue-100 text-blue-800" },
];

const NTF_REASONS = [
  { value: "sensor_error", label: "Lỗi cảm biến" },
  { value: "false_detection", label: "Phát hiện sai" },
  { value: "calibration_issue", label: "Lỗi hiệu chuẩn" },
  { value: "operator_error", label: "Lỗi thao tác" },
  { value: "software_bug", label: "Lỗi phần mềm" },
  { value: "environmental", label: "Yếu tố môi trường" },
  { value: "other", label: "Khác" },
];

export default function DefectManagement() {
  const [activeTab, setActiveTab] = useState("categories");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  
  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
  });
  
  // Record form state
  const [recordForm, setRecordForm] = useState({
    defectCategoryId: 0,
    productionLineId: undefined as number | undefined,
    workstationId: undefined as number | undefined,
    productId: undefined as number | undefined,
    ruleViolated: "",
    quantity: 1,
    notes: "",
    occurredAt: new Date().toISOString().slice(0, 16),
  });
  
  // Filter state
  const [recordFilter, setRecordFilter] = useState({
    status: "",
    defectCategoryId: undefined as number | undefined,
  });

  // Verify dialog state
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyingRecord, setVerifyingRecord] = useState<any>(null);
  const [verifyForm, setVerifyForm] = useState({
    verificationStatus: "real_ng" as "real_ng" | "ntf",
    verificationNotes: "",
    ntfReason: "",
  });

  // NTF Statistics state
  const [ntfGroupBy, setNtfGroupBy] = useState<"hour" | "day" | "week" | "month">("day");
  const [ntfDateRange, setNtfDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  // Queries
  const { data: categories, refetch: refetchCategories } = trpc.defect.listCategories.useQuery();
  const { data: records, refetch: refetchRecords } = trpc.defect.listRecords.useQuery(
    recordFilter.status || recordFilter.defectCategoryId 
      ? { 
          status: recordFilter.status || undefined, 
          defectCategoryId: recordFilter.defectCategoryId 
        } 
      : undefined
  );
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();

  // NTF Statistics query
  const { data: ntfStats, refetch: refetchNtfStats } = trpc.defect.getNtfStatistics.useQuery({
    groupBy: ntfGroupBy,
    startDate: ntfDateRange.startDate,
    endDate: ntfDateRange.endDate,
  });

  // Pending verification query
  const { data: pendingVerification, refetch: refetchPending } = trpc.defect.getPendingVerification.useQuery({});

  // Mutations
  const createCategoryMutation = trpc.defect.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo danh mục lỗi");
      refetchCategories();
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCategoryMutation = trpc.defect.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật danh mục lỗi");
      refetchCategories();
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCategoryMutation = trpc.defect.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa danh mục lỗi");
      refetchCategories();
    },
    onError: (error) => toast.error(error.message),
  });

  const createRecordMutation = trpc.defect.createRecord.useMutation({
    onSuccess: () => {
      toast.success("Đã ghi nhận lỗi");
      refetchRecords();
      setRecordDialogOpen(false);
      resetRecordForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRecordMutation = trpc.defect.updateRecord.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật bản ghi lỗi");
      refetchRecords();
      setRecordDialogOpen(false);
      resetRecordForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRecordMutation = trpc.defect.deleteRecord.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa bản ghi lỗi");
      refetchRecords();
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyDefectMutation = trpc.defect.verifyDefect.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận lỗi");
      refetchRecords();
      refetchPending();
      refetchNtfStats();
      setVerifyDialogOpen(false);
      setVerifyingRecord(null);
      setVerifyForm({ verificationStatus: "real_ng", verificationNotes: "", ntfReason: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleVerifyDefect = () => {
    if (!verifyingRecord) return;
    verifyDefectMutation.mutate({
      id: verifyingRecord.id,
      verificationStatus: verifyForm.verificationStatus,
      verificationNotes: verifyForm.verificationNotes || undefined,
      ntfReason: verifyForm.verificationStatus === "ntf" ? verifyForm.ntfReason : undefined,
    });
  };

  const openVerifyDialog = (record: any) => {
    setVerifyingRecord(record);
    setVerifyForm({ verificationStatus: "real_ng", verificationNotes: "", ntfReason: "" });
    setVerifyDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ code: "", name: "", description: "", category: "", severity: "medium" });
    setEditingCategory(null);
  };

  const resetRecordForm = () => {
    setRecordForm({
      defectCategoryId: 0,
      productionLineId: undefined,
      workstationId: undefined,
      productId: undefined,
      ruleViolated: "",
      quantity: 1,
      notes: "",
      occurredAt: new Date().toISOString().slice(0, 16),
    });
    setEditingRecord(null);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      code: category.code,
      name: category.name,
      description: category.description || "",
      category: category.category || "",
      severity: category.severity,
    });
    setCategoryDialogOpen(true);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setRecordForm({
      defectCategoryId: record.defectCategoryId,
      productionLineId: record.productionLineId || undefined,
      workstationId: record.workstationId || undefined,
      productId: record.productId || undefined,
      ruleViolated: record.ruleViolated || "",
      quantity: record.quantity,
      notes: record.notes || "",
      occurredAt: new Date(record.occurredAt).toISOString().slice(0, 16),
    });
    setRecordDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleSaveRecord = () => {
    const data = {
      ...recordForm,
      occurredAt: new Date(recordForm.occurredAt),
    };
    if (editingRecord) {
      updateRecordMutation.mutate({ id: editingRecord.id, ...data });
    } else {
      createRecordMutation.mutate(data);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const option = SEVERITY_OPTIONS.find(o => o.value === severity);
    return <Badge className={option?.color || ""}>{option?.label || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge className={option?.color || ""}>{option?.label || status}</Badge>;
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || "N/A";
  };

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Lỗi SPC</h1>
          <p className="text-muted-foreground">Quản lý danh mục lỗi và ghi nhận các sự cố trong quy trình sản xuất</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories">Danh mục lỗi</TabsTrigger>
          <TabsTrigger value="records">Bản ghi lỗi</TabsTrigger>
          <TabsTrigger value="verification">
            <ShieldCheck className="h-4 w-4 mr-1" />
            Xác nhận lỗi
            {pendingVerification && pendingVerification.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{pendingVerification.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ntf-stats">
            <TrendingUp className="h-4 w-4 mr-1" />
            Thống kê NTF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
              setCategoryDialogOpen(open);
              if (!open) resetCategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm danh mục</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Sửa danh mục lỗi" : "Thêm danh mục lỗi"}</DialogTitle>
                  <DialogDescription>Định nghĩa loại lỗi trong quy trình sản xuất</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mã lỗi</Label>
                      <Input
                        value={categoryForm.code}
                        onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                        placeholder="DEF001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mức độ</Label>
                      <Select
                        value={categoryForm.severity}
                        onValueChange={(value) => setCategoryForm({ ...categoryForm, severity: value as "low" | "medium" | "high" | "critical" })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEVERITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tên lỗi</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Lỗi hàn thiếc"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nhóm lỗi (5M1E)</Label>
                    <Select
                      value={categoryForm.category}
                      onValueChange={(value) => setCategoryForm({ ...categoryForm, category: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn nhóm" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Mô tả chi tiết về loại lỗi..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Hủy</Button>
                  <Button onClick={handleSaveCategory}>Lưu</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách danh mục lỗi</CardTitle>
              <CardDescription>Các loại lỗi được định nghĩa trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã lỗi</TableHead>
                    <TableHead>Tên lỗi</TableHead>
                    <TableHead>Nhóm</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono">{category.code}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.category || "-"}</TableCell>
                      <TableCell>{getSeverityBadge(category.severity)}</TableCell>
                      <TableCell className="max-w-xs truncate">{category.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCategoryMutation.mutate({ id: category.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Chưa có danh mục lỗi nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Select
                value={recordFilter.status || "all"}
                onValueChange={(value) => setRecordFilter({ ...recordFilter, status: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                 <SelectItem value="all">Tất cả</SelectItem>
                   {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={recordFilter.defectCategoryId?.toString() || "all"}
                onValueChange={(value) => setRecordFilter({ ...recordFilter, defectCategoryId: value === "all" ? undefined : Number(value) })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo loại lỗi" />
                </SelectTrigger>
                <SelectContent>
                 <SelectItem value="all">Tất cả</SelectItem>
                   {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={recordDialogOpen} onOpenChange={(open) => {
              setRecordDialogOpen(open);
              if (!open) resetRecordForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Ghi nhận lỗi</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingRecord ? "Sửa bản ghi lỗi" : "Ghi nhận lỗi mới"}</DialogTitle>
                  <DialogDescription>Ghi nhận sự cố lỗi trong quy trình sản xuất</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loại lỗi *</Label>
                      <Select
                        value={recordForm.defectCategoryId?.toString() || ""}
                        onValueChange={(value) => setRecordForm({ ...recordForm, defectCategoryId: Number(value) })}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn loại lỗi" /></SelectTrigger>
                        <SelectContent>
                          {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.code} - {cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        min={1}
                        value={recordForm.quantity}
                        onChange={(e) => setRecordForm({ ...recordForm, quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Dây chuyền</Label>
                      <Select
                        value={recordForm.productionLineId?.toString() || ""}
                        onValueChange={(value) => setRecordForm({ ...recordForm, productionLineId: value ? Number(value) : undefined })}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn dây chuyền" /></SelectTrigger>
                        <SelectContent>
                          {productionLines?.map(line => (
                            <SelectItem key={line.id} value={line.id.toString()}>{line.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Công trạm</Label>
                      <Select
                        value={recordForm.workstationId?.toString() || ""}
                        onValueChange={(value) => setRecordForm({ ...recordForm, workstationId: value ? Number(value) : undefined })}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn công trạm" /></SelectTrigger>
                        <SelectContent>
                          {workstations?.map(ws => (
                            <SelectItem key={ws.id} value={ws.id.toString()}>{ws.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sản phẩm</Label>
                      <Select
                        value={recordForm.productId?.toString() || ""}
                        onValueChange={(value) => setRecordForm({ ...recordForm, productId: value ? Number(value) : undefined })}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                        <SelectContent>
                          {products?.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.code} - {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rule vi phạm</Label>
                      <Input
                        value={recordForm.ruleViolated}
                        onChange={(e) => setRecordForm({ ...recordForm, ruleViolated: e.target.value })}
                        placeholder="Rule 1, CPK, CA..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thời điểm xảy ra *</Label>
                      <Input
                        type="datetime-local"
                        value={recordForm.occurredAt}
                        onChange={(e) => setRecordForm({ ...recordForm, occurredAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ghi chú</Label>
                    <Textarea
                      value={recordForm.notes}
                      onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                      placeholder="Mô tả chi tiết về sự cố..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Hủy</Button>
                  <Button onClick={handleSaveRecord} disabled={!recordForm.defectCategoryId}>Lưu</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách bản ghi lỗi</CardTitle>
              <CardDescription>Các sự cố lỗi đã được ghi nhận</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời điểm</TableHead>
                    <TableHead>Loại lỗi</TableHead>
                    <TableHead>Rule vi phạm</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.occurredAt).toLocaleString("vi-VN")}</TableCell>
                      <TableCell className="font-medium">{getCategoryName(record.defectCategoryId)}</TableCell>
                      <TableCell>{record.ruleViolated || "-"}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditRecord(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRecordMutation.mutate({ id: record.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!records || records.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Chưa có bản ghi lỗi nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Xác nhận lỗi - Real NG / NTF
              </CardTitle>
              <CardDescription>
                Xác nhận các lỗi đã ghi nhận là lỗi thật (Real NG) hay không phải lỗi thật (NTF - Not True Fail)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingVerification && pendingVerification.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời điểm</TableHead>
                      <TableHead>Mã lỗi</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Rule vi phạm</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingVerification.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.occurredAt).toLocaleString('vi-VN')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories?.find((c: any) => c.id === record.defectCategoryId)?.code || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{record.ruleViolated || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.notes || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => {
                                setVerifyingRecord(record);
                                setVerifyForm({ verificationStatus: "real_ng", verificationNotes: "", ntfReason: "" });
                                setVerifyDialogOpen(true);
                              }}
                            >
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              Real NG
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setVerifyingRecord(record);
                                setVerifyForm({ verificationStatus: "ntf", verificationNotes: "", ntfReason: "" });
                                setVerifyDialogOpen(true);
                              }}
                            >
                              <ShieldX className="h-4 w-4 mr-1" />
                              NTF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có lỗi nào cần xác nhận</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NTF Statistics Tab */}
        <TabsContent value="ntf-stats" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Tổng lỗi</p>
                <p className="text-2xl font-bold">{ntfStats?.summary?.totalDefects || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Real NG</p>
                <p className="text-2xl font-bold text-red-500">{ntfStats?.summary?.realNg || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">NTF</p>
                <p className="text-2xl font-bold text-blue-500">{ntfStats?.summary?.ntf || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Chưa xác nhận</p>
                <p className="text-2xl font-bold text-gray-500">{ntfStats?.summary?.pending || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Tỉ lệ NTF</p>
                <p className="text-2xl font-bold text-orange-500">{ntfStats?.summary?.overallNtfRate || 0}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Nhóm theo</Label>
                  <Select value={ntfGroupBy} onValueChange={(v: any) => setNtfGroupBy(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Theo giờ</SelectItem>
                      <SelectItem value="day">Theo ngày</SelectItem>
                      <SelectItem value="week">Theo tuần</SelectItem>
                      <SelectItem value="month">Theo tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Từ ngày</Label>
                  <Input
                    type="date"
                    value={ntfDateRange.startDate.toISOString().slice(0, 10)}
                    onChange={(e) => setNtfDateRange({ ...ntfDateRange, startDate: new Date(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đến ngày</Label>
                  <Input
                    type="date"
                    value={ntfDateRange.endDate.toISOString().slice(0, 10)}
                    onChange={(e) => setNtfDateRange({ ...ntfDateRange, endDate: new Date(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NTF Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Xu hướng NTF theo thời gian
              </CardTitle>
              <CardDescription>
                Biểu đồ hiển thị tỉ lệ NTF và số lượng lỗi theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ntfStats?.data && ntfStats.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={ntfStats.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="total" stroke="#8884d8" name="Tổng lỗi" />
                    <Line yAxisId="left" type="monotone" dataKey="realNg" stroke="#ef4444" name="Real NG" />
                    <Line yAxisId="left" type="monotone" dataKey="ntf" stroke="#3b82f6" name="NTF" />
                    <Line yAxisId="right" type="monotone" dataKey="ntfRate" stroke="#f97316" name="Tỉ lệ NTF (%)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có dữ liệu thống kê</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NTF Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bố lỗi theo thời gian</CardTitle>
            </CardHeader>
            <CardContent>
              {ntfStats?.data && ntfStats.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ntfStats.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="realNg" stackId="a" fill="#ef4444" name="Real NG" />
                    <Bar dataKey="ntf" stackId="a" fill="#3b82f6" name="NTF" />
                    <Bar dataKey="pending" stackId="a" fill="#9ca3af" name="Chưa xác nhận" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận lỗi</DialogTitle>
            <DialogDescription>
              Xác nhận lỗi này là Real NG (lỗi thật) hay NTF (Not True Fail - không phải lỗi thật)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Loại xác nhận</Label>
              <Select
                value={verifyForm.verificationStatus}
                onValueChange={(v: "real_ng" | "ntf") => setVerifyForm({ ...verifyForm, verificationStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_ng">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-red-500" />
                      Real NG - Lỗi thật
                    </div>
                  </SelectItem>
                  <SelectItem value="ntf">
                    <div className="flex items-center gap-2">
                      <ShieldX className="h-4 w-4 text-blue-500" />
                      NTF - Không phải lỗi thật
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {verifyForm.verificationStatus === "ntf" && (
              <div className="space-y-2">
                <Label>Lý do NTF</Label>
                <Select
                  value={verifyForm.ntfReason}
                  onValueChange={(v) => setVerifyForm({ ...verifyForm, ntfReason: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lý do" />
                  </SelectTrigger>
                  <SelectContent>
                    {NTF_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ghi chú xác nhận</Label>
              <Textarea
                value={verifyForm.verificationNotes}
                onChange={(e) => setVerifyForm({ ...verifyForm, verificationNotes: e.target.value })}
                placeholder="Nhập ghi chú..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleVerifyDefect}
              disabled={verifyDefectMutation.isPending || (verifyForm.verificationStatus === "ntf" && !verifyForm.ntfReason)}
              className={verifyForm.verificationStatus === "real_ng" ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
            >
              Xác nhận {verifyForm.verificationStatus === "real_ng" ? "Real NG" : "NTF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
