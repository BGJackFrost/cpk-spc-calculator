import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { History as HistoryIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function History() {
  const { data: history, isLoading } = trpc.spc.history.useQuery({ limit: 100 });

  const getCpkBadge = (cpk: number | null) => {
    if (cpk === null) return <Badge variant="secondary">N/A</Badge>;
    const cpkValue = cpk / 1000;
    if (cpkValue >= 1.67) return <Badge className="bg-chart-3 text-white">Xuất sắc ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.33) return <Badge className="bg-chart-2 text-white">Tốt ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.0) return <Badge className="bg-warning text-warning-foreground">Chấp nhận ({cpkValue.toFixed(3)})</Badge>;
    return <Badge variant="destructive">Không đạt ({cpkValue.toFixed(3)})</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            Lịch sử phân tích
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem lại các phân tích SPC/CPK đã thực hiện
          </p>
        </div>

        {/* History Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Danh sách phân tích</CardTitle>
            <CardDescription>
              {history?.length || 0} phân tích đã được thực hiện
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history && history.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Mã sản phẩm</TableHead>
                      <TableHead>Trạm</TableHead>
                      <TableHead>Khoảng thời gian</TableHead>
                      <TableHead className="text-center">Số mẫu</TableHead>
                      <TableHead className="text-right">Mean</TableHead>
                      <TableHead className="text-right">Std Dev</TableHead>
                      <TableHead className="text-center">CPK</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </TableCell>
                        <TableCell>{item.productCode}</TableCell>
                        <TableCell>{item.stationName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.startDate), "dd/MM", { locale: vi })} - {format(new Date(item.endDate), "dd/MM/yyyy", { locale: vi })}
                        </TableCell>
                        <TableCell className="text-center">{item.sampleCount}</TableCell>
                        <TableCell className="text-right font-mono">
                          {(item.mean / 1000).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(item.stdDev / 1000).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getCpkBadge(item.cpk)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.alertTriggered ? (
                            <AlertTriangle className="h-5 w-5 text-destructive inline" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-chart-3 inline" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Chưa có lịch sử phân tích</h3>
                <p className="text-muted-foreground mt-1">
                  Thực hiện phân tích SPC/CPK để xem lịch sử tại đây
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
