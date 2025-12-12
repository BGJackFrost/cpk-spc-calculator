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
import { Plus, Pencil, Trash2, FileSpreadsheet, Loader2, Filter, ChevronDown, ChevronUp, X, Eye, CheckCircle, XCircle, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/_core/hooks/useAuth";

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

  const { data: mappings, refetch } = trpc.mapping.list.useQuery();
  const { data: connections } = trpc.databaseConnection.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Dynamic schema loading - lấy danh sách bảng khi chọn connection
  const { data: tablesData, isLoading: loadingTables } = trpc.databaseConnection.getTables.useQuery(
    { connectionId: formData.connectionId },
    { enabled: formData.connectionId > 0 }
  );

  // Lấy danh sách cột khi chọn bảng
  const { data: columnsData, isLoading: loadingColumns } = trpc.databaseConnection.getColumns.useQuery(
    { connectionId: formData.connectionId, tableName: formData.tableName },
    { enabled: formData.connectionId > 0 && formData.tableName.length > 0 }
  );

  const utils = trpc.useUtils();

  // Test connection mutation
  const testConnectionMutation = trpc.databaseConnection.testConnectionById.useMutation({
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
  const { data: previewData, isLoading: loadingPreview, refetch: refetchPreview } = trpc.databaseConnection.previewData.useQuery(
    {
      connectionId: formData.connectionId,
      tableName: formData.tableName,
      columns: [formData.productCodeColumn, formData.stationColumn, formData.valueColumn, formData.timestampColumn].filter(Boolean),
      filterConditions: filterConditions.filter(fc => fc.column && fc.value),
      limit: 10,
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
                              onClick={() => handleEdit(mapping)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mapping.id)}
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
            ) : previewData?.data && previewData.data.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <strong>Query:</strong> <code className="bg-muted px-2 py-1 rounded text-xs">{previewData.query}</code>
                </div>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData.data[0]).map((key) => (
                          <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.data.map((row: Record<string, unknown>, idx: number) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((value, cellIdx) => (
                            <TableCell key={cellIdx} className="font-mono text-sm">
                              {value === null ? <span className="text-muted-foreground italic">NULL</span> : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm text-muted-foreground">
                  Hiển thị {previewData.rowCount} dòng
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
    </DashboardLayout>
  );
}
