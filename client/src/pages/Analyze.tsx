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
  Brain
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
  BarChart,
  Bar,
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

export default function Analyze() {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [result, setResult] = useState<SpcResult | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<string>("");

  const { data: productCodes } = trpc.mapping.getProductCodes.useQuery();
  const { data: stations, refetch: refetchStations } = trpc.mapping.getStations.useQuery(
    { productCode: selectedProduct },
    { enabled: !!selectedProduct }
  );

  const analyzeMutation = trpc.spc.analyze.useMutation({
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

  const exportCsvMutation = trpc.export.csv.useMutation({
    onSuccess: (data) => {
      downloadFile(data.content, data.filename, 'text/csv');
      toast.success("Đã xuất file CSV!");
    },
    onError: (error) => {
      toast.error("Lỗi xuất file: " + error.message);
    },
  });

  const exportHtmlMutation = trpc.export.html.useMutation({
    onSuccess: (data) => {
      downloadFile(data.content, data.filename, 'text/html');
      toast.success("Đã xuất file HTML!");
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
    refetchStations();
  };

  const handleAnalyze = () => {
    if (!selectedProduct || !selectedStation || !startDate || !endDate) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    analyzeMutation.mutate({
      productCode: selectedProduct,
      stationName: selectedStation,
      startDate,
      endDate,
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
            Chọn sản phẩm, trạm và khoảng thời gian để phân tích
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
              Chọn các tiêu chí để truy vấn và phân tích dữ liệu kiểm tra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Product Code */}
              <div className="space-y-2">
                <Label>Mã sản phẩm</Label>
                <Select value={selectedProduct} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mã sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCodes?.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
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
                  onValueChange={setSelectedStation}
                  disabled={!selectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map((station) => (
                      <SelectItem key={station} value={station}>
                        {station}
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
            </div>

            <div className="mt-6 flex gap-3">
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending}
                className="min-w-[140px]"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Phân tích
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <Card className="stat-card">
                <span className="stat-label">Số mẫu</span>
                <span className="stat-value">{result.sampleCount}</span>
              </Card>
              <Card className="stat-card">
                <span className="stat-label">Trung bình</span>
                <span className="stat-value font-mono">{result.mean.toFixed(4)}</span>
              </Card>
              <Card className="stat-card">
                <span className="stat-label">Độ lệch chuẩn</span>
                <span className="stat-value font-mono">{result.stdDev.toFixed(4)}</span>
              </Card>
              <Card className="stat-card">
                <span className="stat-label">Cp</span>
                <span className="stat-value font-mono">
                  {result.cp?.toFixed(3) || "N/A"}
                </span>
              </Card>
              <Card className={cn("stat-card", result.alertTriggered && "border-destructive/50 bg-destructive/5")}>
                <span className="stat-label">Cpk</span>
                <div className="flex items-center gap-2">
                  <span className={cn("stat-value font-mono", getCpkStatus(result.cpk).color)}>
                    {result.cpk?.toFixed(3) || "N/A"}
                  </span>
                  {getCpkStatus(result.cpk).icon && (
                    <span className={getCpkStatus(result.cpk).color}>
                      {(() => {
                        const Icon = getCpkStatus(result.cpk).icon;
                        return Icon ? <Icon className="h-5 w-5" /> : null;
                      })()}
                    </span>
                  )}
                </div>
                <span className={cn("text-xs", getCpkStatus(result.cpk).color)}>
                  {getCpkStatus(result.cpk).label}
                </span>
              </Card>
              <Card className="stat-card">
                <span className="stat-label">Range</span>
                <span className="stat-value font-mono">{result.range.toFixed(4)}</span>
              </Card>
            </div>

            {/* Control Limits */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>Giới hạn kiểm soát</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">UCL (X-bar)</p>
                    <p className="text-xl font-mono font-semibold">{result.ucl.toFixed(4)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">LCL (X-bar)</p>
                    <p className="text-xl font-mono font-semibold">{result.lcl.toFixed(4)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">USL</p>
                    <p className="text-xl font-mono font-semibold">{result.usl ?? "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">LSL</p>
                    <p className="text-xl font-mono font-semibold">{result.lsl ?? "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* X-bar Chart */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>X-bar Control Chart</CardTitle>
                <CardDescription>Biểu đồ kiểm soát giá trị trung bình nhóm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={xBarChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="index" 
                        label={{ value: 'Subgroup', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--popover)', 
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                      <Legend />
                      <ReferenceLine y={result.ucl} stroke="var(--destructive)" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={result.mean} stroke="var(--chart-2)" strokeDasharray="3 3" label="Mean" />
                      <ReferenceLine y={result.lcl} stroke="var(--destructive)" strokeDasharray="5 5" label="LCL" />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--primary)" 
                        strokeWidth={2}
                        dot={{ fill: 'var(--primary)', strokeWidth: 2 }}
                        name="X-bar"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* R Chart */}
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>R Control Chart</CardTitle>
                <CardDescription>Biểu đồ kiểm soát phạm vi (Range)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rangeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="index" />
                      <YAxis domain={[0, 'auto']} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--popover)', 
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                      <Legend />
                      <ReferenceLine y={result.uclR} stroke="var(--destructive)" strokeDasharray="5 5" label="UCL-R" />
                      <Bar 
                        dataKey="value" 
                        fill="var(--chart-1)" 
                        name="Range"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Charts - XBar, R, Histograms, Sample Table */}
            <AdvancedCharts
              xBarData={result.xBarData}
              rangeData={result.rangeData}
              rawData={result.rawData}
              mean={result.mean}
              ucl={result.ucl}
              lcl={result.lcl}
              uclR={result.uclR}
              lclR={result.lclR}
              usl={result.usl}
              lsl={result.lsl}
            />

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                onClick={handleLlmAnalysis}
                disabled={llmMutation.isPending}
                variant="outline"
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
                onClick={() => {
                  if (!result || !startDate || !endDate) return;
                  exportHtmlMutation.mutate({
                    productCode: selectedProduct,
                    stationName: selectedStation,
                    startDate,
                    endDate,
                    spcResult: result,
                  });
                }}
                disabled={exportHtmlMutation.isPending}
              >
                {exportHtmlMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Xuất HTML
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (!result || !startDate || !endDate) return;
                  exportCsvMutation.mutate({
                    productCode: selectedProduct,
                    stationName: selectedStation,
                    startDate,
                    endDate,
                    spcResult: result,
                  });
                }}
                disabled={exportCsvMutation.isPending}
              >
                {exportCsvMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Xuất CSV
              </Button>
            </div>

            {/* LLM Analysis */}
            {llmAnalysis && (
              <Card className="bg-card rounded-xl border border-primary/30 bg-primary/5 shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Phân tích AI
                  </CardTitle>
                  <CardDescription>
                    Nhận xét và khuyến nghị từ AI dựa trên dữ liệu SPC
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Streamdown>{llmAnalysis}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
