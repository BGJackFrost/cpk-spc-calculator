import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  CalendarIcon, 
  Loader2, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Download,
  Brain,
  FileSpreadsheet,
  FileText,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Streamdown } from "streamdown";
import AdvancedCharts from "@/components/AdvancedCharts";

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface SpcResult {
  id: number;
  sampleCount: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  cp: number | null;
  cpk: number | null;
  cpu: number | null;
  cpl: number | null;
  ucl: number;
  lcl: number;
  uclR: number;
  lclR: number;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  alertTriggered: boolean;
  xBarData: { index: number; value: number; timestamp: Date }[];
  rangeData: { index: number; value: number }[];
  rawData: { value: number; timestamp: Date }[];
}

interface Mapping {
  id: number;
  productCode: string;
  stationName: string;
  connectionId: number;
  tableName: string;
  valueColumn: string;
  timestampColumn: string;
  isActive: number;
}

export default function Analyze() {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedMapping, setSelectedMapping] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [result, setResult] = useState<SpcResult | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Lấy danh sách products từ bảng products
  const { data: products } = trpc.product.list.useQuery();
  
  // Lấy danh sách workstations
  const { data: workstations } = trpc.workstation.listAll.useQuery();
  
  // Lấy danh sách mappings
  const { data: allMappings } = trpc.mapping.list.useQuery();
  
  // Lấy tất cả workstations (không phụ thuộc vào mapping)
  const availableStations = useMemo(() => {
    if (!workstations) return [];
    return workstations.map((w: { id: number; name: string; code: string }) => ({
      id: w.id,
      name: w.name,
      code: w.code
    }));
  }, [workstations]);

  // Lọc mappings theo product và station đã chọn (optional)
  const availableMappings = useMemo(() => {
    if (!allMappings || !selectedProduct || !selectedStation) return [];
    const stationName = workstations?.find((w: { id: number; name: string }) => w.id.toString() === selectedStation)?.name || '';
    return allMappings.filter((m: Mapping) => 
      m.productCode === selectedProduct && 
      m.stationName === stationName && 
      m.isActive === 1
    );
  }, [allMappings, selectedProduct, selectedStation, workstations]);

  const analyzeMutation = trpc.spc.analyzeWithMapping.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.alertTriggered) {
        toast.warning("Cảnh báo: CPK dưới ngưỡng cho phép!");
      } else {
        toast.success("Phân tích hoàn tất!");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const exportPdfMutation = trpc.export.pdf.useMutation({
    onSuccess: (data) => {
      downloadFile(data.content, data.filename, 'text/html');
      toast.success("Đã xuất file PDF (HTML format)!");
    },
    onError: (error) => {
      toast.error("Lỗi xuất file: " + error.message);
    },
  });

  const exportExcelMutation = trpc.export.excel.useMutation({
    onSuccess: (data) => {
      downloadFile(data.content, data.filename, 'text/csv');
      toast.success("Đã xuất file Excel (CSV format)!");
    },
    onError: (error) => {
      toast.error("Lỗi xuất file: " + error.message);
    },
  });

  const llmMutation = trpc.spc.llmAnalysis.useMutation({
    onSuccess: (data) => {
      setLlmAnalysis(typeof data.analysis === 'string' ? data.analysis : "");
      toast.success("Phân tích AI hoàn tất!");
    },
    onError: (error) => {
      toast.error("Không thể phân tích: " + error.message);
    },
  });

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    setSelectedStation("");
    setSelectedMapping("");
  };

  const handleStationChange = (value: string) => {
    setSelectedStation(value);
    setSelectedMapping("");
  };

  const handleAnalyze = () => {
    if (!selectedProduct || !selectedStation || !startDate || !endDate || !selectedMapping) {
      toast.error("Vui lòng điền đầy đủ thông tin bao gồm Mapping");
      return;
    }

    analyzeMutation.mutate({
      mappingId: parseInt(selectedMapping),
      startDate,
      endDate,
    });
  };

  const handleExportPdf = () => {
    if (!result) return;
    setIsExporting(true);
    exportPdfMutation.mutate({
      productCode: selectedProduct,
      stationName: selectedStation,
      startDate: startDate!,
      endDate: endDate!,
      spcResult: {
        sampleCount: result.sampleCount,
        mean: result.mean,
        stdDev: result.stdDev,
        min: result.min,
        max: result.max,
        range: result.range,
        cp: result.cp,
        cpk: result.cpk,
        cpu: result.cpu,
        cpl: result.cpl,
        ucl: result.ucl,
        lcl: result.lcl,
        uclR: result.uclR,
        lclR: result.lclR,
        usl: result.usl,
        lsl: result.lsl,
      },
    }, {
      onSettled: () => setIsExporting(false),
    });
  };

  const handleExportExcel = () => {
    if (!result) return;
    setIsExporting(true);
    exportExcelMutation.mutate({
      productCode: selectedProduct,
      stationName: selectedStation,
      startDate: startDate!,
      endDate: endDate!,
      spcResult: {
        sampleCount: result.sampleCount,
        mean: result.mean,
        stdDev: result.stdDev,
        min: result.min,
        max: result.max,
        range: result.range,
        cp: result.cp,
        cpk: result.cpk,
        cpu: result.cpu,
        cpl: result.cpl,
        ucl: result.ucl,
        lcl: result.lcl,
        uclR: result.uclR,
        lclR: result.lclR,
        usl: result.usl,
        lsl: result.lsl,
      },
      rawData: result.rawData.map(d => ({
        value: d.value,
        timestamp: d.timestamp,
      })),
    }, {
      onSettled: () => setIsExporting(false),
    });
  };

  const handleLlmAnalysis = () => {
    if (!result) return;

    llmMutation.mutate({
      productCode: selectedProduct,
      stationName: selectedStation,
      spcData: {
        sampleCount: result.sampleCount,
        mean: result.mean,
        stdDev: result.stdDev,
        cp: result.cp,
        cpk: result.cpk,
        ucl: result.ucl,
        lcl: result.lcl,
        usl: result.usl,
        lsl: result.lsl,
      },
      xBarData: result.xBarData.map(d => ({ index: d.index, value: d.value })),
    });
  };

  const getCpkStatus = (cpk: number | null) => {
    if (cpk === null) return { color: "text-muted-foreground", label: "N/A", icon: null };
    if (cpk >= 1.67) return { color: "text-chart-3", label: "Xuất sắc", icon: CheckCircle2 };
    if (cpk >= 1.33) return { color: "text-chart-2", label: "Tốt", icon: CheckCircle2 };
    if (cpk >= 1.0) return { color: "text-warning", label: "Chấp nhận", icon: AlertTriangle };
    return { color: "text-destructive", label: "Không đạt", icon: AlertTriangle };
  };

  const xBarChartData = useMemo(() => {
    if (!result) return [];
    return result.xBarData.map(d => ({
      ...d,
      ucl: result.ucl,
      lcl: result.lcl,
      mean: result.mean,
    }));
  }, [result]);

  const rangeChartData = useMemo(() => {
    if (!result) return [];
    return result.rangeData.map(d => ({
      ...d,
      uclR: result.uclR,
      lclR: result.lclR,
    }));
  }, [result]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phân tích SPC/CPK</h1>
          <p className="text-muted-foreground mt-1">
            Chọn sản phẩm, trạm, thời gian và mapping để truy vấn dữ liệu từ database ngoài
          </p>
        </div>

        {/* Input Form */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Thông tin phân tích
            </CardTitle>
            <CardDescription>
              Chọn các tiêu chí để truy vấn dữ liệu từ database theo cấu hình mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              {/* Product Code */}
              <div className="space-y-2">
                <Label>Mã sản phẩm</Label>
                <Select value={selectedProduct} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mã sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.code}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Station */}
              <div className="space-y-2">
                <Label>Trạm sản xuất</Label>
                <Select 
                  value={selectedStation} 
                  onValueChange={handleStationChange}
                  disabled={!selectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStations.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name} ({station.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mapping Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  Mapping
                </Label>
                <Select 
                  value={selectedMapping} 
                  onValueChange={setSelectedMapping}
                  disabled={!selectedStation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mapping" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMappings.map((mapping: Mapping) => (
                      <SelectItem key={mapping.id} value={String(mapping.id)}>
                        {mapping.tableName} ({mapping.valueColumn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button 
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !selectedMapping}
                className="bg-primary hover:bg-primary/90"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Phân tích SPC/CPK
                  </>
                )}
              </Button>

              {result && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleLlmAnalysis}
                    disabled={llmMutation.isPending}
                  >
                    {llmMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang phân tích AI...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Phân tích AI
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleExportPdf}
                    disabled={isExporting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Xuất PDF
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleExportExcel}
                    disabled={isExporting}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Xuất Excel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card rounded-xl border border-border/50 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Số mẫu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.sampleCount}</div>
                </CardContent>
              </Card>

              <Card className="bg-card rounded-xl border border-border/50 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Trung bình (X̄)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.mean.toFixed(4)}</div>
                  <p className="text-xs text-muted-foreground">
                    σ = {result.stdDev.toFixed(4)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card rounded-xl border border-border/50 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {result.cp !== null ? result.cp.toFixed(3) : "N/A"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card rounded-xl border border-border/50 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    CPK
                    {getCpkStatus(result.cpk).icon && (
                      <span className={getCpkStatus(result.cpk).color}>
                        {(() => {
                          const Icon = getCpkStatus(result.cpk).icon;
                          return Icon ? <Icon className="h-4 w-4" /> : null;
                        })()}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", getCpkStatus(result.cpk).color)}>
                    {result.cpk !== null ? result.cpk.toFixed(3) : "N/A"}
                  </div>
                  <p className={cn("text-xs", getCpkStatus(result.cpk).color)}>
                    {getCpkStatus(result.cpk).label}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Control Limits */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>Giới hạn kiểm soát</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">UCL (X̄)</p>
                    <p className="text-lg font-semibold">{result.ucl.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">LCL (X̄)</p>
                    <p className="text-lg font-semibold">{result.lcl.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">USL</p>
                    <p className="text-lg font-semibold">
                      {result.usl !== null ? result.usl.toFixed(4) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">LSL</p>
                    <p className="text-lg font-semibold">
                      {result.lsl !== null ? result.lsl.toFixed(4) : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* X-bar Chart */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>X̄ Chart (Biểu đồ trung bình)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={xBarChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="index" />
                      <YAxis domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <ReferenceLine y={result.ucl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={result.lcl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="LCL" />
                      <ReferenceLine y={result.mean} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="X̄" />
                      {result.usl && <ReferenceLine y={result.usl} stroke="hsl(var(--warning))" strokeDasharray="2 2" label="USL" />}
                      {result.lsl && <ReferenceLine y={result.lsl} stroke="hsl(var(--warning))" strokeDasharray="2 2" label="LSL" />}
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2 }}
                        name="X̄"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* R Chart */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>R Chart (Biểu đồ phạm vi)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rangeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="index" />
                      <YAxis domain={[0, 'auto']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <ReferenceLine y={result.uclR} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={result.lclR} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="LCL" />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
                        name="Range"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Charts */}
            <AdvancedCharts 
              xBarData={result.xBarData}
              rangeData={result.rangeData}
              rawData={result.rawData}
              ucl={result.ucl}
              lcl={result.lcl}
              uclR={result.uclR}
              lclR={result.lclR}
              mean={result.mean}
              usl={result.usl}
              lsl={result.lsl}
            />

            {/* LLM Analysis */}
            {llmAnalysis && (
              <Card className="bg-card rounded-xl border border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Phân tích AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Streamdown>{llmAnalysis}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
