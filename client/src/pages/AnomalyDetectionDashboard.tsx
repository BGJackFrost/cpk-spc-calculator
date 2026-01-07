/**
 * Anomaly Detection Dashboard
 * Quản lý và giám sát Isolation Forest anomaly detection
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Brain, AlertTriangle, CheckCircle, Activity, RefreshCw, Target, Loader2, XCircle } from "lucide-react";

export default function AnomalyDetectionDashboard() {
  const [selectedModel, setSelectedModel] = useState<number | null>(null);

  const { data: models, isLoading: loadingModels, refetch: refetchModels } = trpc.anomalyDetectionAI.listModels.useQuery();
  const { data: stats } = trpc.anomalyDetectionAI.stats.useQuery({});
  const { data: recentAnomalies } = trpc.anomalyDetectionAI.recentAnomalies.useQuery({ limit: 20 });

  const severityColors: Record<string, string> = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };
  const typeColors: Record<string, string> = { spike: '#3b82f6', drop: '#8b5cf6', drift: '#f59e0b', noise: '#6b7280', pattern: '#ec4899' };

  const severityData = stats?.bySeverity ? Object.entries(stats.bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value, color: severityColors[name] || '#6b7280'
  })) : [];

  const typeData = stats?.byType ? Object.entries(stats.byType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value, color: typeColors[name] || '#6b7280'
  })) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'training': return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Training</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-red-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge className="bg-green-500">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Anomaly Detection Dashboard</h1>
            <p className="text-muted-foreground">Phát hiện bất thường với Isolation Forest AI</p>
          </div>
          <Button onClick={() => refetchModels()}><RefreshCw className="w-4 h-4 mr-2" />Làm mới</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng phát hiện</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDetections?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" />Tất cả thời gian</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Bất thường</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.anomalyCount || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Cần xem xét</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tỷ lệ bất thường</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDetections ? ((stats.anomalyCount / stats.totalDetections) * 100).toFixed(2) : 0}%</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />Anomaly rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Models hoạt động</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{models?.filter(m => m.status === 'active').length || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Brain className="w-3 h-3" />/{models?.length || 0} tổng</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Phân bố theo mức độ</CardTitle><CardDescription>Số lượng bất thường theo severity</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {severityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Phân bố theo loại</CardTitle><CardDescription>Số lượng bất thường theo anomaly type</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{typeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models"><Brain className="w-4 h-4 mr-2" />Models ({models?.length || 0})</TabsTrigger>
            <TabsTrigger value="anomalies"><AlertTriangle className="w-4 h-4 mr-2" />Bất thường gần đây</TabsTrigger>
          </TabsList>

          <TabsContent value="models">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loadingModels ? (
                <div className="col-span-full flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : models?.map((model) => (
                <Card key={model.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedModel === model.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedModel(model.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Brain className="w-5 h-5" /><CardTitle className="text-lg">{model.name}</CardTitle></div>
                      {getStatusBadge(model.status)}
                    </div>
                    <CardDescription>{model.description || 'Không có mô tả'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Target:</span> {model.targetType}</div>
                        <div><span className="text-muted-foreground">Trees:</span> {model.numTrees}</div>
                        <div><span className="text-muted-foreground">Sample:</span> {model.sampleSize}</div>
                        <div><span className="text-muted-foreground">Contam:</span> {(model.contamination * 100).toFixed(1)}%</div>
                      </div>
                      {model.accuracy && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm"><span>Accuracy</span><span>{(model.accuracy * 100).toFixed(1)}%</span></div>
                          <Progress value={model.accuracy * 100} />
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div><div className="font-semibold">{model.precision ? (model.precision * 100).toFixed(0) : '-'}%</div><div className="text-muted-foreground">Precision</div></div>
                        <div><div className="font-semibold">{model.recall ? (model.recall * 100).toFixed(0) : '-'}%</div><div className="text-muted-foreground">Recall</div></div>
                        <div><div className="font-semibold">{model.f1Score ? (model.f1Score * 100).toFixed(0) : '-'}%</div><div className="text-muted-foreground">F1</div></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <Card>
              <CardHeader><CardTitle>Bất thường gần đây</CardTitle><CardDescription>Các điểm dữ liệu được phát hiện là bất thường</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAnomalies?.map((anomaly, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(anomaly.timestamp).toLocaleString('vi-VN')}</TableCell>
                        <TableCell className="font-mono">{anomaly.value?.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={anomaly.anomalyScore * 100} className="w-16 h-2" />
                            <span className="text-xs">{(anomaly.anomalyScore * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{anomaly.anomalyType || 'unknown'}</Badge></TableCell>
                        <TableCell>{getSeverityBadge(anomaly.severity)}</TableCell>
                        <TableCell>{(anomaly.confidence * 100).toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
