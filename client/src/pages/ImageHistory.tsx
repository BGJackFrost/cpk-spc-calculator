import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { ImageTimeline } from "@/components/ImageTimeline";
import { ImageCalendar } from "@/components/ImageCalendar";
import { SNImageViewer } from "@/components/SNImageViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Image, Search, Filter, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

type AnalysisResult = "ok" | "ng" | "warning" | "pending";

export default function ImageHistory() {
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  
  // Filters
  const [searchSN, setSearchSN] = useState("");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterProductionLine, setFilterProductionLine] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    let startDate: string | undefined;
    
    switch (dateRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startDate = undefined;
    }
    
    return { startDate, endDate: now.toISOString() };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch data
  const { data: stats } = trpc.snImage.getStats.useQuery({
    startDate,
    endDate,
    productionLineId: filterProductionLine !== "all" ? parseInt(filterProductionLine) : undefined,
  });

  const { data: imagesData, isLoading } = trpc.snImage.list.useQuery({
    serialNumber: searchSN || undefined,
    analysisResult: filterResult !== "all" ? filterResult as AnalysisResult : undefined,
    productionLineId: filterProductionLine !== "all" ? parseInt(filterProductionLine) : undefined,
    startDate,
    endDate,
    limit: 500, // Load more for timeline/calendar view
    offset: 0,
  });

  const { data: productionLines } = trpc.productionLine.list.useQuery();

  const images = imagesData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Ảnh</h1>
          <p className="text-muted-foreground">
            Xem và theo dõi ảnh kiểm tra chất lượng theo thời gian
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng ảnh</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">OK</p>
                    <p className="text-2xl font-bold text-green-500">{stats.ok}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">NG</p>
                    <p className="text-2xl font-bold text-red-500">{stats.ng}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Warning</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Điểm TB</p>
                    <p className="text-2xl font-bold">{stats.avgQualityScore.toFixed(1)}%</p>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stats.totalDefects} lỗi
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Serial Number</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchSN}
                    onChange={(e) => setSearchSN(e.target.value)}
                    placeholder="Tìm theo SN..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Kết quả</Label>
                <Select value={filterResult} onValueChange={setFilterResult}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="ng">NG</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dây chuyền</Label>
                <Select value={filterProductionLine} onValueChange={setFilterProductionLine}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Khoảng thời gian</Label>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 ngày qua</SelectItem>
                    <SelectItem value="30d">30 ngày qua</SelectItem>
                    <SelectItem value="90d">90 ngày qua</SelectItem>
                    <SelectItem value="all">Tất cả</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : (
              <ImageTimeline
                images={images}
                onImageClick={(img) => setSelectedImage(img)}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : (
              <ImageCalendar
                images={images}
                onImageClick={(img) => setSelectedImage(img)}
                isLoading={isLoading}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Viewer Dialog */}
      <SNImageViewer
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
      />
    </DashboardLayout>
  );
}
