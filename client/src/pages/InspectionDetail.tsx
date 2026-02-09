import { useState } from "react";
import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Image, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const inspectionId = parseInt(id || '0');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [ntfDialogOpen, setNtfDialogOpen] = useState(false);
  const [ntfReason, setNtfReason] = useState<string>('');
  const [ntfDetail, setNtfDetail] = useState('');

  const { data: measurementPoints, isLoading, refetch } = trpc.aviAoiEnhancement.measurementPoint.getByInspection.useQuery({ inspectionId });
  const { data: ntfHistory } = trpc.aviAoiEnhancement.ntfConfirmation.getByInspection.useQuery({ inspectionId });

  const confirmNtfMutation = trpc.aviAoiEnhancement.ntfConfirmation.confirm.useMutation({
    onSuccess: () => { toast.success("Đã xác nhận NTF thành công"); setNtfDialogOpen(false); refetch(); },
    onError: (error) => { toast.error("Lỗi: " + error.message); },
  });

  const handleConfirmNtf = () => {
    if (!ntfReason) { toast.error("Vui lòng chọn lý do NTF"); return; }
    confirmNtfMutation.mutate({ inspectionId, originalResult: 'NG', ntfReason: ntfReason as any, reasonDetail: ntfDetail });
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'OK': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>;
      case 'NG': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />NG</Badge>;
      case 'NTF': return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />NTF</Badge>;
      default: return <Badge variant="outline">{result}</Badge>;
    }
  };

  const selectedPointData = measurementPoints?.find(p => p.id === selectedPoint);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/avi-aoi-history"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold">Chi tiết Inspection #{inspectionId}</h1>
              <p className="text-muted-foreground">Xem chi tiết các điểm đo và kết quả kiểm tra</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Làm mới</Button>
            <Dialog open={ntfDialogOpen} onOpenChange={setNtfDialogOpen}>
              <DialogTrigger asChild><Button variant="default"><AlertTriangle className="h-4 w-4 mr-2" />Xác nhận NTF</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Xác nhận NTF (Not True Fail)</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lý do NTF</label>
                    <Select value={ntfReason} onValueChange={setNtfReason}>
                      <SelectTrigger><SelectValue placeholder="Chọn lý do" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="machine_error">Lỗi máy</SelectItem>
                        <SelectItem value="lighting_issue">Vấn đề ánh sáng</SelectItem>
                        <SelectItem value="dust_particle">Bụi/Hạt</SelectItem>
                        <SelectItem value="false_detection">Phát hiện sai</SelectItem>
                        <SelectItem value="calibration_drift">Lệch calibration</SelectItem>
                        <SelectItem value="operator_error">Lỗi người vận hành</SelectItem>
                        <SelectItem value="material_variation">Biến đổi vật liệu</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chi tiết (tùy chọn)</label>
                    <Textarea value={ntfDetail} onChange={(e) => setNtfDetail(e.target.value)} placeholder="Nhập chi tiết lý do NTF..." />
                  </div>
                  <Button className="w-full" onClick={handleConfirmNtf} disabled={confirmNtfMutation.isPending}>
                    {confirmNtfMutation.isPending ? "Đang xử lý..." : "Xác nhận NTF"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {ntfHistory && ntfHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Lịch sử xác nhận NTF</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ntfHistory.map((ntf) => (
                  <div key={ntf.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div><span className="font-medium">{ntf.ntfReason}</span>{ntf.reasonDetail && <span className="text-muted-foreground ml-2">- {ntf.reasonDetail}</span>}</div>
                    <Badge variant={ntf.reviewStatus === 'approved' ? 'default' : ntf.reviewStatus === 'rejected' ? 'destructive' : 'outline'}>{ntf.reviewStatus}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Điểm đo ({measurementPoints?.length || 0})</CardTitle><CardDescription>Danh sách các điểm đo trong inspection này</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-2">{[1, 2, 3].map(i => (<div key={i} className="h-16 bg-muted rounded"></div>))}</div>
              ) : measurementPoints && measurementPoints.length > 0 ? (
                <div className="space-y-2">
                  {measurementPoints.map((point) => (
                    <div key={point.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedPoint === point.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedPoint(point.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {point.imageUrl && <Image className="h-4 w-4 text-muted-foreground" />}
                          <div><div className="font-medium">{point.pointName}</div>{point.pointCode && <div className="text-xs text-muted-foreground">{point.pointCode}</div>}</div>
                        </div>
                        {getResultBadge(point.result)}
                      </div>
                      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                        <span>Đo: {point.measuredValue ?? '-'}</span>
                        <span>Chuẩn: {point.standardValue ?? '-'}</span>
                        {point.tolerance && <span>Dung sai: ±{point.tolerance}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<div className="text-center py-8 text-muted-foreground">Không có điểm đo nào</div>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />Chi tiết điểm đo</CardTitle></CardHeader>
            <CardContent>
              {selectedPointData ? (
                <div className="space-y-4">
                  <div><div className="text-sm text-muted-foreground">Tên điểm</div><div className="font-medium">{selectedPointData.pointName}</div></div>
                  <div className="flex justify-between">
                    <div><div className="text-sm text-muted-foreground">Kết quả</div>{getResultBadge(selectedPointData.result)}</div>
                    {selectedPointData.defectSeverity && (<div><div className="text-sm text-muted-foreground">Mức độ</div><Badge variant="outline">{selectedPointData.defectSeverity}</Badge></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><div className="text-sm text-muted-foreground">Giá trị đo</div><div className="font-medium">{selectedPointData.measuredValue ?? '-'} {selectedPointData.unit}</div></div>
                    <div><div className="text-sm text-muted-foreground">Giá trị chuẩn</div><div className="font-medium">{selectedPointData.standardValue ?? '-'} {selectedPointData.unit}</div></div>
                    <div><div className="text-sm text-muted-foreground">USL</div><div className="font-medium">{selectedPointData.usl ?? '-'}</div></div>
                    <div><div className="text-sm text-muted-foreground">LSL</div><div className="font-medium">{selectedPointData.lsl ?? '-'}</div></div>
                  </div>
                  {selectedPointData.defectType && (<div><div className="text-sm text-muted-foreground">Loại lỗi</div><div className="font-medium">{selectedPointData.defectType}</div></div>)}
                  {selectedPointData.remark && (<div><div className="text-sm text-muted-foreground">Ghi chú</div><div className="text-sm">{selectedPointData.remark}</div></div>)}
                  {selectedPointData.imageUrl && (<div><div className="text-sm text-muted-foreground mb-2">Hình ảnh</div><img src={selectedPointData.imageUrl} alt={selectedPointData.pointName} className="w-full rounded-lg border" /></div>)}
                </div>
              ) : (<div className="text-center py-8 text-muted-foreground">Chọn một điểm đo để xem chi tiết</div>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
