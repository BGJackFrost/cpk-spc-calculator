/**
 * WidgetFilterBar - Component bộ lọc tái sử dụng cho các widgets
 * Hỗ trợ lọc theo thời gian và production line
 */
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface WidgetFilters {
  periodDays: number;
  productionLineId?: number;
  startDate?: Date;
  endDate?: Date;
}

interface WidgetFilterBarProps {
  filters: WidgetFilters;
  onFiltersChange: (filters: WidgetFilters) => void;
  showProductionLine?: boolean;
  showDateRange?: boolean;
  showExport?: boolean;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
  compact?: boolean;
}

const periodOptions = [
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 60, label: '60 ngày' },
  { value: 90, label: '90 ngày' },
];

export function WidgetFilterBar({
  filters,
  onFiltersChange,
  showProductionLine = true,
  showDateRange = false,
  showExport = false,
  onExportPdf,
  onExportExcel,
  isExporting = false,
  compact = false,
}: WidgetFilterBarProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: filters.startDate,
    to: filters.endDate,
  });

  // Fetch production lines
  const { data: productionLines = [] } = trpc.productionLine.list.useQuery();

  const handlePeriodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      periodDays: Number(value),
      startDate: undefined,
      endDate: undefined,
    });
  };

  const handleProductionLineChange = (value: string) => {
    onFiltersChange({
      ...filters,
      productionLineId: value === 'all' ? undefined : Number(value),
    });
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        const days = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
        onFiltersChange({
          ...filters,
          periodDays: days,
          startDate: range.from,
          endDate: range.to,
        });
      }
    }
  };

  const clearFilters = () => {
    setDateRange({});
    onFiltersChange({
      periodDays: 30,
      productionLineId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasActiveFilters = filters.productionLineId !== undefined || 
    filters.startDate !== undefined || 
    filters.periodDays !== 30;

  const selectedLine = productionLines.find(l => l.id === filters.productionLineId);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.periodDays.toString()} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showProductionLine && (
          <Select 
            value={filters.productionLineId?.toString() || 'all'} 
            onValueChange={handleProductionLineChange}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {productionLines.map(line => (
                <SelectItem key={line.id} value={line.id.toString()}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showExport && (
          <div className="flex items-center gap-1">
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={onExportPdf}
                disabled={isExporting}
              >
                <FileText className="h-3 w-3" />
              </Button>
            )}
            {onExportExcel && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={onExportExcel}
                disabled={isExporting}
              >
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Bộ lọc:</span>
        </div>

        {/* Period Select */}
        <Select value={filters.periodDays.toString()} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Production Line Select */}
        {showProductionLine && (
          <Select 
            value={filters.productionLineId?.toString() || 'all'} 
            onValueChange={handleProductionLineChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dây chuyền</SelectItem>
              {productionLines.map(line => (
                <SelectItem key={line.id} value={line.id.toString()}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range Picker */}
        {showDateRange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: vi })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: vi })
                  )
                ) : (
                  "Chọn khoảng thời gian"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange as any}
                onSelect={handleDateRangeSelect as any}
                numberOfMonths={2}
                locale={vi}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Active Filters Badge */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Xóa bộ lọc
          </Button>
        )}

        {/* Selected Line Badge */}
        {selectedLine && (
          <Badge variant="secondary" className="gap-1">
            {selectedLine.name}
            <X 
              className="h-3 w-3 cursor-pointer" 
              onClick={() => handleProductionLineChange('all')}
            />
          </Badge>
        )}
      </div>

      {/* Export Buttons */}
      {showExport && (
        <div className="flex items-center gap-2">
          {onExportPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPdf}
              disabled={isExporting}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          )}
          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={isExporting}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default WidgetFilterBar;
