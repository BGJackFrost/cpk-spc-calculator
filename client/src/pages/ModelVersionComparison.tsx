import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

export default function ModelVersionComparison() {
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);

  // Queries
  const { data: modelsSummary, isLoading: loadingModels, refetch: refetchModels } = trpc.aiPredictive.getAllModelsAccuracy.useQuery();
  
  const { data: versionComparison, isLoading: loadingVersions } = trpc.aiPredictive.compareModelVersions.useQuery(
    { modelId: selectedModelId! },
    { enabled: !!selectedModelId }
  );

  const { data: multiModelComparison, isLoading: loadingMultiModel } = trpc.aiPredictive.compareMultipleModels.useQuery(
    { modelIds: selectedModelIds },
    { enabled: selectedModelIds.length > 0 }
  );

  const { data: accuracyTrend, isLoading: loadingTrend } = trpc.aiPredictive.getVersionAccuracyTrend.useQuery(
    { modelId: selectedModelId!, limit: 10 },
    { enabled: !!selectedModelId }
  );

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "inactive":
        return <Badge variant="secondary">Không hoạt động</Badge>;
      case "deprecated":
        return <Badge variant="destructive">Đã lỗi thời</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(parseInt(modelId));
  };

  const handleMultiModelToggle = (modelId: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, modelId];
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">So sánh Accuracy Model</h1>
            <p className="text-muted-foreground">
              So sánh độ chính xác giữa các phiên bản model AI
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchModels()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Summary Cards */}
        {modelsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{modelsSummary.totalModels}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Model Hoạt động</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{modelsSummary.activeModels}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Model đã chọn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{selectedModelIds.length}/5</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy TB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {modelsSummary.models.length > 0
                    ? (modelsSummary.models.reduce((sum, m) => sum + m.accuracy, 0) / modelsSummary.models.length).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="single" className="space-y-4">
          <TabsList>
            <TabsTrigger value="single">So sánh phiên bản</TabsTrigger>
            <TabsTrigger value="multi">So sánh nhiều model</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng Accuracy</TabsTrigger>
          </TabsList>

          {/* Single Model Version Comparison */}
          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chọn Model để so sánh phiên bản</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleModelSelect} value={selectedModelId?.toString()}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="Chọn model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsSummary?.models.map(model => (
                      <SelectItem key={model.modelId} value={model.modelId.toString()}>
                        {model.modelName} (v{model.currentVersion})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {loadingVersions && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Đang tải dữ liệu...
                </CardContent>
              </Card>
            )}

            {versionComparison && (
              <>
                {/* Best Version & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        Phiên bản tốt nhất
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {versionComparison.bestVersion ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-bold">v{versionComparison.bestVersion.version}</div>
                          <p className="text-sm text-muted-foreground">{versionComparison.bestVersion.reason}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Không có dữ liệu</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Khuyến nghị
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{versionComparison.recommendation}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Version Comparison Chart */}
                {versionComparison.comparisonChart.labels.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Biểu đồ so sánh Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={versionComparison.comparisonChart.labels.map((label, idx) => ({
                              version: label,
                              MAE: versionComparison.comparisonChart.datasets[0]?.data[idx] || 0,
                              RMSE: versionComparison.comparisonChart.datasets[1]?.data[idx] || 0,
                              MAPE: versionComparison.comparisonChart.datasets[2]?.data[idx] || 0,
                              Confidence: versionComparison.comparisonChart.datasets[3]?.data[idx] || 0,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="version" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="MAE" fill="#8884d8" name="MAE" />
                            <Bar dataKey="RMSE" fill="#82ca9d" name="RMSE" />
                            <Bar dataKey="MAPE" fill="#ffc658" name="MAPE (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Version Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chi tiết các phiên bản</CardTitle>
                    <CardDescription>
                      Model: {versionComparison.modelName} | Loại: {versionComparison.modelType} | Metric: {versionComparison.targetMetric}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phiên bản</TableHead>
                          <TableHead>Dự đoán</TableHead>
                          <TableHead>Đã xác minh</TableHead>
                          <TableHead>MAE</TableHead>
                          <TableHead>RMSE</TableHead>
                          <TableHead>MAPE</TableHead>
                          <TableHead>Trong khoảng tin cậy</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versionComparison.versions.map(version => (
                          <TableRow key={version.versionId}>
                            <TableCell className="font-medium">
                              v{version.version}
                              {version.isActive && (
                                <Badge className="ml-2 bg-green-500">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell>{version.totalPredictions}</TableCell>
                            <TableCell>{version.verifiedPredictions}</TableCell>
                            <TableCell>{version.mae.toFixed(3)}</TableCell>
                            <TableCell>{version.rmse.toFixed(3)}</TableCell>
                            <TableCell>{version.mape.toFixed(1)}%</TableCell>
                            <TableCell>{version.withinConfidenceRate.toFixed(1)}%</TableCell>
                            <TableCell>
                              {version.isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-400" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Multi Model Comparison */}
          <TabsContent value="multi" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chọn nhiều Model để so sánh (tối đa 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {modelsSummary?.models.map(model => (
                    <Button
                      key={model.modelId}
                      variant={selectedModelIds.includes(model.modelId) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMultiModelToggle(model.modelId)}
                      disabled={!selectedModelIds.includes(model.modelId) && selectedModelIds.length >= 5}
                    >
                      {model.modelName}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {loadingMultiModel && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Đang tải dữ liệu...
                </CardContent>
              </Card>
            )}

            {multiModelComparison && multiModelComparison.models.length > 0 && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{multiModelComparison.summary.totalModels}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Versions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{multiModelComparison.summary.totalVersions}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">MAE tốt nhất</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{multiModelComparison.summary.bestAccuracy}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">MAE trung bình</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{multiModelComparison.summary.avgAccuracy}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Best Model */}
                {multiModelComparison.overallBestModel && (
                  <Card className="border-green-500 border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        Model tốt nhất
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-2xl font-bold">{multiModelComparison.overallBestModel.modelName}</div>
                          <p className="text-sm text-muted-foreground">
                            Phiên bản: v{multiModelComparison.overallBestModel.version} | MAE: {multiModelComparison.overallBestModel.accuracy}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Radar Chart Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>So sánh đa chiều</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={[
                            { metric: "MAE", ...Object.fromEntries(multiModelComparison.models.map(m => [m.modelName, m.versions[0]?.mae || 0])) },
                            { metric: "RMSE", ...Object.fromEntries(multiModelComparison.models.map(m => [m.modelName, m.versions[0]?.rmse || 0])) },
                            { metric: "MAPE", ...Object.fromEntries(multiModelComparison.models.map(m => [m.modelName, m.versions[0]?.mape || 0])) },
                            { metric: "Confidence", ...Object.fromEntries(multiModelComparison.models.map(m => [m.modelName, m.versions[0]?.withinConfidenceRate || 0])) },
                          ]}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" />
                          <PolarRadiusAxis />
                          {multiModelComparison.models.map((model, idx) => (
                            <Radar
                              key={model.modelId}
                              name={model.modelName}
                              dataKey={model.modelName}
                              stroke={`hsl(${idx * 60}, 70%, 50%)`}
                              fill={`hsl(${idx * 60}, 70%, 50%)`}
                              fillOpacity={0.3}
                            />
                          ))}
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Models Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chi tiết các Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Phiên bản tốt nhất</TableHead>
                          <TableHead>MAE</TableHead>
                          <TableHead>Khuyến nghị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {multiModelComparison.models.map(model => (
                          <TableRow key={model.modelId}>
                            <TableCell className="font-medium">{model.modelName}</TableCell>
                            <TableCell>{model.modelType}</TableCell>
                            <TableCell>
                              {model.bestVersion ? `v${model.bestVersion.version}` : "N/A"}
                            </TableCell>
                            <TableCell>
                              {model.versions[0]?.mae.toFixed(3) || "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {model.recommendation}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Accuracy Trend */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chọn Model để xem xu hướng</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleModelSelect} value={selectedModelId?.toString()}>
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="Chọn model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsSummary?.models.map(model => (
                      <SelectItem key={model.modelId} value={model.modelId.toString()}>
                        {model.modelName} (v{model.currentVersion})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {loadingTrend && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Đang tải dữ liệu...
                </CardContent>
              </Card>
            )}

            {accuracyTrend && (
              <>
                {/* Trend Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{accuracyTrend.modelName}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Xu hướng</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(accuracyTrend.trendDirection)}
                        <span className="text-xl font-bold capitalize">
                          {accuracyTrend.trendDirection === "improving" ? "Cải thiện" :
                           accuracyTrend.trendDirection === "declining" ? "Giảm" : "Ổn định"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Tỷ lệ cải thiện</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl font-bold ${accuracyTrend.improvementRate > 0 ? "text-green-600" : accuracyTrend.improvementRate < 0 ? "text-red-600" : ""}`}>
                        {accuracyTrend.improvementRate > 0 ? "+" : ""}{accuracyTrend.improvementRate}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend Chart */}
                {accuracyTrend.trend.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Biểu đồ xu hướng MAE theo phiên bản</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={accuracyTrend.trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="version" tickFormatter={(v) => `v${v}`} />
                            <YAxis />
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                name === "mae" ? value.toFixed(3) : `${value.toFixed(1)}%`,
                                name === "mae" ? "MAE" : "Accuracy"
                              ]}
                              labelFormatter={(label) => `Phiên bản: v${label}`}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="mae"
                              stroke="#8884d8"
                              strokeWidth={2}
                              name="MAE"
                              dot={{ fill: "#8884d8" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="accuracy"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              name="Accuracy (%)"
                              dot={{ fill: "#82ca9d" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Version History Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lịch sử phiên bản</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Phiên bản</TableHead>
                          <TableHead>MAE</TableHead>
                          <TableHead>Accuracy</TableHead>
                          <TableHead>Ngày triển khai</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accuracyTrend.trend.map((version, idx) => (
                          <TableRow key={version.versionNumber}>
                            <TableCell className="font-medium">v{version.version}</TableCell>
                            <TableCell>{version.mae.toFixed(3)}</TableCell>
                            <TableCell>{version.accuracy.toFixed(1)}%</TableCell>
                            <TableCell>
                              {version.deployedAt
                                ? new Date(version.deployedAt).toLocaleDateString("vi-VN")
                                : "Chưa triển khai"}
                            </TableCell>
                            <TableCell>
                              {version.isActive ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
