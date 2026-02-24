import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { GitCompareArrows, RefreshCw, Download, Brain, CheckCircle, Trophy, Target, Clock, Zap } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

// Mock model comparison data
// Mock data removed - mockComparisonData (data comes from tRPC or is not yet implemented)

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#8b5cf6"];

export default function AiModelComparison() {
  const { toast } = useToast();
  const [selectedModels, setSelectedModels] = useState<string[]>(["model-001", "model-002"]);
  const [comparisonMetric, setComparisonMetric] = useState("accuracy");

  const handleModelSelect = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter((id) => id !== modelId));
    } else if (selectedModels.length < 4) {
      setSelectedModels([...selectedModels, modelId]);
    } else {
      toast({ title: "Giới hạn", description: "Chỉ có thể so sánh tối đa 4 models" });
    }
  };

  const handlePromote = (modelId: string) => {
    toast({ title: "Thành công", description: "Model đã được promote lên production" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "production": return <Badge className="bg-green-500"><Trophy className="w-3 h-3 mr-1" />Production</Badge>;
      case "staging": return <Badge className="bg-blue-500">Staging</Badge>;
      case "experimental": return <Badge className="bg-orange-500">Experimental</Badge>;
      case "archived": return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBestValue = (metric: string) => {
    const values = mockComparisonData.models.map((m) => {
      switch (metric) {
        case "accuracy": return m.accuracy;
        case "precision": return m.precision;
        case "recall": return m.recall;
        case "f1Score": return m.f1Score;
        case "latency": return -m.latency; // Lower is better
        default: return 0;
      }
    });
    const maxIndex = values.indexOf(Math.max(...values));
    return mockComparisonData.models[maxIndex].id;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitCompareArrows className="w-8 h-8 text-cyan-500" />
              AI Model Comparison
            </h1>
            <p className="text-muted-foreground mt-1">So sánh hiệu suất giữa các model AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Chọn Models để so sánh</CardTitle>
            <CardDescription>Chọn tối đa 4 models để so sánh hiệu suất</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Tên Model</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockComparisonData.models.map((model) => (
                  <TableRow key={model.id} className={selectedModels.includes(model.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedModels.includes(model.id)}
                        onCheckedChange={() => handleModelSelect(model.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {model.name}
                        {getBestValue("accuracy") === model.id && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{model.type}</Badge></TableCell>
                    <TableCell>{model.version}</TableCell>
                    <TableCell>
                      <span className={getBestValue("accuracy") === model.id ? "font-bold text-green-600" : ""}>
                        {(model.accuracy * 100).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getBestValue("latency") === model.id ? "font-bold text-green-600" : ""}>
                        {model.latency}ms
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(model.status)}</TableCell>
                    <TableCell className="text-right">
                      {model.status !== "production" && (
                        <Button size="sm" variant="outline" onClick={() => handlePromote(model.id)}>
                          Promote
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="radar">Radar Chart</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
            <TabsTrigger value="latency">Latency</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockComparisonData.models
                .filter((m) => selectedModels.includes(m.id))
                .map((model, i) => (
                  <Card key={model.id} style={{ borderTopColor: COLORS[i], borderTopWidth: 4 }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription>{model.type} - {model.version}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Accuracy</span>
                          <span className="font-bold">{(model.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Precision</span>
                          <span className="font-bold">{(model.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Recall</span>
                          <span className="font-bold">{(model.recall * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">F1 Score</span>
                          <span className="font-bold">{(model.f1Score * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Latency</span>
                          <span className="font-bold">{model.latency}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Memory</span>
                          <span className="font-bold">{model.memoryUsage}MB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="radar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>So sánh đa chiều</CardTitle>
                <CardDescription>Radar chart so sánh các metrics chính</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={mockComparisonData.radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="v2.1 XGBoost" dataKey="v2.1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                      <Radar name="v2.0 XGBoost" dataKey="v2.0" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Radar name="LSTM" dataKey="LSTM" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                      <Radar name="Random Forest" dataKey="RF" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử hiệu suất</CardTitle>
                <CardDescription>Accuracy theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockComparisonData.performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[80, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="v2.1" stroke="#22c55e" name="v2.1 XGBoost" strokeWidth={2} />
                      <Line type="monotone" dataKey="v2.0" stroke="#3b82f6" name="v2.0 XGBoost" strokeWidth={2} />
                      <Line type="monotone" dataKey="LSTM" stroke="#f97316" name="LSTM" strokeWidth={2} />
                      <Line type="monotone" dataKey="RF" stroke="#8b5cf6" name="Random Forest" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="latency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>So sánh Latency</CardTitle>
                <CardDescription>Thời gian phản hồi của các model (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockComparisonData.latencyComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="latency" fill="#3b82f6" name="Latency (ms)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
