/**
 * AI Vision Defect Detection Page
 * Trang phát hiện lỗi sản phẩm bằng Computer Vision
 */

import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Settings2,
  RefreshCw,
  Download,
  Image,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function AiVisionDefectDetection() {
  const [imageUrl, setImageUrl] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [qualityPassThreshold, setQualityPassThreshold] = useState(85);
  const [useSimulation, setUseSimulation] = useState(true);
  const [detectionResults, setDetectionResults] = useState<any[]>([]);

  // Detect defects mutation
  const detectMutation = trpc.vision.detectDefects.useMutation({
    onSuccess: (data) => {
      setDetectionResults([data, ...detectionResults.slice(0, 9)]);
    },
  });

  // Simulate detection mutation
  const simulateMutation = trpc.vision.simulateDetection.useMutation({
    onSuccess: (data) => {
      setDetectionResults([...data.results, ...detectionResults.slice(0, 10 - data.results.length)]);
    },
  });

  // Get defect categories
  const { data: categories } = trpc.vision.getDefectCategories.useQuery();

  // Handle detection
  const handleDetect = useCallback(() => {
    if (useSimulation) {
      simulateMutation.mutate({ count: 1 });
    } else if (imageUrl) {
      detectMutation.mutate({
        imageUrl,
        useSimulation: false,
        config: {
          confidenceThreshold: confidenceThreshold / 100,
          qualityPassThreshold,
        },
      });
    }
  }, [imageUrl, useSimulation, confidenceThreshold, qualityPassThreshold]);

  // Calculate statistics from results
  const statistics = detectionResults.length > 0 ? {
    totalImages: detectionResults.length,
    totalDefects: detectionResults.reduce((sum, r) => sum + r.totalDefects, 0),
    passRate: (detectionResults.filter(r => r.overallQuality === 'pass').length / detectionResults.length) * 100,
    averageQualityScore: detectionResults.reduce((sum, r) => sum + r.qualityScore, 0) / detectionResults.length,
  } : null;

  // Get quality badge
  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'pass':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />PASS</Badge>;
      case 'fail':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />FAIL</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />WARNING</Badge>;
      default:
        return <Badge variant="secondary">{quality}</Badge>;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const isLoading = detectMutation.isPending || simulateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Camera className="h-8 w-8" />
              Phát hiện Lỗi bằng Computer Vision
            </h1>
            <p className="text-muted-foreground">
              Sử dụng AI để phân tích hình ảnh và phát hiện lỗi sản phẩm tự động
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Cấu hình phát hiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>URL Hình ảnh</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={useSimulation}
                />
              </div>

              <div className="space-y-2">
                <Label>Ngưỡng tin cậy: {confidenceThreshold}%</Label>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={([v]) => setConfidenceThreshold(v)}
                  min={50}
                  max={99}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Ngưỡng đạt chất lượng: {qualityPassThreshold}%</Label>
                <Slider
                  value={[qualityPassThreshold]}
                  onValueChange={([v]) => setQualityPassThreshold(v)}
                  min={50}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="simulation"
                    checked={useSimulation}
                    onCheckedChange={setUseSimulation}
                  />
                  <Label htmlFor="simulation">Chế độ Demo</Label>
                </div>
                <Button onClick={handleDetect} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Phân tích
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng hình ảnh</CardTitle>
                <Image className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalImages}</div>
                <p className="text-xs text-muted-foreground">Đã phân tích</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng lỗi phát hiện</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalDefects}</div>
                <p className="text-xs text-muted-foreground">Trong tất cả hình ảnh</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tỷ lệ đạt</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.passRate.toFixed(1)}%</div>
                <Progress value={statistics.passRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Điểm chất lượng TB</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.averageQualityScore.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Trên thang 100</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Kết quả phát hiện</TabsTrigger>
            <TabsTrigger value="categories">Danh mục lỗi</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            {detectionResults.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Chưa có kết quả</h3>
                  <p className="text-muted-foreground text-center max-w-md mt-2">
                    Nhập URL hình ảnh hoặc bật chế độ Demo và nhấn "Phân tích" để bắt đầu phát hiện lỗi.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {detectionResults.map((result, idx) => (
                  <Card key={result.imageId || idx}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Kết quả #{detectionResults.length - idx}
                        </CardTitle>
                        {getQualityBadge(result.overallQuality)}
                      </div>
                      <CardDescription>
                        Thời gian xử lý: {result.processingTime}ms | Điểm: {result.qualityScore}/100
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span>Số lỗi phát hiện:</span>
                          <Badge variant="outline">{result.totalDefects}</Badge>
                        </div>

                        {result.defects.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Chi tiết lỗi:</h4>
                            {result.defects.map((defect: any) => (
                              <div
                                key={defect.id}
                                className="flex items-center justify-between p-2 rounded-lg border"
                              >
                                <div className="flex items-center gap-2">
                                  {getSeverityBadge(defect.severity)}
                                  <span className="font-medium">{defect.type}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {(defect.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Không phát hiện lỗi</AlertTitle>
                            <AlertDescription>
                              Sản phẩm đạt tiêu chuẩn chất lượng.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Danh mục lỗi được hỗ trợ</CardTitle>
                <CardDescription>
                  Hệ thống có thể phát hiện các loại lỗi sau
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {categories?.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          {getSeverityBadge(category.severity)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử phân tích</CardTitle>
                <CardDescription>
                  Các kết quả phân tích gần đây trong phiên làm việc
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detectionResults.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Chưa có lịch sử phân tích
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Thời gian</th>
                          <th className="text-center p-2">Số lỗi</th>
                          <th className="text-center p-2">Điểm</th>
                          <th className="text-center p-2">Kết quả</th>
                          <th className="text-right p-2">Xử lý</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detectionResults.map((result, idx) => (
                          <tr key={result.imageId || idx} className="border-b hover:bg-muted/50">
                            <td className="p-2">{detectionResults.length - idx}</td>
                            <td className="p-2">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="text-center p-2">{result.totalDefects}</td>
                            <td className="text-center p-2">{result.qualityScore}</td>
                            <td className="text-center p-2">
                              {getQualityBadge(result.overallQuality)}
                            </td>
                            <td className="text-right p-2">{result.processingTime}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
