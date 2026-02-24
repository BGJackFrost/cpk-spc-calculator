import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, Plus, Pencil, Trash2, Search, Filter, Settings2, 
  Target, Ruler, Clock, AlertTriangle, CheckCircle2, BarChart3,
  Copy, FileUp, Zap, Download, TrendingUp, TrendingDown, Activity
} from "lucide-react";

interface MeasurementStandard {
  id: number;
  productId: number;
  workstationId: number;
  machineId: number | null;
  measurementName: string;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  unit: string | null;
  sampleSize: number;
  sampleFrequency: number;
  samplingMethod: string | null;
  appliedSpcRules: string | null;
  cpkWarningThreshold: number | null;
  cpkCriticalThreshold: number | null;
  notes: string | null;
  isActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
}

interface Machine {
  id: number;
  name: string;
  code: string;
}

interface SpcRule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

// Đơn vị thời gian cho tần suất lấy mẫu
const TIME_UNITS = [
  { value: "second", label: "Giây", multiplier: 1 },
  { value: "minute", label: "Phút", multiplier: 60 },
  { value: "hour", label: "Giờ", multiplier: 3600 },
  { value: "day", label: "Ngày", multiplier: 86400 },
  { value: "week", label: "Tuần", multiplier: 604800 },
  { value: "month", label: "Tháng", multiplier: 2592000 },
  { value: "year", label: "Năm", multiplier: 31536000 },
];

// Phương pháp lấy mẫu với chú thích chi tiết
const SAMPLING_METHODS = [
  { 
    value: "random", 
    label: "Lấy mẫu ngẫu nhiên",
    description: "Mỗi mẫu được chọn ngẫu nhiên từ tổng thể, mỗi đơn vị có cơ hội được chọn như nhau. Phù hợp khi tổng thể đồng nhất.",
    useCase: "Sản xuất hàng loạt, kiểm tra chất lượng ngẫu nhiên"
  },
  { 
    value: "systematic", 
    label: "Lấy mẫu hệ thống",
    description: "Lấy mẫu theo khoảng cách cố định (VD: mỗi 10 sản phẩm lấy 1). Đơn giản và dễ thực hiện.",
    useCase: "Dây chuyền sản xuất liên tục, kiểm tra định kỳ"
  },
  { 
    value: "stratified", 
    label: "Lấy mẫu phân tầng",
    description: "Chia tổng thể thành các nhóm (tầng) rồi lấy mẫu từ mỗi nhóm. Đảm bảo đại diện cho tất cả các nhóm.",
    useCase: "Sản phẩm có nhiều biến thể, nhiều ca sản xuất"
  },
  { 
    value: "cluster", 
    label: "Lấy mẫu cụm",
    description: "Chia tổng thể thành các cụm, chọn ngẫu nhiên một số cụm và lấy toàn bộ mẫu trong cụm đó.",
    useCase: "Kiểm tra theo lô, theo pallet hoặc container"
  },
  { 
    value: "consecutive", 
    label: "Lấy mẫu liên tiếp",
    description: "Lấy các mẫu liên tiếp nhau theo thứ tự sản xuất. Phù hợp để phát hiện xu hướng.",
    useCase: "Theo dõi quy trình, phát hiện biến đổi theo thời gian"
  },
  { 
    value: "acceptance", 
    label: "Lấy mẫu chấp nhận (AQL)",
    description: "Lấy mẫu theo tiêu chuẩn AQL để quyết định chấp nhận/từ chối lô hàng.",
    useCase: "Kiểm tra nghiệm thu, kiểm tra đầu vào"
  },
  { 
    value: "skip_lot", 
    label: "Lấy mẫu bỏ qua lô",
    description: "Bỏ qua kiểm tra một số lô khi nhà cung cấp có lịch sử chất lượng tốt.",
    useCase: "Nhà cung cấp đã được chứng nhận, giảm chi phí kiểm tra"
  },
];

export default function MeasurementStandards() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<MeasurementStandard | null>(null);
  const [filterProductId, setFilterProductId] = useState<string>("all");
  const [filterWorkstationId, setFilterWorkstationId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  
  // Copy dialog state
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyingStandard, setCopyingStandard] = useState<MeasurementStandard | null>(null);
  const [copyTargetProductId, setCopyTargetProductId] = useState<string>("");
  const [copyTargetWorkstationId, setCopyTargetWorkstationId] = useState<string>("");
  const [copyTargetMachineId, setCopyTargetMachineId] = useState<string>("");
  const [copyNewName, setCopyNewName] = useState<string>("");
  
  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // Trend dialog state
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [selectedStandardForTrend, setSelectedStandardForTrend] = useState<MeasurementStandard | null>(null);
  
  const [formData, setFormData] = useState({
    measurementName: "",
    productId: "",
    workstationId: "",
    machineId: "",
    usl: "",
    lsl: "",
    target: "",
    unit: "",
    sampleSize: "5",
    sampleFrequency: "1",
    frequencyUnit: "hour",
    samplingMethod: "random",
    cpkWarningThreshold: "133",
    cpkCriticalThreshold: "100",
    notes: "",
  });
  const [selectedCpkRules, setSelectedCpkRules] = useState<string[]>([]);
  const [selectedCaRules, setSelectedCaRules] = useState<string[]>([]);

  // Queries
  const { data: standards, isLoading, refetch } = trpc.measurementStandard.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: spcRules } = trpc.rules.getSpcRules.useQuery();
  const { data: cpkRules } = trpc.rules.getCpkRules.useQuery();
  const { data: caRules } = trpc.rules.getCaRules.useQuery();
  const { data: spcHistory } = trpc.spc.history.useQuery({ limit: 100 });

  // Mutations
  const createMutation = trpc.measurementStandard.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo tiêu chuẩn đo mới");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.measurementStandard.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật tiêu chuẩn đo");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.measurementStandard.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa tiêu chuẩn đo");
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      measurementName: "",
      productId: "",
      workstationId: "",
      machineId: "",
      usl: "",
      lsl: "",
      target: "",
      unit: "",
      sampleSize: "5",
      sampleFrequency: "1",
      frequencyUnit: "hour",
      samplingMethod: "random",
      cpkWarningThreshold: "133",
      cpkCriticalThreshold: "100",
      notes: "",
    });
    setSelectedRules([]);
    setSelectedCpkRules([]);
    setSelectedCaRules([]);
    setEditingStandard(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Helper function to parse frequency from seconds to value and unit
  const parseFrequencyFromSeconds = (seconds: number): { value: string; unit: string } => {
    if (seconds >= 31536000 && seconds % 31536000 === 0) return { value: (seconds / 31536000).toString(), unit: "year" };
    if (seconds >= 2592000 && seconds % 2592000 === 0) return { value: (seconds / 2592000).toString(), unit: "month" };
    if (seconds >= 604800 && seconds % 604800 === 0) return { value: (seconds / 604800).toString(), unit: "week" };
    if (seconds >= 86400 && seconds % 86400 === 0) return { value: (seconds / 86400).toString(), unit: "day" };
    if (seconds >= 3600 && seconds % 3600 === 0) return { value: (seconds / 3600).toString(), unit: "hour" };
    if (seconds >= 60 && seconds % 60 === 0) return { value: (seconds / 60).toString(), unit: "minute" };
    return { value: seconds.toString(), unit: "second" };
  };

  const openEditDialog = (standard: MeasurementStandard) => {
    setEditingStandard(standard);
    const freq = parseFrequencyFromSeconds(standard.sampleFrequency);
    setFormData({
      measurementName: standard.measurementName || "",
      productId: standard.productId.toString(),
      workstationId: standard.workstationId.toString(),
      machineId: standard.machineId?.toString() || "",
      usl: standard.usl ? (standard.usl / 10000).toString() : "",
      lsl: standard.lsl ? (standard.lsl / 10000).toString() : "",
      target: standard.target ? (standard.target / 10000).toString() : "",
      unit: (standard as any).unit || "",
      sampleSize: standard.sampleSize.toString(),
      sampleFrequency: freq.value,
      frequencyUnit: freq.unit,
      samplingMethod: standard.samplingMethod || "random",
      cpkWarningThreshold: standard.cpkWarningThreshold?.toString() || "133",
      cpkCriticalThreshold: standard.cpkCriticalThreshold?.toString() || "100",
      notes: standard.notes || "",
    });
    // Parse applied rules
    if (standard.appliedSpcRules) {
      try {
        const rules = JSON.parse(standard.appliedSpcRules);
        setSelectedRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedRules([]);
      }
    } else {
      setSelectedRules([]);
    }
    // Parse CPK rules
    const stdAny = standard as any;
    if (stdAny.appliedCpkRules) {
      try {
        const rules = JSON.parse(stdAny.appliedCpkRules);
        setSelectedCpkRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedCpkRules([]);
      }
    } else {
      setSelectedCpkRules([]);
    }
    // Parse CA rules
    if (stdAny.appliedCaRules) {
      try {
        const rules = JSON.parse(stdAny.appliedCaRules);
        setSelectedCaRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedCaRules([]);
      }
    } else {
      setSelectedCaRules([]);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.measurementName || !formData.productId || !formData.workstationId || !formData.usl || !formData.lsl) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const usl = parseFloat(formData.usl);
    const lsl = parseFloat(formData.lsl);
    
    if (usl <= lsl) {
      toast.error("USL phải lớn hơn LSL");
      return;
    }

    // Calculate frequency in seconds based on unit
    const timeUnit = TIME_UNITS.find(u => u.value === formData.frequencyUnit);
    const frequencyInSeconds = (parseInt(formData.sampleFrequency) || 1) * (timeUnit?.multiplier || 3600);

    const data = {
      measurementName: formData.measurementName,
      productId: parseInt(formData.productId),
      workstationId: parseInt(formData.workstationId),
      machineId: formData.machineId ? parseInt(formData.machineId) : undefined,
      usl,
      lsl,
      target: formData.target ? parseFloat(formData.target) : undefined,
      unit: formData.unit || undefined,
      sampleSize: parseInt(formData.sampleSize) || 5,
      sampleFrequency: frequencyInSeconds,
      samplingMethod: formData.samplingMethod,
      appliedSpcRules: selectedRules.length > 0 ? JSON.stringify(selectedRules) : undefined,
      appliedCpkRules: selectedCpkRules.length > 0 ? JSON.stringify(selectedCpkRules) : undefined,
      appliedCaRules: selectedCaRules.length > 0 ? JSON.stringify(selectedCaRules) : undefined,
      cpkWarningThreshold: parseInt(formData.cpkWarningThreshold) || 133,
      cpkCriticalThreshold: parseInt(formData.cpkCriticalThreshold) || 100,
      notes: formData.notes || undefined,
    };

    if (editingStandard) {
      updateMutation.mutate({ id: editingStandard.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa tiêu chuẩn đo này?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Copy functions
  const openCopyDialog = (standard: MeasurementStandard) => {
    setCopyingStandard(standard);
    setCopyTargetProductId("");
    setCopyTargetWorkstationId("");
    setCopyTargetMachineId("");
    setCopyNewName(`${standard.measurementName} (Copy)`);
    setIsCopyDialogOpen(true);
  };

  const handleCopy = () => {
    if (!copyingStandard || !copyTargetProductId || !copyTargetWorkstationId || !copyNewName) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const data = {
      measurementName: copyNewName,
      productId: parseInt(copyTargetProductId),
      workstationId: parseInt(copyTargetWorkstationId),
      machineId: copyTargetMachineId ? parseInt(copyTargetMachineId) : undefined,
      usl: copyingStandard.usl ? copyingStandard.usl / 10000 : 0,
      lsl: copyingStandard.lsl ? copyingStandard.lsl / 10000 : 0,
      target: copyingStandard.target ? copyingStandard.target / 10000 : undefined,
      unit: (copyingStandard as any).unit || undefined,
      sampleSize: copyingStandard.sampleSize,
      sampleFrequency: copyingStandard.sampleFrequency,
      samplingMethod: copyingStandard.samplingMethod || "random",
      appliedSpcRules: copyingStandard.appliedSpcRules || undefined,
      appliedCpkRules: (copyingStandard as any).appliedCpkRules || undefined,
      appliedCaRules: (copyingStandard as any).appliedCaRules || undefined,
      cpkWarningThreshold: copyingStandard.cpkWarningThreshold || 133,
      cpkCriticalThreshold: copyingStandard.cpkCriticalThreshold || 100,
      notes: copyingStandard.notes || undefined,
    };

    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Đã sao chép tiêu chuẩn đo thành công");
        setIsCopyDialogOpen(false);
        setCopyingStandard(null);
      }
    });
  };

  const toggleRule = (ruleCode: string) => {
    setSelectedRules(prev => 
      prev.includes(ruleCode) 
        ? prev.filter(r => r !== ruleCode)
        : [...prev, ruleCode]
    );
  };

  // Helpers
  const getProductName = (id: number) => products?.find((p: Product) => p.id === id)?.name || "N/A";
  const getWorkstationName = (id: number) => workstations?.find((w: Workstation) => w.id === id)?.name || "N/A";
  const getMachineName = (id: number | null) => {
    if (!id) return "Tất cả máy";
    return machines?.find((m: Machine) => m.id === id)?.name || "N/A";
  };
  const getSamplingMethodLabel = (value: string) => 
    SAMPLING_METHODS.find(m => m.value === value)?.label || value;

  // Download Excel template
  const downloadExcelTemplate = () => {
    // Create CSV template (can be opened in Excel)
    const headers = [
      "Tên tiêu chuẩn",
      "Mã sản phẩm",
      "Mã công trạm",
      "Mã máy (tùy chọn)",
      "USL",
      "LSL",
      "Target (tùy chọn)",
      "Đơn vị (tùy chọn)",
      "Kích thước mẫu",
      "Tần suất (giây)",
      "Phương pháp lấy mẫu",
      "Ngưỡng CPK cảnh báo",
      "Ngưỡng CPK nguy hiểm",
      "Ghi chú"
    ];
    
    const exampleRow = [
      "Đo chiều dài sản phẩm A",
      "SP001",
      "WS001",
      "MC001",
      "10.5",
      "9.5",
      "10.0",
      "mm",
      "5",
      "3600",
      "random",
      "133",
      "100",
      "Ghi chú mẫu"
    ];

    const instructions = [
      "# Hướng dẫn:",
      "# - Mã sản phẩm: Phải khớp với mã sản phẩm trong hệ thống",
      "# - Mã công trạm: Phải khớp với mã công trạm trong hệ thống",
      "# - Mã máy: Để trống nếu áp dụng cho tất cả máy",
      "# - Phương pháp lấy mẫu: random, systematic, stratified, cluster, consecutive, acceptance, skip_lot",
      "# - Tần suất: Tính bằng giây (VD: 3600 = 1 giờ)",
      ""
    ];

    const csvContent = [
      ...instructions,
      headers.join(","),
      exampleRow.join(",")
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "measurement_standards_template.csv";
    link.click();
    toast.success("Đã tải mẫu Excel (CSV)");
  };

  // Export data to Excel
  const exportToExcel = () => {
    if (!standards || standards.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    const headers = [
      "ID",
      "Tên tiêu chuẩn",
      "Sản phẩm",
      "Mã sản phẩm",
      "Công trạm",
      "Mã công trạm",
      "Máy",
      "Mã máy",
      "USL",
      "LSL",
      "Target",
      "Đơn vị",
      "Kích thước mẫu",
      "Tần suất (giây)",
      "Phương pháp lấy mẫu",
      "Ngưỡng CPK cảnh báo",
      "Ngưỡng CPK nguy hiểm",
      "SPC Rules",
      "Trạng thái",
      "Ghi chú"
    ];

    const rows = standards.map((s: MeasurementStandard) => {
      const product = products?.find((p: Product) => p.id === s.productId);
      const workstation = workstations?.find((w: Workstation) => w.id === s.workstationId);
      const machine = s.machineId ? machines?.find((m: Machine) => m.id === s.machineId) : null;
      
      let spcRulesStr = "";
      try {
        const rules = s.appliedSpcRules ? JSON.parse(s.appliedSpcRules) : [];
        spcRulesStr = Array.isArray(rules) ? rules.join(", ") : "";
      } catch { spcRulesStr = ""; }

      return [
        s.id,
        s.measurementName,
        product?.name || "",
        product?.code || "",
        workstation?.name || "",
        workstation?.code || "",
        machine?.name || "Tất cả máy",
        machine?.code || "",
        s.usl !== null ? (s.usl / 100).toFixed(2) : "",
        s.lsl !== null ? (s.lsl / 100).toFixed(2) : "",
        s.target !== null ? (s.target / 100).toFixed(2) : "",
        s.unit || "",
        s.sampleSize,
        s.sampleFrequency,
        getSamplingMethodLabel(s.samplingMethod || "random"),
        s.cpkWarningThreshold !== null ? (s.cpkWarningThreshold / 100).toFixed(2) : "",
        s.cpkCriticalThreshold !== null ? (s.cpkCriticalThreshold / 100).toFixed(2) : "",
        spcRulesStr,
        s.isActive === 1 ? "Hoạt động" : "Ngừng",
        s.notes || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `measurement_standards_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Đã xuất ${standards.length} tiêu chuẩn ra file Excel`);
  };

  // Handle file import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    // Parse CSV
    const text = await file.text();
    const lines = text.split("\n").filter(line => !line.startsWith("#") && line.trim());
    
    if (lines.length < 2) {
      toast.error("File không hợp lệ hoặc không có dữ liệu");
      return;
    }

    const headers = lines[0].split(",");
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(",");
      return {
        measurementName: values[0]?.trim() || "",
        productCode: values[1]?.trim() || "",
        workstationCode: values[2]?.trim() || "",
        machineCode: values[3]?.trim() || "",
        usl: parseFloat(values[4]) || 0,
        lsl: parseFloat(values[5]) || 0,
        target: values[6] ? parseFloat(values[6]) : null,
        unit: values[7]?.trim() || "",
        sampleSize: parseInt(values[8]) || 5,
        sampleFrequency: parseInt(values[9]) || 3600,
        samplingMethod: values[10]?.trim() || "random",
        cpkWarningThreshold: parseInt(values[11]) || 133,
        cpkCriticalThreshold: parseInt(values[12]) || 100,
        notes: values[13]?.trim() || "",
        // Validation status
        valid: true,
        errors: [] as string[]
      };
    });

    // Validate each row
    dataRows.forEach(row => {
      row.errors = [];
      if (!row.measurementName) row.errors.push("Thiếu tên tiêu chuẩn");
      if (!row.productCode) row.errors.push("Thiếu mã sản phẩm");
      if (!row.workstationCode) row.errors.push("Thiếu mã công trạm");
      if (row.usl <= row.lsl) row.errors.push("USL phải lớn hơn LSL");
      
      // Check if product exists
      const product = products?.find((p: Product) => p.code === row.productCode);
      if (!product) row.errors.push(`Không tìm thấy sản phẩm: ${row.productCode}`);
      
      // Check if workstation exists
      const workstation = workstations?.find((w: Workstation) => w.code === row.workstationCode);
      if (!workstation) row.errors.push(`Không tìm thấy công trạm: ${row.workstationCode}`);
      
      // Check if machine exists (if provided)
      if (row.machineCode) {
        const machine = machines?.find((m: Machine) => m.code === row.machineCode);
        if (!machine) row.errors.push(`Không tìm thấy máy: ${row.machineCode}`);
      }
      
      row.valid = row.errors.length === 0;
    });

    setImportPreview(dataRows);
  };

  // Execute import
  const executeImport = async () => {
    const validRows = importPreview.filter(row => row.valid);
    if (validRows.length === 0) {
      toast.error("Không có dữ liệu hợp lệ để import");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const product = products?.find((p: Product) => p.code === row.productCode);
        const workstation = workstations?.find((w: Workstation) => w.code === row.workstationCode);
        const machine = row.machineCode ? machines?.find((m: Machine) => m.code === row.machineCode) : null;

        if (!product || !workstation) {
          errorCount++;
          continue;
        }

        await createMutation.mutateAsync({
          measurementName: row.measurementName,
          productId: product.id,
          workstationId: workstation.id,
          machineId: machine?.id,
          usl: row.usl,
          lsl: row.lsl,
          target: row.target || undefined,
          unit: row.unit || undefined,
          sampleSize: row.sampleSize,
          sampleFrequency: row.sampleFrequency,
          samplingMethod: row.samplingMethod,
          cpkWarningThreshold: row.cpkWarningThreshold,
          cpkCriticalThreshold: row.cpkCriticalThreshold,
          notes: row.notes || undefined,
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    refetch();

    if (successCount > 0) {
      toast.success(`Đã import thành công ${successCount} tiêu chuẩn`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} tiêu chuẩn import thất bại`);
    }
  };

  // Filter standards
  const filteredStandards = useMemo(() => {
    if (!standards) return [];
    return standards.filter((s: MeasurementStandard) => {
      const matchProduct = filterProductId === "all" || s.productId.toString() === filterProductId;
      const matchWorkstation = filterWorkstationId === "all" || s.workstationId.toString() === filterWorkstationId;
      const matchSearch = !searchTerm || 
        getProductName(s.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getWorkstationName(s.workstationId).toLowerCase().includes(searchTerm.toLowerCase());
      return matchProduct && matchWorkstation && matchSearch;
    });
  }, [standards, filterProductId, filterWorkstationId, searchTerm, products, workstations]);

  // Stats
  const stats = useMemo(() => {
    if (!standards) return { total: 0, withTarget: 0, withRules: 0 };
    return {
      total: standards.length,
      withTarget: standards.filter((s: MeasurementStandard) => s.target !== null).length,
      withRules: standards.filter((s: MeasurementStandard) => s.appliedSpcRules && JSON.parse(s.appliedSpcRules).length > 0).length,
    };
  }, [standards]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/measurement-standards" className="font-medium text-primary">Tiêu chuẩn Đo lường</a>
          <span>•</span>
          <a href="/measurement-standards-dashboard" className="hover:text-primary">Dashboard</a>
          <span>•</span>
          <a href="/quick-spc-plan" className="hover:text-primary">Tạo nhanh SPC Plan</a>
          <span>•</span>
          <a href="/cpk-comparison" className="hover:text-primary">So sánh CPK</a>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tiêu chuẩn Đo lường</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý USL/LSL, Target và cấu hình SPC Rules cho từng Sản phẩm - Công trạm - Máy
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={downloadExcelTemplate}>
              <FileUp className="mr-2 h-4 w-4" />
              Tải mẫu Excel
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm tiêu chuẩn
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng tiêu chuẩn</CardTitle>
              <Ruler className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Cấu hình đo lường</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Có Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withTarget}</div>
              <p className="text-xs text-muted-foreground">Đã định nghĩa giá trị mục tiêu</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Có SPC Rules</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withRules}</div>
              <p className="text-xs text-muted-foreground">Đã cấu hình rules kiểm tra</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo sản phẩm, công trạm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterProductId} onValueChange={setFilterProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                    {products?.map((p: Product) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterWorkstationId} onValueChange={setFilterWorkstationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Công trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công trạm</SelectItem>
                    {workstations?.map((w: Workstation) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Standards Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Danh sách Tiêu chuẩn ({filteredStandards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Công trạm</TableHead>
                  <TableHead>Máy</TableHead>
                  <TableHead className="text-center">USL</TableHead>
                  <TableHead className="text-center">LSL</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Mẫu</TableHead>
                  <TableHead>Phương pháp</TableHead>
                  <TableHead>SPC Rules</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStandards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Chưa có tiêu chuẩn đo nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStandards.map((s: MeasurementStandard) => {
                    const appliedRules = s.appliedSpcRules ? JSON.parse(s.appliedSpcRules) : [];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{getProductName(s.productId)}</TableCell>
                        <TableCell>{getWorkstationName(s.workstationId)}</TableCell>
                        <TableCell>
                          <Badge variant={s.machineId ? "default" : "secondary"}>
                            {getMachineName(s.machineId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-red-600">{s.usl}</TableCell>
                        <TableCell className="text-center font-mono text-blue-600">{s.lsl}</TableCell>
                        <TableCell className="text-center font-mono text-green-600">
                          {s.target ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{s.sampleSize} / {s.sampleFrequency}h</Badge>
                        </TableCell>
                        <TableCell>{getSamplingMethodLabel(s.samplingMethod || "random")}</TableCell>
                        <TableCell>
                          {appliedRules.length > 0 ? (
                            <Badge variant="default" className="bg-green-600">
                              {appliedRules.length} rules
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Không có</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedStandardForTrend(s);
                              setIsTrendDialogOpen(true);
                            }} title="Xem xu hướng CPK">
                            <Activity className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openCopyDialog(s)} title="Sao chép">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(s)} title="Chỉnh sửa">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Xóa">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStandard ? "Chỉnh sửa Tiêu chuẩn đo" : "Thêm Tiêu chuẩn đo mới"}
              </DialogTitle>
              <DialogDescription>
                Cấu hình giới hạn đo lường và SPC Rules cho tổ hợp Sản phẩm - Công trạm - Máy
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                <TabsTrigger value="sampling">Lấy mẫu</TabsTrigger>
                <TabsTrigger value="rules">SPC Rules</TabsTrigger>
                <TabsTrigger value="cpk">CPK/CA</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tên tiêu chuẩn đo *</Label>
                  <Input
                    placeholder="VD: Đo chiều dài sản phẩm A tại trạm 1"
                    value={formData.measurementName}
                    onChange={(e) => setFormData({ ...formData, measurementName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sản phẩm *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => setFormData({ ...formData, productId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p: Product) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Công trạm *</Label>
                    <Select
                      value={formData.workstationId}
                      onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn công trạm" />
                      </SelectTrigger>
                      <SelectContent>
                        {workstations?.map((w: Workstation) => (
                          <SelectItem key={w.id} value={w.id.toString()}>
                            {w.code} - {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Máy (tùy chọn)</Label>
                  <Select
                    value={formData.machineId || "all"}
                    onValueChange={(value) => setFormData({ ...formData, machineId: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả máy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả máy</SelectItem>
                      {machines?.map((m: Machine) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.code} - {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Để trống nếu tiêu chuẩn áp dụng cho tất cả máy trong công trạm
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      USL (Giới hạn trên) *
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 10.5"
                      value={formData.usl}
                      onChange={(e) => setFormData({ ...formData, usl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      LSL (Giới hạn dưới) *
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 9.5"
                      value={formData.lsl}
                      onChange={(e) => setFormData({ ...formData, lsl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Target (Mục tiêu)
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 10.0"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <Input
                      placeholder="VD: mm, kg, °C"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sampling" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Kích thước mẫu
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.sampleSize}
                      onChange={(e) => setFormData({ ...formData, sampleSize: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Số lượng mẫu trong mỗi lần lấy</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Tần suất lấy mẫu
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.sampleFrequency}
                      onChange={(e) => setFormData({ ...formData, sampleFrequency: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Lấy mẫu mỗi X {TIME_UNITS.find(u => u.value === formData.frequencyUnit)?.label.toLowerCase()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị thời gian</Label>
                    <Select
                      value={formData.frequencyUnit}
                      onValueChange={(value) => setFormData({ ...formData, frequencyUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phương pháp lấy mẫu</Label>
                  <Select
                    value={formData.samplingMethod}
                    onValueChange={(value) => setFormData({ ...formData, samplingMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {SAMPLING_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{method.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hiển thị chú thích phương pháp đang chọn */}
                {formData.samplingMethod && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Settings2 className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm">
                          {SAMPLING_METHODS.find(m => m.value === formData.samplingMethod)?.label}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {SAMPLING_METHODS.find(m => m.value === formData.samplingMethod)?.description}
                        </p>
                        <p className="text-xs text-primary mt-2">
                          <strong>Ứng dụng:</strong> {SAMPLING_METHODS.find(m => m.value === formData.samplingMethod)?.useCase}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>SPC Rules áp dụng</Label>
                  <p className="text-sm text-muted-foreground">
                    Chọn các rules sẽ được kiểm tra khi phân tích SPC
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                  {spcRules?.map((rule: SpcRule) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleRule(rule.code)}
                    >
                      <Checkbox
                        checked={selectedRules.includes(rule.code)}
                        onCheckedChange={() => toggleRule(rule.code)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.code}</span>
                          <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                        )}
                      </div>
                      {selectedRules.includes(rule.code) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                  {(!spcRules || spcRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Chưa có SPC Rules nào. Vui lòng tạo rules trong trang Quản lý Rules.
                    </p>
                  )}
                </div>

                {selectedRules.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{selectedRules.length} rules đã chọn</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRules([])}>
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cpk" className="space-y-4 mt-4">
                {/* CPK Thresholds */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Ngưỡng cảnh báo CPK</Label>
                  <p className="text-sm text-muted-foreground">Cấu hình ngưỡng CPK để cảnh báo khi chất lượng giảm</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Ngưỡng cảnh báo (x100)
                    </Label>
                    <Input
                      type="number"
                      placeholder="133 = 1.33"
                      value={formData.cpkWarningThreshold}
                      onChange={(e) => setFormData({ ...formData, cpkWarningThreshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Nhập 133 cho CPK = 1.33</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Ngưỡng nguy hiểm (x100)
                    </Label>
                    <Input
                      type="number"
                      placeholder="100 = 1.00"
                      value={formData.cpkCriticalThreshold}
                      onChange={(e) => setFormData({ ...formData, cpkCriticalThreshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Nhập 100 cho CPK = 1.00</p>
                  </div>
                </div>

                {/* CPK Rules */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-medium">CPK Rules</Label>
                  <p className="text-sm text-muted-foreground">Chọn các rules CPK sẽ được kiểm tra</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-4">
                  {cpkRules?.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCpkRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCpkRules(prev => 
                        prev.includes(rule.code) ? prev.filter(r => r !== rule.code) : [...prev, rule.code]
                      )}
                    >
                      <Checkbox checked={selectedCpkRules.includes(rule.code)} />
                      <div className="flex-1">
                        <span className="font-medium">{rule.code}: {rule.name}</span>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                      </div>
                    </div>
                  ))}
                  {(!cpkRules || cpkRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-2">Chưa có CPK Rules</p>
                  )}
                </div>

                {/* CA Rules */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-medium">CA Rules (Process Capability)</Label>
                  <p className="text-sm text-muted-foreground">Chọn các rules CA sẽ được kiểm tra</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-4">
                  {caRules?.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCaRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCaRules(prev => 
                        prev.includes(rule.code) ? prev.filter(r => r !== rule.code) : [...prev, rule.code]
                      )}
                    >
                      <Checkbox checked={selectedCaRules.includes(rule.code)} />
                      <div className="flex-1">
                        <span className="font-medium">{rule.code}: {rule.name}</span>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                      </div>
                    </div>
                  ))}
                  {(!caRules || caRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-2">Chưa có CA Rules</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Ghi chú</Label>
                  <Input
                    placeholder="Ghi chú thêm về tiêu chuẩn đo..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
                {editingStandard ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Copy Dialog */}
        <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Sao chép Tiêu chuẩn đo
              </DialogTitle>
              <DialogDescription>
                Sao chép tiêu chuẩn đo sang sản phẩm/công trạm khác
              </DialogDescription>
            </DialogHeader>

            {copyingStandard && (
              <div className="space-y-4">
                {/* Source info */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Nguồn sao chép:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Tên:</strong> {copyingStandard.measurementName}</p>
                    <p><strong>Sản phẩm:</strong> {getProductName(copyingStandard.productId)}</p>
                    <p><strong>Công trạm:</strong> {getWorkstationName(copyingStandard.workstationId)}</p>
                    <p><strong>USL/LSL:</strong> {copyingStandard.usl} / {copyingStandard.lsl}</p>
                  </div>
                </div>

                {/* Target selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên tiêu chuẩn mới *</Label>
                    <Input
                      value={copyNewName}
                      onChange={(e) => setCopyNewName(e.target.value)}
                      placeholder="Nhập tên tiêu chuẩn mới"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sản phẩm đích *</Label>
                    <Select value={copyTargetProductId} onValueChange={setCopyTargetProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p: Product) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Công trạm đích *</Label>
                    <Select value={copyTargetWorkstationId} onValueChange={setCopyTargetWorkstationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn công trạm" />
                      </SelectTrigger>
                      <SelectContent>
                        {workstations?.map((w: Workstation) => (
                          <SelectItem key={w.id} value={w.id.toString()}>
                            {w.code} - {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Máy (tùy chọn)</Label>
                    <Select value={copyTargetMachineId || "all"} onValueChange={(v) => setCopyTargetMachineId(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả máy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả máy</SelectItem>
                        {machines?.map((m: Machine) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.code} - {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Tất cả các thông số khác (USL/LSL, Target, Sampling, Rules) sẽ được sao chép nguyên vẹn.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCopy} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sao chép
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setImportFile(null);
            setImportPreview([]);
          }
        }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Import Tiêu chuẩn đo từ Excel
              </DialogTitle>
              <DialogDescription>
                Tải lên file CSV/Excel để import hàng loạt tiêu chuẩn đo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* File upload */}
              <div className="space-y-2">
                <Label>Chọn file CSV</Label>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Tải mẫu Excel trước để biết định dạng cần thiết
                </p>
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Xem trước dữ liệu ({importPreview.length} dòng)</Label>
                    <div className="flex gap-2 text-sm">
                      <Badge variant="default" className="bg-green-600">
                        {importPreview.filter(r => r.valid).length} hợp lệ
                      </Badge>
                      <Badge variant="destructive">
                        {importPreview.filter(r => !r.valid).length} lỗi
                      </Badge>
                    </div>
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">TT</TableHead>
                          <TableHead>Tên tiêu chuẩn</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead>Công trạm</TableHead>
                          <TableHead>USL/LSL</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, idx) => (
                          <TableRow key={idx} className={!row.valid ? "bg-destructive/10" : ""}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell className="font-medium">{row.measurementName}</TableCell>
                            <TableCell>{row.productCode}</TableCell>
                            <TableCell>{row.workstationCode}</TableCell>
                            <TableCell>{row.usl} / {row.lsl}</TableCell>
                            <TableCell>
                              {row.valid ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Lỗi
                                  </Badge>
                                  <div className="text-xs text-destructive">
                                    {row.errors.join(", ")}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={executeImport} 
                disabled={isImporting || importPreview.filter(r => r.valid).length === 0}
              >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {importPreview.filter(r => r.valid).length} tiêu chuẩn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CPK Trend Dialog */}
        <Dialog open={isTrendDialogOpen} onOpenChange={setIsTrendDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Xu hướng CPK - {selectedStandardForTrend?.measurementName || 'Tiêu chuẩn đo'}
              </DialogTitle>
              <DialogDescription>
                Lịch sử phân tích CPK theo thời gian cho tiêu chuẩn này
              </DialogDescription>
            </DialogHeader>

            {selectedStandardForTrend && (() => {
              const productName = getProductName(selectedStandardForTrend.productId);
              const workstationName = getWorkstationName(selectedStandardForTrend.workstationId);
              
              // Filter SPC history for this standard
              const relevantHistory = spcHistory?.filter((h: any) => {
                // Match by product code and station name
                const product = products?.find((p: Product) => p.id === selectedStandardForTrend.productId);
                const workstation = workstations?.find((w: Workstation) => w.id === selectedStandardForTrend.workstationId);
                return h.productCode === product?.code && h.stationName === workstation?.name;
              }).slice(0, 20) || [];

              // Calculate trend
              const cpkValues = relevantHistory.map((h: any) => (h.cpk || 0) / 1000);
              const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a: number, b: number) => a + b, 0) / cpkValues.length : 0;
              const latestCpk = cpkValues.length > 0 ? cpkValues[0] : 0;
              const trend = cpkValues.length >= 2 ? cpkValues[0] - cpkValues[cpkValues.length - 1] : 0;

              return (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{latestCpk.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">CPK Hiện tại</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{avgCpk.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">CPK Trung bình</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            {Math.abs(trend).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Xu hướng</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{relevantHistory.length}</div>
                          <div className="text-xs text-muted-foreground">Số lần phân tích</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* CPK Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Biểu đồ CPK theo thời gian</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {relevantHistory.length > 0 ? (
                        <div className="h-[200px] relative">
                          <svg viewBox="0 0 700 180" className="w-full h-full">
                            {/* Grid lines */}
                            <line x1="50" y1="20" x2="50" y2="160" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="50" y1="160" x2="680" y2="160" stroke="#e5e7eb" strokeWidth="1" />
                            
                            {/* Warning threshold line */}
                            <line x1="50" y1="90" x2="680" y2="90" stroke="#f59e0b" strokeWidth="1" strokeDasharray="5,5" />
                            <text x="55" y="85" fontSize="10" fill="#f59e0b">Warning (1.33)</text>
                            
                            {/* Critical threshold line */}
                            <line x1="50" y1="130" x2="680" y2="130" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5" />
                            <text x="55" y="125" fontSize="10" fill="#ef4444">Critical (1.0)</text>
                            
                            {/* CPK line */}
                            {relevantHistory.length > 1 && (
                              <polyline
                                points={relevantHistory.map((h: any, i: number) => {
                                  const x = 680 - (i * (630 / Math.max(relevantHistory.length - 1, 1)));
                                  const cpk = (h.cpk || 0) / 1000;
                                  const y = 160 - Math.min(Math.max(cpk, 0), 2) * 70;
                                  return `${x},${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                              />
                            )}
                            
                            {/* Data points */}
                            {relevantHistory.map((h: any, i: number) => {
                              const x = 680 - (i * (630 / Math.max(relevantHistory.length - 1, 1)));
                              const cpk = (h.cpk || 0) / 1000;
                              const y = 160 - Math.min(Math.max(cpk, 0), 2) * 70;
                              const color = cpk >= 1.33 ? '#22c55e' : cpk >= 1.0 ? '#f59e0b' : '#ef4444';
                              return (
                                <g key={i}>
                                  <circle cx={x} cy={y} r="4" fill={color} />
                                  <title>{`CPK: ${cpk.toFixed(2)} - ${new Date(h.analyzedAt).toLocaleDateString('vi-VN')}`}</title>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          Chưa có dữ liệu phân tích cho tiêu chuẩn này
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Lịch sử phân tích</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ngày phân tích</TableHead>
                            <TableHead className="text-center">Số mẫu</TableHead>
                            <TableHead className="text-center">Mean</TableHead>
                            <TableHead className="text-center">StdDev</TableHead>
                            <TableHead className="text-center">CPK</TableHead>
                            <TableHead className="text-center">Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relevantHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                Chưa có lịch sử phân tích
                              </TableCell>
                            </TableRow>
                          ) : (
                            relevantHistory.map((h: any) => {
                              const cpk = (h.cpk || 0) / 1000;
                              return (
                                <TableRow key={h.id}>
                                  <TableCell>{new Date(h.analyzedAt).toLocaleString('vi-VN')}</TableCell>
                                  <TableCell className="text-center">{h.sampleCount}</TableCell>
                                  <TableCell className="text-center">{((h.mean || 0) / 1000).toFixed(3)}</TableCell>
                                  <TableCell className="text-center">{((h.stdDev || 0) / 1000).toFixed(4)}</TableCell>
                                  <TableCell className="text-center font-bold">
                                    <span className={cpk >= 1.33 ? 'text-green-600' : cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'}>
                                      {cpk.toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {cpk >= 1.33 ? (
                                      <Badge className="bg-green-600">Tốt</Badge>
                                    ) : cpk >= 1.0 ? (
                                      <Badge className="bg-yellow-600">Cảnh báo</Badge>
                                    ) : (
                                      <Badge variant="destructive">Nguy hiểm</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTrendDialogOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
