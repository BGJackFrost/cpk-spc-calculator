import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function ExportRealtimeData() {
  const [exportType, setExportType] = useState<"spc" | "oee" | "maintenance">("spc");
  const [format, setFormat] = useState<"csv" | "excel" | "json">("csv");
  const [machineId, setMachineId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Fetch machines
  const { data: machines } = trpc.machine.listAll.useQuery();

  // Fetch OEE records
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery({
    machineId: machineId !== "all" ? parseInt(machineId) : undefined,
    startDate: dateFrom,
    endDate: dateTo,
    limit: 1000
  });

  // Field definitions for each export type
  const fieldDefinitions = {
    spc: [
      { id: "timestamp", label: "Thời gian", default: true },
      { id: "machineId", label: "Mã máy", default: true },
      { id: "machineName", label: "Tên máy", default: true },
      { id: "value", label: "Giá trị đo", default: true },
      { id: "ucl", label: "UCL", default: true },
      { id: "lcl", label: "LCL", default: true },
      { id: "mean", label: "Giá trị trung bình", default: true },
      { id: "cpk", label: "Cpk", default: true },
      { id: "cp", label: "Cp", default: false },
      { id: "ppk", label: "Ppk", default: false },
      { id: "pp", label: "Pp", default: false },
      { id: "stdDev", label: "Độ lệch chuẩn", default: false }
    ],
    oee: [
      { id: "recordDate", label: "Ngày", default: true },
      { id: "machineId", label: "Mã máy", default: true },
      { id: "machineName", label: "Tên máy", default: true },
      { id: "oee", label: "OEE (%)", default: true },
      { id: "availability", label: "Availability (%)", default: true },
      { id: "performance", label: "Performance (%)", default: true },
      { id: "quality", label: "Quality (%)", default: true },
      { id: "plannedProductionTime", label: "Thời gian kế hoạch (phút)", default: false },
      { id: "actualRunTime", label: "Thời gian chạy thực (phút)", default: false },
      { id: "totalOutput", label: "Tổng sản lượng", default: false },
      { id: "goodOutput", label: "Sản phẩm đạt", default: false },
      { id: "defectCount", label: "Số lỗi", default: false }
    ],
    maintenance: [
      { id: "workOrderNumber", label: "Số WO", default: true },
      { id: "machineId", label: "Mã máy", default: true },
      { id: "title", label: "Tiêu đề", default: true },
      { id: "status", label: "Trạng thái", default: true },
      { id: "priority", label: "Ưu tiên", default: true },
      { id: "createdAt", label: "Ngày tạo", default: true },
      { id: "completedAt", label: "Ngày hoàn thành", default: false },
      { id: "assignedTo", label: "Người thực hiện", default: false },
      { id: "description", label: "Mô tả", default: false },
      { id: "estimatedDuration", label: "Thời gian dự kiến", default: false },
      { id: "actualDuration", label: "Thời gian thực tế", default: false }
    ]
  };

  // Initialize selected fields when export type changes
  useState(() => {
    setSelectedFields(fieldDefinitions[exportType].filter(f => f.default).map(f => f.id));
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(fieldDefinitions[exportType].map(f => f.id));
  };

  const selectDefaultFields = () => {
    setSelectedFields(fieldDefinitions[exportType].filter(f => f.default).map(f => f.id));
  };

  // Convert data to CSV
  const convertToCSV = (data: any[], fields: string[]) => {
    if (!data || data.length === 0) return "";
    
    const headers = fields.map(f => {
      const field = fieldDefinitions[exportType].find(fd => fd.id === f);
      return field?.label || f;
    });
    
    const rows = data.map(row =>
      fields.map(f => {
        const value = row[f];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value).includes(",") ? `"${value}"` : value;
      }).join(",")
    );
    
    return [headers.join(","), ...rows].join("\n");
  };

  // Convert data to JSON
  const convertToJSON = (data: any[], fields: string[]) => {
    return JSON.stringify(
      data.map(row => {
        const filtered: any = {};
        fields.forEach(f => {
          filtered[f] = row[f];
        });
        return filtered;
      }),
      null,
      2
    );
  };

  // Download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle export
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Vui lòng chọn ít nhất một trường dữ liệu");
      return;
    }

    setIsExporting(true);
    try {
      let data: any[] = [];
      let filename = "";

      switch (exportType) {
        case "oee":
          data = oeeRecords || [];
          filename = `oee_data_${dateFrom}_${dateTo}`;
          break;
        case "spc":
          // Demo SPC data
          data = Array.from({ length: 100 }, (_, i) => ({
            timestamp: new Date(Date.now() - (100 - i) * 5 * 60 * 1000).toISOString(),
            machineId: machineId !== "all" ? machineId : "M001",
            machineName: "Máy CNC 01",
            value: 50 + Math.random() * 10 - 5,
            ucl: 55,
            lcl: 45,
            mean: 50,
            cpk: 1.33 + Math.random() * 0.2 - 0.1,
            cp: 1.45,
            ppk: 1.25,
            pp: 1.38,
            stdDev: 1.67
          }));
          filename = `spc_data_${dateFrom}_${dateTo}`;
          break;
        case "maintenance":
          // Demo maintenance data
          data = Array.from({ length: 20 }, (_, i) => ({
            workOrderNumber: `WO-2024-${String(i + 1).padStart(4, "0")}`,
            machineId: `M00${(i % 3) + 1}`,
            title: `Bảo trì định kỳ #${i + 1}`,
            status: ["pending", "in_progress", "completed"][i % 3],
            priority: ["low", "medium", "high"][i % 3],
            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: i % 3 === 2 ? new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString() : null,
            assignedTo: `KTV ${(i % 5) + 1}`,
            description: `Mô tả công việc bảo trì #${i + 1}`,
            estimatedDuration: 60 + Math.floor(Math.random() * 120),
            actualDuration: i % 3 === 2 ? 45 + Math.floor(Math.random() * 90) : null
          }));
          filename = `maintenance_data_${dateFrom}_${dateTo}`;
          break;
      }

      let content = "";
      let mimeType = "";
      let extension = "";

      switch (format) {
        case "csv":
          content = convertToCSV(data, selectedFields);
          mimeType = "text/csv;charset=utf-8";
          extension = "csv";
          break;
        case "json":
          content = convertToJSON(data, selectedFields);
          mimeType = "application/json";
          extension = "json";
          break;
        case "excel":
          // For Excel, we'll use CSV with BOM for proper UTF-8 encoding
          content = "\uFEFF" + convertToCSV(data, selectedFields);
          mimeType = "text/csv;charset=utf-8";
          extension = "csv";
          break;
      }

      downloadFile(content, `${filename}.${extension}`, mimeType);
      toast.success(`Đã xuất ${data.length} bản ghi thành công`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Xuất Dữ liệu Realtime</h1>
          <p className="text-muted-foreground">Xuất dữ liệu SPC, OEE và Maintenance ra CSV/Excel/JSON</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Settings */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cài đặt xuất dữ liệu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Type */}
                <Tabs value={exportType} onValueChange={(v) => {
                  const exportVal = v as "spc" | "oee" | "maintenance";
                  setExportType(exportVal);
                  setSelectedFields(fieldDefinitions[exportVal].filter((f) => f.default).map((f) => f.id));
                }}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="spc">SPC Data</TabsTrigger>
                    <TabsTrigger value="oee">OEE Data</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Máy</Label>
                    <Select value={machineId} onValueChange={setMachineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn máy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả máy</SelectItem>
                        {machines?.map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Từ ngày</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đến ngày</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Format Selection */}
                <div className="space-y-2">
                  <Label>Định dạng xuất</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={format === "csv" ? "default" : "outline"}
                      onClick={() => setFormat("csv")}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant={format === "excel" ? "default" : "outline"}
                      onClick={() => setFormat("excel")}
                      className="flex-1"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant={format === "json" ? "default" : "outline"}
                      onClick={() => setFormat("json")}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>

                {/* Field Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Chọn trường dữ liệu</Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllFields}>
                        Chọn tất cả
                      </Button>
                      <Button variant="ghost" size="sm" onClick={selectDefaultFields}>
                        Mặc định
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border rounded-lg">
                    {fieldDefinitions[exportType].map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <label
                          htmlFor={field.id}
                          className="text-sm cursor-pointer"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview & Export */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Xem trước</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Loại dữ liệu:</span>
                    <Badge variant="outline">
                      {exportType === "spc" ? "SPC" : exportType === "oee" ? "OEE" : "Maintenance"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Định dạng:</span>
                    <Badge variant="outline">{format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Số trường:</span>
                    <Badge variant="outline">{selectedFields.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Khoảng thời gian:</span>
                    <span className="text-xs">{dateFrom} - {dateTo}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleExport}
                  disabled={isExporting || selectedFields.length === 0}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Xuất dữ liệu
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Thống kê nhanh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportType === "oee" && oeeRecords && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Số bản ghi OEE:</span>
                        <Badge>{Array.isArray(oeeRecords) ? oeeRecords.length : 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">OEE trung bình:</span>
                        <Badge variant="outline">
                          {Array.isArray(oeeRecords) && oeeRecords.length > 0
                            ? (oeeRecords.reduce((sum: number, r: any) => sum + r.oee, 0) / oeeRecords.length).toFixed(1)
                            : 0}%
                        </Badge>
                      </div>
                    </>
                  )}
                  {exportType === "spc" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Số điểm dữ liệu:</span>
                        <Badge>100</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cpk trung bình:</span>
                        <Badge variant="outline">1.33</Badge>
                      </div>
                    </>
                  )}
                  {exportType === "maintenance" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Số Work Orders:</span>
                        <Badge>20</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hoàn thành:</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">7</Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
