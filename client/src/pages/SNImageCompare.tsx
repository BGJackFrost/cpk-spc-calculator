/**
 * SNImageCompare - Trang so sánh ảnh giữa các Serial Number
 * Hỗ trợ side-by-side, overlay, slider và zoom đồng bộ
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { SNImageComparison } from "@/components/SNImageComparison";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Columns, 
  Image, 
  History, 
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

const resultConfig = {
  ok: { label: 'OK', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  ng: { label: 'NG', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  warning: { label: 'Warning', color: 'bg-yellow-500', icon: <AlertTriangle className="h-4 w-4" /> },
  pending: { label: 'Pending', color: 'bg-gray-500', icon: null },
};

export default function SNImageCompare() {
  const [activeTab, setActiveTab] = useState("compare");

  // Get statistics
  const { data: stats, isLoading: isLoadingStats } = trpc.snImage.getStats.useQuery();
  
  // Get recent images
  const { data: recentImages, isLoading: isLoadingRecent } = trpc.snImage.list.useQuery({
    limit: 10
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Columns className="h-6 w-6" />
              So sánh Ảnh theo Serial Number
            </h1>
            <p className="text-muted-foreground">
              So sánh ảnh giữa các SN khác nhau với nhiều chế độ xem
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sn-image-history">
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                Lịch sử ảnh
              </Button>
            </Link>
            <Link href="/image-comparison">
              <Button variant="outline">
                <Image className="h-4 w-4 mr-2" />
                So sánh Trước/Sau
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {isLoadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="h-16 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats && (
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
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="compare" className="flex items-center gap-1">
              <Columns className="h-4 w-4" />
              So sánh ảnh
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Ảnh gần đây
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="mt-4">
            <SNImageComparison maxSlots={4} initialMode="side-by-side" />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ảnh gần đây</CardTitle>
                <CardDescription>
                  10 ảnh được chụp gần nhất trong hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecent ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : recentImages?.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <Image className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chưa có ảnh nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {recentImages?.items.map((image) => {
                      const result = image.analysisResult as keyof typeof resultConfig;
                      return (
                        <div key={image.id} className="group relative">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <img
                              src={image.thumbnailUrl || image.imageUrl}
                              alt={image.serialNumber}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="absolute top-2 left-2">
                            {result && resultConfig[result] && (
                              <Badge className={resultConfig[result].color}>
                                {resultConfig[result].icon}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="font-medium text-sm truncate">{image.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {image.capturedAt 
                                ? new Date(image.capturedAt).toLocaleString('vi-VN')
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Tips */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hướng dẫn sử dụng</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Side by Side:</strong> So sánh nhiều ảnh cạnh nhau, zoom và pan đồng bộ</p>
            <p>• <strong>Overlay:</strong> Chồng 2 ảnh lên nhau với chế độ blend khác nhau để phát hiện khác biệt</p>
            <p>• <strong>Slider:</strong> Kéo thanh trượt để so sánh 2 ảnh theo chiều ngang</p>
            <p>• <strong>Zoom:</strong> Sử dụng nút +/- hoặc cuộn chuột để phóng to/thu nhỏ</p>
            <p>• <strong>Pan:</strong> Kéo chuột để di chuyển ảnh khi đã zoom</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
