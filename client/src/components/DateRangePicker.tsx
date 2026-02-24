import * as React from "react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  showPresets?: boolean;
  presets?: Array<{
    label: string;
    days: number;
  }>;
}

const defaultPresets = [
  { label: "7 ngày qua", labelEn: "Last 7 days", days: 7 },
  { label: "14 ngày qua", labelEn: "Last 14 days", days: 14 },
  { label: "30 ngày qua", labelEn: "Last 30 days", days: 30 },
  { label: "90 ngày qua", labelEn: "Last 90 days", days: 90 },
  { label: "Tùy chỉnh", labelEn: "Custom", days: -1 },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const locale = isVi ? vi : enUS;
  
  const [selectedPreset, setSelectedPreset] = React.useState<string>("30");
  const [isCustom, setIsCustom] = React.useState(false);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    
    if (value === "-1") {
      setIsCustom(true);
      return;
    }
    
    setIsCustom(false);
    const days = parseInt(value);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    onDateRangeChange({
      from: startDate,
      to: endDate,
    });
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return isVi ? "Chọn khoảng thời gian" : "Select date range";
    }
    
    if (!dateRange.to) {
      return format(dateRange.from, "dd/MM/yyyy", { locale });
    }
    
    return `${format(dateRange.from, "dd/MM/yyyy", { locale })} - ${format(dateRange.to, "dd/MM/yyyy", { locale })}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPresets && (
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={isVi ? "Chọn thời gian" : "Select period"} />
          </SelectTrigger>
          <SelectContent>
            {defaultPresets.map((preset) => (
              <SelectItem key={preset.days} value={preset.days.toString()}>
                {isVi ? preset.label : preset.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(isCustom || !showPresets) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
              <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
            <div className="flex items-center justify-between p-3 border-t">
              <div className="text-sm text-muted-foreground">
                {dateRange?.from && dateRange?.to && (
                  <>
                    {Math.ceil(
                      (dateRange.to.getTime() - dateRange.from.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    {isVi ? "ngày" : "days"}
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const endDate = new Date();
                  const startDate = new Date();
                  startDate.setDate(startDate.getDate() - 30);
                  onDateRangeChange({ from: startDate, to: endDate });
                }}
              >
                {isVi ? "Đặt lại" : "Reset"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default DateRangePicker;
