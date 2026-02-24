import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Target,
  Gauge,
} from "lucide-react";

type ComparisonPeriod = "week" | "month" | "quarter";

interface PeriodData {
  label: string;
  startDate: string;
  endDate: string;
}

function getComparisonPeriods(period: ComparisonPeriod): { current: PeriodData; previous: PeriodData } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  const dayOfWeek = now.getDay();

  if (period === "week") {
    // Current week (Monday to Sunday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentDate - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);

    return {
      current: {
        label: "Tuần này",
        startDate: currentWeekStart.toISOString().split("T")[0],
        endDate: currentWeekEnd.toISOString().split("T")[0],
      },
      previous: {
        label: "Tuần trước",
        startDate: previousWeekStart.toISOString().split("T")[0],
        endDate: previousWeekEnd.toISOString().split("T")[0],
      },
    };
  } else if (period === "month") {
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthEnd = new Date(currentYear, currentMonth, 0);

    return {
      current: {
        label: "Tháng này",
        startDate: currentMonthStart.toISOString().split("T")[0],
        endDate: currentMonthEnd.toISOString().split("T")[0],
      },
      previous: {
        label: "Tháng trước",
        startDate: previousMonthStart.toISOString().split("T")[0],
        endDate: previousMonthEnd.toISOString().split("T")[0],
      },
    };
  } else {
    // Quarter
    const currentQuarter = Math.floor(currentMonth / 3);
    const currentQuarterStart = new Date(currentYear, currentQuarter * 3, 1);
    const currentQuarterEnd = new Date(currentYear, currentQuarter * 3 + 3, 0);
    
    const previousQuarterStart = new Date(currentYear, currentQuarter * 3 - 3, 1);
    const previousQuarterEnd = new Date(currentYear, currentQuarter * 3, 0);

    return {
      current: {
        label: `Q${currentQuarter + 1}/${currentYear}`,
        startDate: currentQuarterStart.toISOString().split("T")[0],
        endDate: currentQuarterEnd.toISOString().split("T")[0],
      },
      previous: {
        label: currentQuarter === 0 ? `Q4/${currentYear - 1}` : `Q${currentQuarter}/${currentYear}`,
        startDate: previousQuarterStart.toISOString().split("T")[0],
        endDate: previousQuarterEnd.toISOString().split("T")[0],
      },
    };
  }
}

interface ComparisonBarProps {
  label: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  higherIsBetter?: boolean;
}

function ComparisonBar({ label, currentValue, previousValue, unit, higherIsBetter = true }: ComparisonBarProps) {
  const change = currentValue - previousValue;
  const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  const isPositive = higherIsBetter ? change > 0 : change < 0;
  const maxValue = Math.max(currentValue, previousValue, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {change !== 0 ? (
            <Badge className={isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
            </Badge>
          ) : (
            <Badge variant="outline">
              <Minus className="h-3 w-3 mr-1" />
              Không đổi
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">Hiện tại:</span>
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded flex items-center justify-end pr-2"
              style={{ width: `${(currentValue / maxValue) * 100}%` }}
            >
              <span className="text-xs text-white font-medium">{currentValue.toFixed(1)}{unit}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">Trước đó:</span>
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div 
              className="h-full bg-gray-400 rounded flex items-center justify-end pr-2"
              style={{ width: `${(previousValue / maxValue) * 100}%` }}
            >
              <span className="text-xs text-white font-medium">{previousValue.toFixed(1)}{unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimePeriodComparison() {
  const [period, setPeriod] = useState<ComparisonPeriod>("week");
  const [activeTab, setActiveTab] = useState("oee");

  const periods = useMemo(() => getComparisonPeriods(period), [period]);

  // Fetch OEE data for both periods
  const { data: currentOeeData, isLoading: loadingCurrentOee } = trpc.oee.listRecords.useQuery({
    startDate: periods.current.startDate,
    endDate: periods.current.endDate,
  });

  const { data: previousOeeData, isLoading: loadingPreviousOee } = trpc.oee.listRecords.useQuery({
    startDate: periods.previous.startDate,
    endDate: periods.previous.endDate,
  });

  // Fetch CPK data for both periods - filter client-side since history API doesn't support date range
  const { data: allCpkData, isLoading: loadingCpk } = trpc.spc.history.useQuery({ limit: 1000 });
  
  // Filter CPK data by date range client-side
  const currentCpkData = useMemo(() => {
    if (!allCpkData) return [];
    const startDate = new Date(periods.current.startDate);
    const endDate = new Date(periods.current.endDate);
    endDate.setHours(23, 59, 59, 999);
    return allCpkData.filter((r: any) => {
      const date = new Date(r.createdAt);
      return date >= startDate && date <= endDate;
    });
  }, [allCpkData, periods.current]);

  const previousCpkData = useMemo(() => {
    if (!allCpkData) return [];
    const startDate = new Date(periods.previous.startDate);
    const endDate = new Date(periods.previous.endDate);
    endDate.setHours(23, 59, 59, 999);
    return allCpkData.filter((r: any) => {
      const date = new Date(r.createdAt);
      return date >= startDate && date <= endDate;
    });
  }, [allCpkData, periods.previous]);
  
  const loadingCurrentCpk = loadingCpk;
  const loadingPreviousCpk = loadingCpk;

  const isLoading = loadingCurrentOee || loadingPreviousOee || loadingCurrentCpk || loadingPreviousCpk;

  // Calculate OEE statistics
  const oeeStats = useMemo(() => {
    type OeeRecord = { oee: number | string | null; availability: number | string | null; performance: number | string | null; quality: number | string | null };
    const calcStats = (data: OeeRecord[] | undefined) => {
      if (!data || data.length === 0) return { oee: 0, availability: 0, performance: 0, quality: 0, count: 0 };
      const oeeValues = data.map((r: OeeRecord) => Number(r.oee));
      const availValues = data.map((r: OeeRecord) => Number(r.availability));
      const perfValues = data.map((r: OeeRecord) => Number(r.performance));
      const qualValues = data.map((r: OeeRecord) => Number(r.quality));
      return {
        oee: oeeValues.reduce((a: number, b: number) => a + b, 0) / oeeValues.length,
        availability: availValues.reduce((a: number, b: number) => a + b, 0) / availValues.length,
        performance: perfValues.reduce((a: number, b: number) => a + b, 0) / perfValues.length,
        quality: qualValues.reduce((a: number, b: number) => a + b, 0) / qualValues.length,
        count: data.length,
      };
    };

    return {
      current: calcStats(currentOeeData as OeeRecord[] | undefined),
      previous: calcStats(previousOeeData as OeeRecord[] | undefined),
    };
  }, [currentOeeData, previousOeeData]);

  // Calculate CPK statistics
  const cpkStats = useMemo(() => {
    type CpkRecord = { cpk: number | string | null; cp: number | string | null; ppk: number | string | null };
    const calcStats = (data: CpkRecord[] | undefined) => {
      if (!data || data.length === 0) return { cpk: 0, cp: 0, ppk: 0, count: 0 };
      const cpkValues = data.map((r: CpkRecord) => Number(r.cpk)).filter((v: number) => !isNaN(v));
      const cpValues = data.map((r: CpkRecord) => Number(r.cp)).filter((v: number) => !isNaN(v));
      const ppkValues = data.map((r: CpkRecord) => Number(r.ppk)).filter((v: number) => !isNaN(v));
      return {
        cpk: cpkValues.length > 0 ? cpkValues.reduce((a: number, b: number) => a + b, 0) / cpkValues.length : 0,
        cp: cpValues.length > 0 ? cpValues.reduce((a: number, b: number) => a + b, 0) / cpValues.length : 0,
        ppk: ppkValues.length > 0 ? ppkValues.reduce((a: number, b: number) => a + b, 0) / ppkValues.length : 0,
        count: data.length,
      };
    };

    return {
      current: calcStats(currentCpkData as unknown as CpkRecord[] | undefined),
      previous: calcStats(previousCpkData as unknown as CpkRecord[] | undefined),
    };
  }, [currentCpkData, previousCpkData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              So sánh theo thời gian
            </CardTitle>
            <CardDescription>
              So sánh hiệu suất OEE và CPK giữa các khoảng thời gian
            </CardDescription>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as ComparisonPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Theo tuần</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
              <SelectItem value="quarter">Theo quý</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Period Labels */}
            <div className="flex items-center justify-center gap-4 mb-6 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">{periods.previous.label}</Badge>
                <p className="text-xs text-muted-foreground">
                  {periods.previous.startDate} → {periods.previous.endDate}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <Badge className="mb-1 bg-primary">{periods.current.label}</Badge>
                <p className="text-xs text-muted-foreground">
                  {periods.current.startDate} → {periods.current.endDate}
                </p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oee" className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  OEE
                </TabsTrigger>
                <TabsTrigger value="cpk" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  CPK
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oee" className="space-y-4 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-600 mb-1">{periods.current.label}</p>
                    <p className="text-3xl font-bold text-blue-700">{oeeStats.current.oee.toFixed(1)}%</p>
                    <p className="text-xs text-blue-500">{oeeStats.current.count} bản ghi</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{periods.previous.label}</p>
                    <p className="text-3xl font-bold text-gray-700">{oeeStats.previous.oee.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{oeeStats.previous.count} bản ghi</p>
                  </div>
                </div>

                {/* Detailed Comparison */}
                <div className="space-y-4 pt-4 border-t">
                  <ComparisonBar 
                    label="OEE Tổng" 
                    currentValue={oeeStats.current.oee} 
                    previousValue={oeeStats.previous.oee}
                    unit="%"
                  />
                  <ComparisonBar 
                    label="Availability" 
                    currentValue={oeeStats.current.availability} 
                    previousValue={oeeStats.previous.availability}
                    unit="%"
                  />
                  <ComparisonBar 
                    label="Performance" 
                    currentValue={oeeStats.current.performance} 
                    previousValue={oeeStats.previous.performance}
                    unit="%"
                  />
                  <ComparisonBar 
                    label="Quality" 
                    currentValue={oeeStats.current.quality} 
                    previousValue={oeeStats.previous.quality}
                    unit="%"
                  />
                </div>
              </TabsContent>

              <TabsContent value="cpk" className="space-y-4 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-sm text-purple-600 mb-1">{periods.current.label}</p>
                    <p className="text-3xl font-bold text-purple-700">{cpkStats.current.cpk.toFixed(2)}</p>
                    <p className="text-xs text-purple-500">{cpkStats.current.count} bản ghi</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{periods.previous.label}</p>
                    <p className="text-3xl font-bold text-gray-700">{cpkStats.previous.cpk.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{cpkStats.previous.count} bản ghi</p>
                  </div>
                </div>

                {/* Detailed Comparison */}
                <div className="space-y-4 pt-4 border-t">
                  <ComparisonBar 
                    label="CPK" 
                    currentValue={cpkStats.current.cpk} 
                    previousValue={cpkStats.previous.cpk}
                    unit=""
                  />
                  <ComparisonBar 
                    label="CP" 
                    currentValue={cpkStats.current.cp} 
                    previousValue={cpkStats.previous.cp}
                    unit=""
                  />
                  <ComparisonBar 
                    label="PPK" 
                    currentValue={cpkStats.current.ppk} 
                    previousValue={cpkStats.previous.ppk}
                    unit=""
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
