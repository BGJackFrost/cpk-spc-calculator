import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, 
  TrendingUp, 
  BarChart3,
  GitCompare,
  Plus,
  X,
  ArrowRight
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
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";

interface AnalysisItem {
  id: string;
  productId: string;
  productName: string;
  stationId: string;
  stationName: string;
  machineId?: string;
  machineName?: string;
  fixtureId?: string;
  fixtureName?: string;
}

interface AnalysisResult {
  id: string;
  label: string;
  cpk: number;
  cp: number;
  mean: number;
  stdDev: number;
  sampleCount: number;
}

export default function MultiAnalysis() {
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [correlationPair, setCorrelationPair] = useState<{ item1: string; item2: string }>({ item1: "", item2: "" });
  const [correlationResult, setCorrelationResult] = useState<{ coefficient: number; interpretation: string } | null>(null);

  // Form state for adding new item
  const [newItem, setNewItem] = useState({
    productId: "",
    stationId: "",
    machineId: "",
    fixtureId: "",
  });

  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: fixtures } = trpc.fixture.list.useQuery(
    { machineId: newItem.machineId ? parseInt(newItem.machineId) : undefined },
    { enabled: !!newItem.machineId }
  );

  const addAnalysisItem = () => {
    if (!newItem.productId || !newItem.stationId) {
      toast.error("Vui lòng chọn sản phẩm và trạm sản xuất");
      return;
    }

    const product = products?.find(p => p.id.toString() === newItem.productId);
    const station = workstations?.find((w: any) => w.id.toString() === newItem.stationId);
    const machine = machines?.find(m => m.id.toString() === newItem.machineId);
    const fixture = fixtures?.find(f => f.id.toString() === newItem.fixtureId);

    const item: AnalysisItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: newItem.productId,
      productName: product?.name || "",
      stationId: newItem.stationId,
      stationName: station?.name || "",
      machineId: newItem.machineId || undefined,
      machineName: machine?.name || undefined,
      fixtureId: newItem.fixtureId || undefined,
      fixtureName: fixture?.name || undefined,
    };

    setAnalysisItems([...analysisItems, item]);
    setNewItem({ productId: "", stationId: "", machineId: "", fixtureId: "" });
    toast.success("Đã thêm mục phân tích");
  };

  const removeAnalysisItem = (id: string) => {
    setAnalysisItems(analysisItems.filter(item => item.id !== id));
  };

  const runMultiAnalysis = async () => {
    if (analysisItems.length < 2) {
      toast.error("Cần ít nhất 2 mục để phân tích so sánh");
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis results (in real app, this would call backend)
    const mockResults: AnalysisResult[] = analysisItems.map(item => ({
      id: item.id,
      label: `${item.productName} - ${item.stationName}${item.fixtureName ? ` (${item.fixtureName})` : ""}`,
      cpk: Math.random() * 2 + 0.5,
      cp: Math.random() * 2 + 0.8,
      mean: Math.random() * 10 + 45,
      stdDev: Math.random() * 2 + 0.5,
      sampleCount: Math.floor(Math.random() * 100) + 50,
    }));

    setTimeout(() => {
      setResults(mockResults);
      setIsAnalyzing(false);
      toast.success(`Đã phân tích ${analysisItems.length} mục`);
    }, 1500);
  };

  const calculateCorrelation = () => {
    if (!correlationPair.item1 || !correlationPair.item2) {
      toast.error("Vui lòng chọn 2 mục để tính tương quan");
      return;
    }

    // Simulate correlation calculation
    const coefficient = Math.random() * 2 - 1; // -1 to 1
    let interpretation = "";
    const absCoef = Math.abs(coefficient);
    
    if (absCoef >= 0.8) {
      interpretation = coefficient > 0 ? "Tương quan thuận rất mạnh" : "Tương quan nghịch rất mạnh";
    } else if (absCoef >= 0.6) {
      interpretation = coefficient > 0 ? "Tương quan thuận mạnh" : "Tương quan nghịch mạnh";
    } else if (absCoef >= 0.4) {
      interpretation = coefficient > 0 ? "Tương quan thuận trung bình" : "Tương quan nghịch trung bình";
    } else if (absCoef >= 0.2) {
      interpretation = coefficient > 0 ? "Tương quan thuận yếu" : "Tương quan nghịch yếu";
    } else {
      interpretation = "Không có tương quan đáng kể";
    }

    setCorrelationResult({ coefficient, interpretation });
    toast.success("Đã tính hệ số tương quan");
  };

  const getCpkColor = (cpk: number) => {
    if (cpk >= 1.33) return "#22c55e";
    if (cpk >= 1.0) return "#eab308";
    return "#ef4444";
  };

  const comparisonChartData = results.map(r => ({
    name: r.label.length > 20 ? r.label.substring(0, 20) + "..." : r.label,
    fullName: r.label,
    cpk: parseFloat(r.cpk.toFixed(3)),
    cp: parseFloat(r.cp.toFixed(3)),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-8 w-8" />
            Phân tích Đa Đối tượng
          </h1>
          <p className="text-muted-foreground mt-1">
            So sánh CPK/SPC giữa nhiều sản phẩm, trạm, máy và Fixture. Tính tương quan giữa các đối tượng.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Add items */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Thêm Mục Phân tích
              </CardTitle>
              <CardDescription>
                Chọn sản phẩm, trạm, máy và Fixture để thêm vào danh sách phân tích
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sản phẩm *</Label>
                <Select value={newItem.productId} onValueChange={(v) => setNewItem({ ...newItem, productId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.code} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trạm sản xuất *</Label>
                <Select value={newItem.stationId} onValueChange={(v) => setNewItem({ ...newItem, stationId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    {workstations?.map((w: any) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Máy (tùy chọn)</Label>
                <Select value={newItem.machineId || "all"} onValueChange={(v) => setNewItem({ ...newItem, machineId: v === "all" ? "" : v, fixtureId: "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả máy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả máy</SelectItem>
                    {machines?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.code} - {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fixture (tùy chọn)</Label>
                <Select 
                  value={newItem.fixtureId || "all"} 
                  onValueChange={(v) => setNewItem({ ...newItem, fixtureId: v === "all" ? "" : v })}
                  disabled={!newItem.machineId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả Fixture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả Fixture</SelectItem>
                    {fixtures?.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.code} - {f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={addAnalysisItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Thêm vào danh sách
              </Button>
            </CardContent>
          </Card>

          {/* Right: Analysis items list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Danh sách Phân tích ({analysisItems.length} mục)
                </span>
                <Button 
                  onClick={runMultiAnalysis} 
                  disabled={analysisItems.length < 2 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Phân tích So sánh
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có mục nào. Thêm ít nhất 2 mục để bắt đầu phân tích so sánh.
                </div>
              ) : (
                <div className="space-y-2">
                  {analysisItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.stationName}
                            {item.machineName && ` → ${item.machineName}`}
                            {item.fixtureName && ` → ${item.fixtureName}`}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAnalysisItem(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList>
              <TabsTrigger value="comparison">So sánh CPK</TabsTrigger>
              <TabsTrigger value="correlation">Tương quan</TabsTrigger>
              <TabsTrigger value="details">Chi tiết</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison">
              <Card>
                <CardHeader>
                  <CardTitle>Biểu đồ So sánh CPK/CP</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 'auto']} />
                        <YAxis type="category" dataKey="name" width={150} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">{data.fullName}</p>
                                  <p className="text-sm">CPK: {data.cpk}</p>
                                  <p className="text-sm">CP: {data.cp}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <ReferenceLine x={1.33} stroke="#22c55e" strokeDasharray="3 3" label="CPK ≥ 1.33" />
                        <ReferenceLine x={1.0} stroke="#eab308" strokeDasharray="3 3" label="CPK = 1.0" />
                        <Bar dataKey="cpk" fill="#3b82f6" name="CPK" />
                        <Bar dataKey="cp" fill="#8b5cf6" name="CP" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlation">
              <Card>
                <CardHeader>
                  <CardTitle>Phân tích Tương quan</CardTitle>
                  <CardDescription>
                    Chọn 2 mục để tính hệ số tương quan giữa chúng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3 items-end">
                    <div className="space-y-2">
                      <Label>Mục 1</Label>
                      <Select value={correlationPair.item1} onValueChange={(v) => setCorrelationPair({ ...correlationPair, item1: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mục 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {results.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mục 2</Label>
                      <Select value={correlationPair.item2} onValueChange={(v) => setCorrelationPair({ ...correlationPair, item2: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mục 2" />
                        </SelectTrigger>
                        <SelectContent>
                          {results.filter(r => r.id !== correlationPair.item1).map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={calculateCorrelation} disabled={!correlationPair.item1 || !correlationPair.item2}>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Tính Tương quan
                  </Button>

                  {correlationResult && (
                    <div className="p-6 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-4xl font-bold mb-2">
                          r = {correlationResult.coefficient.toFixed(3)}
                        </div>
                        <div className="text-lg text-muted-foreground">
                          {correlationResult.interpretation}
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <p>Hệ số tương quan Pearson (r) dao động từ -1 đến +1:</p>
                          <p>• r = +1: Tương quan thuận hoàn hảo</p>
                          <p>• r = 0: Không có tương quan</p>
                          <p>• r = -1: Tương quan nghịch hoàn hảo</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết Kết quả</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Đối tượng</th>
                          <th className="text-right p-2">CPK</th>
                          <th className="text-right p-2">CP</th>
                          <th className="text-right p-2">Mean</th>
                          <th className="text-right p-2">StdDev</th>
                          <th className="text-right p-2">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(r => (
                          <tr key={r.id} className="border-b">
                            <td className="p-2">{r.label}</td>
                            <td className="text-right p-2">
                              <Badge style={{ backgroundColor: getCpkColor(r.cpk), color: 'white' }}>
                                {r.cpk.toFixed(3)}
                              </Badge>
                            </td>
                            <td className="text-right p-2">{r.cp.toFixed(3)}</td>
                            <td className="text-right p-2">{r.mean.toFixed(2)}</td>
                            <td className="text-right p-2">{r.stdDev.toFixed(3)}</td>
                            <td className="text-right p-2">{r.sampleCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
