import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Eye, Upload, Camera, Zap, AlertTriangle, CheckCircle2, XCircle, Settings, History, Image as ImageIcon, Loader2, Cpu, Target, Layers } from "lucide-react";
import { toast } from "sonner";

interface AnalysisResult {
  id: string;
  imageUrl: string;
  status: "pass" | "fail" | "warning";
  confidence: number;
  defects: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    location: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  processingTime: number;
  timestamp: Date;
  serialNumber?: string;
  machineId?: string;
}

const mockDefectTypes = ["Tray xuoc", "Lom/Mop", "Nut", "Doi mau", "Tap chat", "Bien dang", "Bong khi", "Rach"];

const generateMockResult = (imageUrl: string): AnalysisResult => {
  const hasDefects = Math.random() > 0.6;
  const defects = hasDefects ? Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => ({
    type: mockDefectTypes[Math.floor(Math.random() * mockDefectTypes.length)],
    severity: (["low", "medium", "high", "critical"] as const)[Math.floor(Math.random() * 4)],
    location: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, width: 5 + Math.random() * 10, height: 5 + Math.random() * 10 },
    confidence: 0.7 + Math.random() * 0.3,
  })) : [];
  
  return {
    id: `AN-${Date.now()}`,
    imageUrl,
    status: defects.length === 0 ? "pass" : defects.some(d => d.severity === "critical" || d.severity === "high") ? "fail" : "warning",
    confidence: 0.85 + Math.random() * 0.14,
    defects,
    processingTime: 100 + Math.random() * 400,
    timestamp: new Date(),
    serialNumber: `SN${Date.now()}`,
    machineId: "AVI-01",
  };
};

export default function AiVisionAnalysis() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [selectedModel, setSelectedModel] = useState("default");

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setSelectedImage(imageUrl);
      if (autoAnalyze) {
        analyzeImage(imageUrl);
      }
    };
    reader.readAsDataURL(file);
  }, [autoAnalyze]);

  const analyzeImage = useCallback(async (imageUrl: string) => {
    setAnalyzing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 20, 95));
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    clearInterval(interval);
    setProgress(100);
    
    const result = generateMockResult(imageUrl);
    setResults(prev => [result, ...prev].slice(0, 50));
    setSelectedResult(result);
    setAnalyzing(false);
    
    if (result.status === "fail") {
      toast.error("Phat hien loi nghiem trong!", { description: `${result.defects.length} loi duoc phat hien` });
    } else if (result.status === "warning") {
      toast.warning("Phat hien loi nhe", { description: `${result.defects.length} loi can kiem tra` });
    } else {
      toast.success("San pham dat chuan", { description: `Do tin cay: ${(result.confidence * 100).toFixed(1)}%` });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSelectedImage(imageUrl);
        if (autoAnalyze) {
          analyzeImage(imageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [autoAnalyze, analyzeImage]);

  const stats = {
    total: results.length,
    pass: results.filter(r => r.status === "pass").length,
    fail: results.filter(r => r.status === "fail").length,
    warning: results.filter(r => r.status === "warning").length,
    avgTime: results.length > 0 ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length : 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary" />
              AI Vision Analysis
            </h1>
            <p className="text-muted-foreground mt-1">Phan tich hinh anh tu dong bang AI</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} id="auto-analyze" />
              <Label htmlFor="auto-analyze">Tu dong phan tich</Label>
            </div>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Model Mac dinh</SelectItem>
                <SelectItem value="high-precision">Do chinh xac cao</SelectItem>
                <SelectItem value="fast">Xu ly nhanh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tong phan tich</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Dat</p><p className="text-2xl font-bold text-green-500">{stats.pass}</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Loi</p><p className="text-2xl font-bold text-red-500">{stats.fail}</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Canh bao</p><p className="text-2xl font-bold text-yellow-500">{stats.warning}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">TB xu ly</p><p className="text-2xl font-bold">{stats.avgTime.toFixed(0)}ms</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Phan tich hinh anh</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="upload">
                <TabsList className="mb-4">
                  <TabsTrigger value="upload">Tai len</TabsTrigger>
                  <TabsTrigger value="camera">Camera</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${analyzing ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {analyzing ? (
                      <div className="space-y-4">
                        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                        <p className="text-lg font-medium">Dang phan tich...</p>
                        <Progress value={progress} className="w-64 mx-auto" />
                        <p className="text-sm text-muted-foreground">{progress.toFixed(0)}%</p>
                      </div>
                    ) : selectedImage ? (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img src={selectedImage} alt="Selected" className="max-h-64 rounded-lg mx-auto" />
                          {selectedResult && selectedResult.defects.map((defect, i) => (
                            <div
                              key={i}
                              className={`absolute border-2 ${defect.severity === "critical" ? "border-red-500" : defect.severity === "high" ? "border-orange-500" : defect.severity === "medium" ? "border-yellow-500" : "border-blue-500"}`}
                              style={{ left: `${defect.location.x}%`, top: `${defect.location.y}%`, width: `${defect.location.width}%`, height: `${defect.location.height}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" onClick={() => { setSelectedImage(null); setSelectedResult(null); }}>Xoa</Button>
                          <Button onClick={() => analyzeImage(selectedImage)} disabled={analyzing}><Zap className="h-4 w-4 mr-2" />Phan tich lai</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-lg font-medium">Keo tha hinh anh vao day</p>
                          <p className="text-sm text-muted-foreground">hoac click de chon file</p>
                        </div>
                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="max-w-xs mx-auto" />
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="camera">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Tinh nang camera se duoc ho tro trong phien ban tiep theo</p>
                  </div>
                </TabsContent>
                <TabsContent value="url">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="Nhap URL hinh anh..." className="flex-1" />
                      <Button>Tai va phan tich</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Ket qua</CardTitle></CardHeader>
            <CardContent>
              {selectedResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={selectedResult.status === "pass" ? "bg-green-500" : selectedResult.status === "fail" ? "bg-red-500" : "bg-yellow-500"}>
                      {selectedResult.status === "pass" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : selectedResult.status === "fail" ? <XCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {selectedResult.status === "pass" ? "Dat" : selectedResult.status === "fail" ? "Loi" : "Canh bao"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{selectedResult.processingTime.toFixed(0)}ms</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Do tin cay</span><span className="font-medium">{(selectedResult.confidence * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">So loi</span><span className="font-medium">{selectedResult.defects.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Serial</span><span className="font-mono text-sm">{selectedResult.serialNumber}</span></div>
                  </div>
                  {selectedResult.defects.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Chi tiet loi:</h4>
                      <ScrollArea className="h-32">
                        {selectedResult.defects.map((defect, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 mb-2">
                            <div>
                              <p className="text-sm font-medium">{defect.type}</p>
                              <p className="text-xs text-muted-foreground">{(defect.confidence * 100).toFixed(0)}% tin cay</p>
                            </div>
                            <Badge variant="outline" className={defect.severity === "critical" ? "border-red-500 text-red-500" : defect.severity === "high" ? "border-orange-500 text-orange-500" : defect.severity === "medium" ? "border-yellow-500 text-yellow-500" : "border-blue-500 text-blue-500"}>
                              {defect.severity}
                            </Badge>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Chua co ket qua phan tich</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Lich su phan tich</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {results.length > 0 ? (
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedResult?.id === result.id ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"}`}
                        onClick={() => { setSelectedResult(result); setSelectedImage(result.imageUrl); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${result.status === "pass" ? "bg-green-500" : result.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                          <div>
                            <p className="text-sm font-medium">{result.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">{result.timestamp.toLocaleTimeString("vi-VN")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{result.defects.length} loi</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{result.processingTime.toFixed(0)}ms</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Chua co lich su phan tich</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Cau hinh</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Nguong do tin cay (%)</Label>
                <Slider value={[confidenceThreshold]} onValueChange={([v]) => setConfidenceThreshold(v)} min={50} max={99} step={1} />
                <p className="text-sm text-muted-foreground">{confidenceThreshold}%</p>
              </div>
              <div className="space-y-2">
                <Label>Model AI</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Model Mac dinh</SelectItem>
                    <SelectItem value="high-precision">Do chinh xac cao</SelectItem>
                    <SelectItem value="fast">Xu ly nhanh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Tu dong phan tich khi tai hinh</Label>
                <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Luu ket qua vao database</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Gui canh bao khi phat hien loi</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
