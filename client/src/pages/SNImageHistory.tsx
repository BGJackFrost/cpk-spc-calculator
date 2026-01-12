import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { SNImageViewer } from "@/components/SNImageViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Image, CheckCircle, XCircle, AlertTriangle, Clock, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

type AnalysisResult = 'ok' | 'ng' | 'warning' | 'pending';

const resultConfig: Record<AnalysisResult, { label: string; color: string; icon: React.ReactNode }> = {
  ok: { label: 'OK', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  ng: { label: 'NG', color: 'bg-red-500', icon: <XCircle className="h-4 w-4 text-red-500" /> },
  warning: { label: 'Warning', color: 'bg-yellow-500', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
  pending: { label: 'Pending', color: 'bg-gray-500', icon: <Clock className="h-4 w-4 text-gray-500" /> },
};

export default function SNImageHistory() {
  const [searchSN, setSearchSN] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const pageSize = 20;

  const { data: stats } = trpc.snImage.getStats.useQuery();
  const { data: imagesData, isLoading } = trpc.snImage.list.useQuery({
    serialNumber: searchSN || undefined,
    analysisResult: filterResult !== 'all' ? filterResult as AnalysisResult : undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const totalPages = Math.ceil((imagesData?.total || 0) / pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Ảnh theo SN</h1>
          <p className="text-muted-foreground">Xem chi tiết ảnh, điểm đo và kết quả phân tích theo Serial Number</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tổng ảnh</p><p className="text-2xl font-bold">{stats.total}</p></div><Image className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">OK</p><p className="text-2xl font-bold text-green-500">{stats.ok}</p></div><CheckCircle className="h-8 w-8 text-green-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">NG</p><p className="text-2xl font-bold text-red-500">{stats.ng}</p></div><XCircle className="h-8 w-8 text-red-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Warning</p><p className="text-2xl font-bold text-yellow-500">{stats.warning}</p></div><AlertTriangle className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Điểm TB</p><p className="text-2xl font-bold">{stats.avgQualityScore.toFixed(1)}%</p></div><Badge variant="outline" className="text-lg">{stats.totalMeasurements} đo</Badge></div></CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Tìm kiếm</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Serial Number</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchSN} onChange={(e) => { setSearchSN(e.target.value); setPage(0); }} placeholder="Nhập SN để tìm kiếm..." className="pl-10" />
                </div>
              </div>
              <div className="w-48">
                <Label>Kết quả</Label>
                <Select value={filterResult} onValueChange={(v) => { setFilterResult(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="ng">NG</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Kết quả ({imagesData?.total || 0})</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm">Trang {page + 1} / {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : imagesData?.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64"><Image className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">Không tìm thấy ảnh nào</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Thumbnail</TableHead><TableHead>Serial Number</TableHead><TableHead>Kết quả</TableHead><TableHead>Điểm chất lượng</TableHead><TableHead>Điểm đo</TableHead><TableHead>Lỗi</TableHead><TableHead>Thời gian</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {imagesData?.items.map((image) => {
                    const result = image.analysisResult as AnalysisResult;
                    return (
                      <TableRow key={image.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedImage(image)}>
                        <TableCell><div className="w-16 h-12 rounded overflow-hidden bg-muted"><img src={image.thumbnailUrl || image.imageUrl} alt={image.serialNumber} className="w-full h-full object-cover" /></div></TableCell>
                        <TableCell className="font-medium">{image.serialNumber}</TableCell>
                        <TableCell>{result && resultConfig[result] && (<Badge className={resultConfig[result].color}>{resultConfig[result].icon}<span className="ml-1">{resultConfig[result].label}</span></Badge>)}</TableCell>
                        <TableCell>{image.qualityScore ? `${parseFloat(image.qualityScore).toFixed(1)}%` : '-'}</TableCell>
                        <TableCell>{image.measurementsCount}</TableCell>
                        <TableCell>{image.defectsFound > 0 ? (<Badge variant="destructive">{image.defectsFound}</Badge>) : (<Badge variant="outline">0</Badge>)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{image.capturedAt ? new Date(image.capturedAt).toLocaleString('vi-VN') : '-'}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedImage(image); }}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <SNImageViewer open={!!selectedImage} onClose={() => setSelectedImage(null)} image={selectedImage} />
    </DashboardLayout>
  );
}
