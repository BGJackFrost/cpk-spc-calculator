/**
 * TrendExportButton - Nút export biểu đồ trend ra PDF/Excel
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface TrendExportButtonProps {
  data: Array<{
    timestamp: number;
    date: string;
    yieldRate: number;
    defectRate: number;
    totalInspected: number;
    totalPassed: number;
    totalDefects: number;
  }>;
  timeRange: string;
  aggregation: string;
  yieldWarningThreshold?: number;
  yieldCriticalThreshold?: number;
  defectWarningThreshold?: number;
  defectCriticalThreshold?: number;
}

export function TrendExportButton({
  data,
  timeRange,
  aggregation,
  yieldWarningThreshold = 95,
  yieldCriticalThreshold = 90,
  defectWarningThreshold = 3,
  defectCriticalThreshold = 5,
}: TrendExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportMutation = trpc.aoiAvi.exportTrendReport.useMutation({
    onSuccess: (result) => {
      const byteArray = new Uint8Array(
        atob(result.data)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const blob = new Blob([byteArray], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Xuất báo cáo thành công",
        description: `File ${result.filename} đã được tải xuống`,
      });
      setIsExporting(false);
    },
    onError: (error) => {
      toast({
        title: "Lỗi xuất báo cáo",
        description: error.message,
        variant: "destructive",
      });
      setIsExporting(false);
    },
  });

  const handleExport = (format: "pdf" | "excel") => {
    if (data.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Không có dữ liệu để xuất báo cáo",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    exportMutation.mutate({
      format,
      data,
      timeRange,
      aggregation,
      yieldWarningThreshold,
      yieldCriticalThreshold,
      defectWarningThreshold,
      defectCriticalThreshold,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2" />
          Xuất PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuất Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TrendExportButton;
