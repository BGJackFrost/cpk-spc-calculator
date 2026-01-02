import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface ExportAIReportProps {
  className?: string;
}

export default function ExportAIReport({ className }: ExportAIReportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const exportExcel = trpc.aiExport.exportExcel.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Đã xuất báo cáo Excel thành công!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Lỗi khi xuất Excel: ${error.message}`);
    },
  });

  const exportPdf = trpc.aiExport.exportPdf.useMutation({
    onSuccess: (data) => {
      // Open HTML in new tab for printing to PDF
      const blob = new Blob([data.content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        newWindow.onload = () => {
          // Auto print dialog for PDF
          setTimeout(() => {
            newWindow.print();
          }, 500);
        };
      }
      
      toast.success("Đã mở báo cáo PDF - Sử dụng Print để lưu PDF");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Lỗi khi xuất PDF: ${error.message}`);
    },
  });

  const handleExportExcel = () => {
    exportExcel.mutate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  const handleExportPdf = () => {
    exportPdf.mutate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  const isLoading = exportExcel.isPending || exportPdf.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Xuất báo cáo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Xuất Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Xuất PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xuất báo cáo AI Model Performance</DialogTitle>
            <DialogDescription>
              Chọn khoảng thời gian để xuất báo cáo hiệu suất các model AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Từ ngày</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Đến ngày</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Báo cáo sẽ bao gồm:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Tổng quan hiệu suất các model AI</li>
                <li>Chi tiết độ chính xác (Accuracy, Precision, Recall, F1)</li>
                <li>Lịch sử huấn luyện model</li>
                <li>Thống kê dự đoán theo thời gian</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleExportExcel} 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {exportExcel.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Xuất Excel
            </Button>
            <Button 
              onClick={handleExportPdf} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {exportPdf.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Xuất PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
