/**
 * Performance Report Export Component
 * 
 * Allows exporting performance reports with configurable date range and options.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Clock,
  Database,
  AlertTriangle,
  Zap,
  RefreshCw,
} from "lucide-react";

type DatePreset = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

export function PerformanceReportExport() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [includeSlowQueries, setIncludeSlowQueries] = useState(true);
  const [includePoolStats, setIncludePoolStats] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeCacheStats, setIncludeCacheStats] = useState(true);

  const exportMutation = trpc.performanceAlert.exportReport.useMutation({
    onSuccess: (data) => {
      toast.success("Report generated successfully");
      // Open download link
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (datePreset) {
      case "today":
        return {
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
        };
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          startDate: yesterday.toISOString(),
          endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
        };
      case "last7days":
        return {
          startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: now.toISOString(),
        };
      case "last30days":
        return {
          startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: now.toISOString(),
        };
      case "thisMonth":
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          endDate: now.toISOString(),
        };
      case "lastMonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return {
          startDate: lastMonth.toISOString(),
          endDate: lastMonthEnd.toISOString(),
        };
      case "custom":
        return {
          startDate: customStartDate ? new Date(customStartDate).toISOString() : today.toISOString(),
          endDate: customEndDate ? new Date(customEndDate + "T23:59:59").toISOString() : now.toISOString(),
        };
      default:
        return {
          startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: now.toISOString(),
        };
    }
  };

  const handleExport = () => {
    const { startDate, endDate } = getDateRange();
    exportMutation.mutate({
      startDate,
      endDate,
      includeSlowQueries,
      includePoolStats,
      includeAlerts,
      includeCacheStats,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export Performance Report
        </CardTitle>
        <CardDescription>
          Generate Excel report with performance metrics, slow queries, pool stats, and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Selection */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Label>
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Report Options */}
        <div className="space-y-4">
          <Label>Include in Report</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Slow Queries</span>
              </div>
              <Switch
                checked={includeSlowQueries}
                onCheckedChange={setIncludeSlowQueries}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Pool Stats</span>
              </div>
              <Switch
                checked={includePoolStats}
                onCheckedChange={setIncludePoolStats}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Alerts</span>
              </div>
              <Switch
                checked={includeAlerts}
                onCheckedChange={setIncludeAlerts}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Cache Stats</span>
              </div>
              <Switch
                checked={includeCacheStats}
                onCheckedChange={setIncludeCacheStats}
              />
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button
          className="w-full"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </>
          )}
        </Button>

        {/* Last Export Info */}
        {exportMutation.data && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              Report generated: <strong>{exportMutation.data.filename}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Period: {exportMutation.data.summary.period} | 
              Slow Queries: {exportMutation.data.summary.slowQueries} | 
              Alerts: {exportMutation.data.summary.totalAlerts}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PerformanceReportExport;
