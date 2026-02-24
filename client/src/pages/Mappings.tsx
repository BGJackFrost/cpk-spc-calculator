import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileSpreadsheet, Loader2, Filter, ChevronDown, ChevronUp, X, Eye, CheckCircle, XCircle, Database, Download, Upload, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/_core/hooks/useAuth";
import { useKeyboardShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

interface MappingFormData {
  productCode: string;
  stationName: string;
  connectionId: number;
  tableName: string;
  productCodeColumn: string;
  stationColumn: string;
  valueColumn: string;
  timestampColumn: string;
  usl?: number;
  lsl?: number;
  target?: number;
}

const defaultFormData: MappingFormData = {
  productCode: "",
  stationName: "",
  connectionId: 0,
  tableName: "",
  productCodeColumn: "product_code",
  stationColumn: "station",
  valueColumn: "value",
  timestampColumn: "timestamp",
};

interface FilterCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
  value: string;
}

export default function Mappings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MappingFormData>(defaultFormData);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);
  const [cloneData, setCloneData] = useState({ productCode: "", stationName: "" });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [skipExisting, setSkipExisting] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const { data: mappings, refetch } = trpc.mapping.list.useQuery();
  const { data: connections } = trpc.databaseConnection.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: templates } = trpc.mappingTemplate.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Dynamic schema loading - lấy danh sách bảng khi chọn connection
  const { data: tablesData, isLoading: loadingTables } = trpc.legacyDbConnection.getTables.useQuery(
    { connectionId: formData.connectionId },
    { enabled: formData.connectionId > 0 }
  );

  // Lấy danh sách cột khi chọn bảng
  const { data: columnsData, isLoading: loadingColumns } = trpc.legacyDbConnection.getColumns.useQuery(
    { connectionId: formData.connectionId, tableName: formData.tableName },
    { enabled: formData.connectionId > 0 && formData.tableName.length > 0 }
  );

  const utils = trpc.useUtils();

  // Test connection mutation
  const testConnectionMutation = trpc.legacyDbConnection.testConnectionById.useMutation({
    onSuccess: (result) => {
      setConnectionTestResult(result);
      setTestingConnection(false);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      setConnectionTestResult({ success: false, message: error.message });
      setTestingConnection(false);
      toast.error(error.message);
    },
  });

  // Preview data query
  const { data: previewData, isLoading: loadingPreview, refetch: refetchPreview } = trpc.legacyDbConnection.previewData.useQuery(
    {
      connectionId: formData.connectionId,
      tableName: formData.tableName,
      page: 1,
      pageSize: 10,
    },
    {
      enabled: showPreviewDialog && formData.connectionId > 0 && formData.tableName.length > 0,
    }
  );

  const createMutation = trpc.mapping.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo mapping thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.mapping.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật mapping thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.mapping.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa mapping thành công!");
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneMutation = trpc.mapping.clone.useMutation({
    onSuccess: () => {
      toast.success("Nhân bản mapping thành công!");
      setShowCloneDialog(false);
      setCloneSourceId(null);
      setCloneData({ productCode: "", stationName: "" });
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const importMutation = trpc.mapping.importAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Import thành công: ${result.imported} mapping, bỏ qua ${result.skipped}`);
      setShowImportDialog(false);
      setImportFile(null);
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
    setFilterConditions([]);
    setConnectionTestResult(null);
  };

  const handleTestConnection = () => {
    if (formData.connectionId <= 0) {
      toast.error("Vui lòng chọn kết nối database trước");
      return;
    }
    setTestingConnection(true);
    setConnectionTestResult(null);
    testConnectionMutation.mutate({ connectionId: formData.connectionId });
  };

  const handlePreviewData = () => {
    if (formData.connectionId <= 0 || !formData.tableName) {
      toast.error("Vui lòng chọn kết nối và bảng dữ liệu trước");
      return;
    }
    setShowPreviewDialog(true);
  };

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    onSave: () => {
      if (isDialogOpen) {
        handleSubmit();
      }
    },
    onNew: () => {
      resetForm();
      setIsDialogOpen(true);
    },
    onClose: () => {
      setIsDialogOpen(false);
      setEditingId(null);
    },
  });
  
  shortcuts.push({
    key: "/",
    ctrl: true,
    action: () => setShowShortcutsHelp(true),
    description: "Hiển thị phím tắt",
  });

  useKeyboardShortcuts({ shortcuts });

  const handleExportJSON = async () => {
    try {
      const data = await utils.mapping.exportAll.fetch();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mappings-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Xuất file thành công!");
    } catch (error) {
      toast.error("Lỗi khi xuất file");
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await utils.mapping.exportAll.fetch();
      const headers = ["productCode", "stationName", "connectionId", "tableName", "productCodeColumn", "stationColumn", "valueColumn", "timestampColumn", "usl", "lsl", "target"];
      const csvContent = [
        headers.join(","),
        ...data.mappings.map(m => headers.map(h => m[h as keyof typeof m] ?? "").join(","))
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mappings-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Xuất file CSV thành công!");
    } catch (error) {
      toast.error("Lỗi khi xuất file");
    }
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast.error("Vui lòng chọn file");
      return;
    }
    try {
      const text = await importFile.text();
      let mappingsData;
      if (importFile.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        mappingsData = parsed.mappings || parsed;
      } else if (importFile.name.endsWith(".csv")) {
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",");
        mappingsData = lines.slice(1).map(line => {
          const values = line.split(",");
          const obj: Record<string, string | number | null> = {};
          headers.forEach((h, i) => {
            const val = values[i]?.trim();
            if (["connectionId", "usl", "lsl", "target"].includes(h)) {
              obj[h] = val ? parseInt(val) : null;
            } else {
              obj[h] = val || "";
            }
          });
          return obj;
        });
      } else {
        toast.error("Định dạng file không hợp lệ. Vui lòng sử dụng JSON hoặc CSV.");
        return;
      }
      importMutation.mutate({ mappings: mappingsData, skipExisting });
    } catch (error) {
      toast.error("Lỗi khi đọc file: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleClone = (id: number) => {
    const mapping = mappings?.find(m => m.id === id);
    if (mapping) {
      setCloneSourceId(id);
      setCloneData({
        productCode: mapping.productCode + "-copy",
        stationName: mapping.stationName,
      });
      setShowCloneDialog(true);
    }
  };

  const handleCloneSubmit = () => {
    if (!cloneSourceId || !cloneData.productCode || !cloneData.stationName) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    cloneMutation.mutate({
      id: cloneSourceId,
      newProductCode: cloneData.productCode,
      newStationName: cloneData.stationName,
    });
  };

  const applyTemplate = (templateId: number) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        tableName: template.tableName || prev.tableName,
        productCodeColumn: template.productCodeColumn || "product_code",
        stationColumn: template.stationColumn || "station",
        valueColumn: template.valueColumn || "value",
        timestampColumn: template.timestampColumn || "timestamp",
        usl: template.defaultUsl ?? prev.usl,
        lsl: template.defaultLsl ?? prev.lsl,
        target: template.defaultTarget ?? prev.target,
      }));
      if (template.filterConditions) {
        try {
          const conditions = JSON.parse(template.filterConditions);
          setFilterConditions(conditions);
        } catch (e) {
          // Ignore parse errors
        }
      }
      toast.success(`Đã áp dụng template: ${template.name}`);
    }
  };

  const handleEdit = (mapping: typeof mappings extends (infer T)[] | undefined ? T : never) => {
    if (!mapping) return;
    setEditingId(mapping.id);
    setFormData({
      productCode: mapping.productCode,
      stationName: mapping.stationName,
      connectionId: mapping.connectionId,
      tableName: mapping.tableName,
      productCodeColumn: mapping.productCodeColumn,
      stationColumn: mapping.stationColumn,
      valueColumn: mapping.valueColumn,
      timestampColumn: mapping.timestampColumn,
      usl: mapping.usl ?? undefined,
      lsl: mapping.lsl ?? undefined,
      target: mapping.target ?? undefined,
    });
    // Load filter conditions from mapping
    if ((mapping as any).filterConditions) {
      try {
        const conditions = JSON.parse((mapping as any).filterConditions);
        setFilterConditions(conditions);
        setShowAdvancedFilter(conditions.length > 0);
      } catch {
        setFilterConditions([]);
      }
    } else {
      setFilterConditions([]);
    }
    setConnectionTestResult(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.productCode || !formData.stationName || !formData.connectionId || !formData.tableName) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // Prepare filter conditions JSON
    const validFilterConditions = filterConditions.filter(fc => fc.column && fc.value);
    const filterConditionsJson = validFilterConditions.length > 0 ? JSON.stringify(validFilterConditions) : null;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
        filterConditions: filterConditionsJson,
      });
    } else {
      createMutation.mutate({
        ...formData,
        filterConditions: filterConditionsJson ?? undefined,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa mapping này?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="elegant-card max-w-md">
            <CardHeader>
              <CardTitle>Không có quyền truy cập</CardTitle>
              <CardDescription>
                Chỉ admin mới có thể quản lý cấu hình mapping
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              Quản lý Mapping
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình mapping giữa sản phẩm, trạm và bảng dữ liệu
            </p>
          </div>
          <div className="flex gap-2">
            {/* Export Dropdown */}
            <div className="relative group">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Xuất
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              <div className="absolute right-0 mt-1 w-40 bg-popover border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent rounded-t-md"
                >
                  Xuất JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent rounded-b-md"
                >
                  Xuất CSV
                </button>
              </div>
            </div>
            {/* Import Button */}
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Nhập
            </Button>
            {/* Add Mapping Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm Mapping
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Sửa Mapping" : "Thêm Mapping mới"}</DialogTitle>
                <DialogDescription>
                  Cấu hình mapping giữa sản phẩm/trạm và bảng dữ liệu trong database
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Template Selector */}
                {templates && templates.length > 0 && !editingId && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-dashed">
                    <Label className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Áp dụng Template (tùy chọn)
                    </Label>
                    <Select onValueChange={(value) => applyTemplate(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn template để điền nhanh các trường" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex flex-col">
                              <span>{template.name}</span>
                              {template.category && (
                                <span className="text-xs text-muted-foreground">{template.category}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã sản phẩm *</Label>
                    <Input
                      value={formData.productCode}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                      placeholder="VD: PROD-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tên trạm *</Label>
                    <Input
                      value={formData.stationName}
                      onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                      placeholder="VD: Station-A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Database Connection *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.connectionId.toString()}
                        onValueChange={(value) => {
                          setFormData({ 
                            ...formData, 
                            connectionId: parseInt(value),
                            tableName: "", // Reset table khi đổi connection
                            productCodeColumn: "product_code",
                            stationColumn: "station",
                            valueColumn: "value",
                            timestampColumn: "timestamp",
                          });
                          setFilterConditions([]);
                          setConnectionTestResult(null);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Chọn connection" />
                        </SelectTrigger>
                        <SelectContent>
                          {connections?.map((conn) => (
                            <SelectItem key={conn.id} value={conn.id.toString()}>
                              {conn.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleTestConnection}
                        disabled={formData.connectionId <= 0 || testingConnection}
                        title="Test kết nối"
                      >
                        {testingConnection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : connectionTestResult?.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : connectionTestResult?.success === false ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Database className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {connectionTestResult && (
                      <p className={`text-xs ${connectionTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {connectionTestResult.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Tên bảng * {loadingTables && <Loader2 className="inline h-3 w-3 animate-spin" />}</Label>
                    <Select
                      value={formData.tableName}
                      onValueChange={(value) => {
                        setFormData({ 
                          ...formData, 
                          tableName: value,
                          productCodeColumn: "product_code",
                          stationColumn: "station",
                          valueColumn: "value",
                          timestampColumn: "timestamp",
                        });
                        setFilterConditions([]);
                      }}
                      disabled={!formData.connectionId || loadingTables}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.connectionId ? "Chọn bảng" : "Chọn connection trước"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tablesData?.tables?.map((table) => (
                          <SelectItem key={table} value={table}>
                            {table}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cột mã sản phẩm {loadingColumns && <Loader2 className="inline h-3 w-3 animate-spin" />}</Label>
                    <Select
                      value={formData.productCodeColumn}
                      onValueChange={(value) => setFormData({ ...formData, productCodeColumn: value })}
                      disabled={!formData.tableName || loadingColumns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cột" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsData?.columns?.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name} <span className="text-muted-foreground text-xs">({col.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cột trạm</Label>
                    <Select
                      value={formData.stationColumn}
                      onValueChange={(value) => setFormData({ ...formData, stationColumn: value })}
                      disabled={!formData.tableName || loadingColumns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cột" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsData?.columns?.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name} <span className="text-muted-foreground text-xs">({col.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cột giá trị</Label>
                    <Select
                      value={formData.valueColumn}
                      onValueChange={(value) => setFormData({ ...formData, valueColumn: value })}
                      disabled={!formData.tableName || loadingColumns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cột" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsData?.columns?.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name} <span className="text-muted-foreground text-xs">({col.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cột thời gian</Label>
                    <Select
                      value={formData.timestampColumn}
                      onValueChange={(value) => setFormData({ ...formData, timestampColumn: value })}
                      disabled={!formData.tableName || loadingColumns}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cột" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsData?.columns?.map((col) => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name} <span className="text-muted-foreground text-xs">({col.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>USL (Upper Spec Limit)</Label>
                    <Input
                      type="number"
                      value={formData.usl ?? ""}
                      onChange={(e) => setFormData({ ...formData, usl: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LSL (Lower Spec Limit)</Label>
                    <Input
                      type="number"
                      value={formData.lsl ?? ""}
                      onChange={(e) => setFormData({ ...formData, lsl: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Input
                      type="number"
                      value={formData.target ?? ""}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 90"
                    />
                  </div>
                </div>

                {/* Advanced Filter Section */}
                <Collapsible open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" type="button">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Bộ lọc nâng cao {filterConditions.length > 0 && `(${filterConditions.length} điều kiện)`}
                      </span>
                      {showAdvancedFilter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="text-sm text-muted-foreground">
                      Thêm các điều kiện lọc để tối ưu dữ liệu cần lấy từ bảng. Các điều kiện sẽ được kết hợp bằng AND.
                    </div>
                    
                    {filterConditions.map((condition, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Cột</Label>
                          <Select
                            value={condition.column}
                            onValueChange={(value) => {
                              const newConditions = [...filterConditions];
                              newConditions[index].column = value;
                              setFilterConditions(newConditions);
                            }}
                            disabled={!formData.tableName}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Chọn cột" />
                            </SelectTrigger>
                            <SelectContent>
                              {columnsData?.columns?.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Toán tử</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => {
                              const newConditions = [...filterConditions];
                              newConditions[index].operator = value as FilterCondition["operator"];
                              setFilterConditions(newConditions);
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="=">=</SelectItem>
                              <SelectItem value="!=">!=</SelectItem>
                              <SelectItem value=">">&gt;</SelectItem>
                              <SelectItem value="<">&lt;</SelectItem>
                              <SelectItem value=">=">&gt;=</SelectItem>
                              <SelectItem value="<=">&lt;=</SelectItem>
                              <SelectItem value="LIKE">LIKE</SelectItem>
                              <SelectItem value="IN">IN</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Giá trị</Label>
                          <Input
                            className="h-9"
                            value={condition.value}
                            onChange={(e) => {
                              const newConditions = [...filterConditions];
                              newConditions[index].value = e.target.value;
                              setFilterConditions(newConditions);
                            }}
                            placeholder={condition.operator === "IN" ? "val1,val2,val3" : "Giá trị"}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setFilterConditions(filterConditions.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterConditions([...filterConditions, { column: "", operator: "=", value: "" }]);
                      }}
                      disabled={!formData.tableName}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Thêm điều kiện
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter className="flex justify-between sm:justify-between">
                <Button 
                  type="button"
                  variant="secondary" 
                  onClick={handlePreviewData}
                  disabled={formData.connectionId <= 0 || !formData.tableName}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Xem trước dữ liệu
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingId ? "Cập nhật" : "Tạo mới"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Mappings Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Danh sách Mapping</CardTitle>
            <CardDescription>
              {mappings?.length || 0} mapping đã được cấu hình
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mappings && mappings.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã sản phẩm</TableHead>
                      <TableHead>Trạm</TableHead>
                      <TableHead>Bảng dữ liệu</TableHead>
                      <TableHead>USL</TableHead>
                      <TableHead>LSL</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">{mapping.productCode}</TableCell>
                        <TableCell>{mapping.stationName}</TableCell>
                        <TableCell className="font-mono text-sm">{mapping.tableName}</TableCell>
                        <TableCell>{mapping.usl ?? "-"}</TableCell>
                        <TableCell>{mapping.lsl ?? "-"}</TableCell>
                        <TableCell>{mapping.target ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleClone(mapping.id)}
                              title="Nhân bản"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(mapping)}
                              title="Sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mapping.id)}
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Chưa có mapping nào</h3>
                <p className="text-muted-foreground mt-1">
                  Thêm mapping để bắt đầu phân tích SPC/CPK
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Data Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Xem trước dữ liệu
            </DialogTitle>
            <DialogDescription>
              Hiển thị 10 dòng mẫu từ bảng <code className="bg-muted px-1 rounded">{formData.tableName}</code>
              {filterConditions.filter(fc => fc.column && fc.value).length > 0 && (
                <span> với {filterConditions.filter(fc => fc.column && fc.value).length} điều kiện lọc</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Đang tải dữ liệu...</span>
              </div>
            ) : previewData?.rows && previewData.rows.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Cột:</strong> <code className="bg-muted px-2 py-1 rounded text-xs">{previewData.columns?.join(', ')}</code>
                </div>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.columns?.map((key: string) => (
                          <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row: Record<string, unknown>, idx: number) => (
                        <TableRow key={idx}>
                          {previewData.columns?.map((col: string, cellIdx: number) => (
                            <TableCell key={cellIdx} className="font-mono text-sm">
                              {row[col] === null ? <span className="text-muted-foreground italic">NULL</span> : String(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm text-muted-foreground">
                  Hiển thị {previewData.total} dòng
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Không có dữ liệu</h3>
                <p className="text-muted-foreground mt-1">
                  Không tìm thấy dữ liệu phù hợp với các điều kiện lọc
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Nhập Mapping
            </DialogTitle>
            <DialogDescription>
              Nhập danh sách mapping từ file JSON hoặc CSV
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chọn file (JSON hoặc CSV)</Label>
              <Input
                type="file"
                accept=".json,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={skipExisting}
                onCheckedChange={setSkipExisting}
              />
              <Label>Bỏ qua mapping đã tồn tại</Label>
            </div>
            {importFile && (
              <div className="text-sm text-muted-foreground">
                File: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
            }}>
              Hủy
            </Button>
            <Button onClick={handleImportFile} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nhập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Nhân bản Mapping
            </DialogTitle>
            <DialogDescription>
              Tạo mapping mới từ mapping hiện có với mã sản phẩm và trạm mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mã sản phẩm mới *</Label>
              <Input
                value={cloneData.productCode}
                onChange={(e) => setCloneData({ ...cloneData, productCode: e.target.value })}
                placeholder="VD: PROD-002"
              />
            </div>
            <div className="space-y-2">
              <Label>Tên trạm mới *</Label>
              <Input
                value={cloneData.stationName}
                onChange={(e) => setCloneData({ ...cloneData, stationName: e.target.value })}
                placeholder="VD: Station-B"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCloneDialog(false);
              setCloneSourceId(null);
              setCloneData({ productCode: "", stationName: "" });
            }}>
              Hủy
            </Button>
            <Button onClick={handleCloneSubmit} disabled={cloneMutation.isPending}>
              {cloneMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nhân bản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        open={showShortcutsHelp} 
        onOpenChange={setShowShortcutsHelp}
        additionalShortcuts={[
          { keys: "Ctrl + S", description: "Lưu mapping" },
          { keys: "Ctrl + N", description: "Tạo mapping mới" },
        ]}
      />
    </DashboardLayout>
  );
}
