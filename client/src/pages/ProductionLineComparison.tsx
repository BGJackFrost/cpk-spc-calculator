import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, 
  TrendingUp, 
  Factory,
  BarChart3,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from "recharts";

interface LineComparisonResult {
  lineId: number;
  lineName: string;
  lineCode: string;
  avgCpk: number;
  avgCp: number;
  totalSamples: number;
  analysisCount: number;
  passRate: number;
  bestStation: string;
  worstStation: string;
}

export default function ProductionLineComparison() {
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>("30");
  const [results, setResults] = useState<LineComparisonResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const { data: productionLines } = trpc.productionLine.list.useQuery();

  const toggleLine = (lineId: string) => {
    if (selectedLines.includes(lineId)) {
      setSelectedLines(selectedLines.filter(id => id !== lineId));
    } else {
      if (selectedLines.length >= 5) {
        toast.error("Tối đa 5 dây chuyền để so sánh");
        return;
      }
      setSelectedLines([...selectedLines, lineId]);
    }
  };

  const runComparison = async () => {
    if (selectedLines.length < 2) {
      toast.error("Vui lòng chọn ít nhất 2 dây chuyền để so sánh");
      return;
    }

    setIsComparing(true);

    // Simulate comparison results
    const mockResults: LineComparisonResult[] = selectedLines.map(lineId => {
      const line = productionLines?.find(l => l.id.toString() === lineId);
      return {
        lineId: parseInt(lineId),
        lineName: line?.name || `Dây chuyền ${lineId}`,
        lineCode: line?.code || `LINE-${lineId}`,
        avgCpk: Math.random() * 1.5 + 0.5,
        avgCp: Math.random() * 1.8 + 0.7,
        totalSamples: Math.floor(Math.random() * 5000) + 1000,
        analysisCount: Math.floor(Math.random() * 100) + 20,
        passRate: Math.random() * 30 + 70,
        bestStation: ["Solder Paste", "Pick & Place", "Reflow", "AOI"][Math.floor(Math.random() * 4)],
        worstStation: ["Wave Solder", "Manual Insert", "Testing", "Coating"][Math.floor(Math.random() * 4)],
      };
    });

    setTimeout(() => {
      setResults(mockResults.sort((a, b) => b.avgCpk - a.avgCpk));
      setIsComparing(false);
      toast.success("Đã hoàn thành so sánh");
    }, 1500);
  };

  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.33) return { color: "bg-green-500", icon: CheckCircle2, label: "Tốt" };
    if (cpk >= 1.0) return { color: "bg-yellow-500", icon: AlertTriangle, label: "Chấp nhận" };
    return { color: "bg-red-500", icon: XCircle, label: "Cần cải thiện" };
  };

  const barChartData = results.map(r => ({
    name: r.lineCode,
    fullName: r.lineName,
    cpk: parseFloat(r.avgCpk.toFixed(3)),
    cp: parseFloat(r.avgCp.toFixed(3)),
    passRate: parseFloat(r.passRate.toFixed(1)),
  }));

  const radarData = results.length > 0 ? [
    { metric: "CPK", ...Object.fromEntries(results.map(r => [r.lineCode, r.avgCpk])) },
    { metric: "CP", ...Object.fromEntries(results.map(r => [r.lineCode, r.avgCp])) },
    { metric: "Pass Rate (%)", ...Object.fromEntries(results.map(r => [r.lineCode, r.passRate / 100])) },
    { metric: "Samples (K)", ...Object.fromEntries(results.map(r => [r.lineCode, r.totalSamples / 5000])) },
  ] : [];

  const radarColors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6"];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowUpDown className="h-8 w-8" />
            So sánh CPK Dây chuyền
          </h1>
          <p className="text-muted-foreground mt-1">
            So sánh hiệu suất CPK/SPC giữa các dây chuyền sản xuất để xác định điểm mạnh và điểm cần cải thiện.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left: Select lines */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Chọn Dây chuyền
              </CardTitle>
              <CardDescription>
                Chọn 2-5 dây chuyền để so sánh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Khoảng thời gian</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày qua</SelectItem>
                    <SelectItem value="14">14 ngày qua</SelectItem>
                    <SelectItem value="30">30 ngày qua</SelectItem>
                    <SelectItem value="90">90 ngày qua</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dây chuyền ({selectedLines.length}/5)</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {productionLines?.map(line => (
                    <div 
                      key={line.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedLines.includes(line.id.toString()) 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => toggleLine(line.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{line.code}</div>
                          <div className="text-sm text-muted-foreground">{line.name}</div>
                        </div>
                        {selectedLines.includes(line.id.toString()) && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={runComparison} 
                disabled={selectedLines.length < 2 || isComparing}
                className="w-full"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang so sánh...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    So sánh ({selectedLines.length} dây chuyền)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-6">
            {results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chọn ít nhất 2 dây chuyền và nhấn "So sánh" để xem kết quả</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {results.slice(0, 3).map((r, index) => {
                    const status = getCpkStatus(r.avgCpk);
                    const StatusIcon = status.icon;
                    return (
                      <Card key={r.lineId} className={index === 0 ? "border-primary" : ""}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={index === 0 ? "default" : "outline"}>
                              #{index + 1}
                            </Badge>
                            <StatusIcon className={`h-5 w-5 ${
                              status.label === "Tốt" ? "text-green-500" :
                              status.label === "Chấp nhận" ? "text-yellow-500" : "text-red-500"
                            }`} />
                          </div>
                          <CardTitle className="text-lg">{r.lineName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{r.avgCpk.toFixed(3)}</div>
                          <p className="text-sm text-muted-foreground">CPK trung bình</p>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Pass Rate: </span>
                            <span className="font-medium">{r.passRate.toFixed(1)}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Charts */}
                <Tabs defaultValue="bar" className="w-full">
                  <TabsList>
                    <TabsTrigger value="bar">Biểu đồ Cột</TabsTrigger>
                    <TabsTrigger value="radar">Biểu đồ Radar</TabsTrigger>
                    <TabsTrigger value="table">Bảng Chi tiết</TabsTrigger>
                  </TabsList>

                  <TabsContent value="bar">
                    <Card>
                      <CardHeader>
                        <CardTitle>So sánh CPK/CP theo Dây chuyền</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                                        <p className="font-medium">{data.fullName}</p>
                                        <p className="text-sm">CPK: {data.cpk}</p>
                                        <p className="text-sm">CP: {data.cp}</p>
                                        <p className="text-sm">Pass Rate: {data.passRate}%</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend />
                              <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="3 3" label="CPK ≥ 1.33" />
                              <ReferenceLine y={1.0} stroke="#eab308" strokeDasharray="3 3" label="CPK = 1.0" />
                              <Bar dataKey="cpk" fill="#3b82f6" name="CPK" />
                              <Bar dataKey="cp" fill="#8b5cf6" name="CP" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="radar">
                    <Card>
                      <CardHeader>
                        <CardTitle>Biểu đồ Radar - Đa chiều</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="metric" />
                              <PolarRadiusAxis angle={30} domain={[0, 2]} />
                              {results.map((r, index) => (
                                <Radar
                                  key={r.lineId}
                                  name={r.lineCode}
                                  dataKey={r.lineCode}
                                  stroke={radarColors[index]}
                                  fill={radarColors[index]}
                                  fillOpacity={0.2}
                                />
                              ))}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="table">
                    <Card>
                      <CardHeader>
                        <CardTitle>Bảng So sánh Chi tiết</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Xếp hạng</th>
                                <th className="text-left p-2">Dây chuyền</th>
                                <th className="text-right p-2">CPK TB</th>
                                <th className="text-right p-2">CP TB</th>
                                <th className="text-right p-2">Tổng mẫu</th>
                                <th className="text-right p-2">Số phân tích</th>
                                <th className="text-right p-2">Pass Rate</th>
                                <th className="text-left p-2">Trạm tốt nhất</th>
                                <th className="text-left p-2">Trạm cần cải thiện</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map((r, index) => {
                                const status = getCpkStatus(r.avgCpk);
                                return (
                                  <tr key={r.lineId} className="border-b">
                                    <td className="p-2">
                                      <Badge variant={index === 0 ? "default" : "outline"}>#{index + 1}</Badge>
                                    </td>
                                    <td className="p-2">
                                      <div className="font-medium">{r.lineName}</div>
                                      <div className="text-sm text-muted-foreground">{r.lineCode}</div>
                                    </td>
                                    <td className="text-right p-2">
                                      <Badge className={status.color}>{r.avgCpk.toFixed(3)}</Badge>
                                    </td>
                                    <td className="text-right p-2">{r.avgCp.toFixed(3)}</td>
                                    <td className="text-right p-2">{r.totalSamples.toLocaleString()}</td>
                                    <td className="text-right p-2">{r.analysisCount}</td>
                                    <td className="text-right p-2">{r.passRate.toFixed(1)}%</td>
                                    <td className="p-2 text-green-600">{r.bestStation}</td>
                                    <td className="p-2 text-red-600">{r.worstStation}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
