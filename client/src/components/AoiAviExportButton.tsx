/**
 * Component nút xuất báo cáo AOI/AVI
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown,
  Calendar as CalendarIcon,
  Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface AoiAviExportButtonProps {
  productionLineId?: number;
  productionLineName?: string;
  className?: string;
  timeRange?: string;
  machineId?: number;
  variant?: 'dropdown' | 'pdf' | 'excel';
}

export function AoiAviExportButton({
  productionLineId,
  productionLineName,
  className,
  timeRange: propTimeRange,
  machineId,
  variant = 'dropdown',
}: AoiAviExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  
  // Calculate date range based on propTimeRange
  const getInitialDateRange = () => {
    const now = new Date();
    let from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (propTimeRange) {
      const hoursMap: Record<string, number> = {
        '1h': 1, '6h': 6, '12h': 12, '24h': 24, '7d': 168, '30d': 720
      };
      const hours = hoursMap[propTimeRange] || 24;
      from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
    
    return { from, to: now };
  };

  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(getInitialDateRange);
  
  const [options, setOptions] = useState({
    title: 'Báo cáo Kiểm tra AOI/AVI',
    includeDefectDetails: true,
    includeCharts: true,
  });

  const exportMutation = trpc.aoiAvi.exportReport.useMutation();

  const handleExport = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Vui lòng chọn khoảng thời gian');
      return;
    }

    setIsExporting(true);
    
    try {
      const result = await exportMutation.mutateAsync({
        format: exportType,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        productionLineId,
        title: options.title,
        includeDefectDetails: options.includeDefectDetails,
        includeCharts: options.includeCharts,
      });

      if (result.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename || `aoi-avi-report.${exportType === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Đã xuất báo cáo ${exportType.toUpperCase()} thành công`);
        setIsDialogOpen(false);
      } else if (result.base64) {
        // Handle base64 data
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: exportType === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `aoi-avi-report.${exportType === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Đã xuất báo cáo ${exportType.toUpperCase()} thành công`);
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Xuất báo cáo thất bại');
    } finally {
      setIsExporting(false);
    }
  };

  const openExportDialog = (type: 'excel' | 'pdf') => {
    setExportType(type);
    setIsDialogOpen(true);
  };

  // Render dialog component (reused across variants)
  const renderDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exportType === 'excel' ? (
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            ) : (
              <FileText className="h-5 w-5 text-red-600" />
            )}
            Xuất báo cáo {exportType.toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Cấu hình các tùy chọn xuất báo cáo AOI/AVI
            {productionLineName && ` cho ${productionLineName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tiêu đề báo cáo</Label>
            <Input
              value={options.title}
              onChange={(e) => setOptions({ ...options, title: e.target.value })}
              placeholder="Nhập tiêu đề báo cáo"
            />
          </div>

          <div className="space-y-2">
            <Label>Khoảng thời gian</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, "dd/MM/yyyy", { locale: vi })
                    ) : (
                      "Từ ngày"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, "dd/MM/yyyy", { locale: vi })
                    ) : (
                      "Đến ngày"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tùy chọn</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDefectDetails"
                checked={options.includeDefectDetails}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeDefectDetails: checked as boolean })
                }
              />
              <label
                htmlFor="includeDefectDetails"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Bao gồm chi tiết lỗi
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeCharts: checked as boolean })
                }
              />
              <label
                htmlFor="includeCharts"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Bao gồm biểu đồ (chỉ PDF)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Xuất {exportType.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render single button for specific variant
  if (variant === 'pdf') {
    return (
      <>
        <Button 
          variant="outline" 
          className={cn("gap-2", className)}
          onClick={() => openExportDialog('pdf')}
        >
          <FileText className="h-4 w-4 text-red-600" />
          Xuất PDF
        </Button>
        {renderDialog()}
      </>
    );
  }

  if (variant === 'excel') {
    return (
      <>
        <Button 
          variant="outline" 
          className={cn("gap-2", className)}
          onClick={() => openExportDialog('excel')}
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Xuất Excel
        </Button>
        {renderDialog()}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn("gap-2", className)}>
            <Download className="h-4 w-4" />
            Xuất báo cáo
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openExportDialog('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Xuất Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openExportDialog('pdf')}>
            <FileText className="h-4 w-4 mr-2 text-red-600" />
            Xuất PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renderDialog()}
    </>
  );
}

export default AoiAviExportButton;
