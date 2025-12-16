import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Radio, 
  AlertTriangle, 
  TrendingUp, 
  Bell, 
  RefreshCw, 
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  Activity,
  Cpu,
  Wrench
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default function SseEventLog() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: events, isLoading, refetch } = trpc.system.getSseEventLog.useQuery(
    { limit },
    { refetchInterval: 5000 } // Auto refresh every 5 seconds
  );

  const { data: sseStatus } = trpc.system.getSseStatus.useQuery();

  const clearLogMutation = trpc.system.clearSseEventLog.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa log");
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Filter events
  const filteredEvents = events?.filter(event => {
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesSearch = !searchTerm || 
      JSON.stringify(event.data)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  // Get event type badge
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'spc_analysis_complete':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> SPC Complete</Badge>;
      case 'cpk_alert':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> CPK Alert</Badge>;
      case 'plan_status_change':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><TrendingUp className="h-3 w-3 mr-1" /> Plan Status</Badge>;
      case 'oee_update':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20"><Activity className="h-3 w-3 mr-1" /> OEE Update</Badge>;
      case 'machine_status_change':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20"><Cpu className="h-3 w-3 mr-1" /> Machine Status</Badge>;
      case 'maintenance_alert':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Wrench className="h-3 w-3 mr-1" /> Maintenance</Badge>;
      case 'realtime_alert':
        return <Badge className="bg-pink-500/10 text-pink-500 border-pink-500/20"><Bell className="h-3 w-3 mr-1" /> Realtime Alert</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get event summary
  const getEventSummary = (event: any) => {
    const data = event.data;
    switch (event.type) {
      case 'spc_analysis_complete':
        return `${data?.productCode || ''} - ${data?.stationName || ''} | CPK: ${data?.cpk?.toFixed(3) || 'N/A'}`;
      case 'cpk_alert':
        return `${data?.productCode || ''} - ${data?.stationName || ''} | CPK: ${data?.cpk?.toFixed(3) || 'N/A'} (${data?.severity || ''})`;
      case 'plan_status_change':
        return `${data?.planName || ''}: ${data?.oldStatus || ''} → ${data?.newStatus || ''}`;
      case 'oee_update':
        return `${data?.machineName || ''} | OEE: ${(data?.oee * 100)?.toFixed(1) || 'N/A'}%`;
      case 'machine_status_change':
        return `${data?.machineName || ''}: ${data?.oldStatus || ''} → ${data?.newStatus || ''}`;
      case 'maintenance_alert':
        return `${data?.machineName || ''} | ${data?.alertType || ''}: ${data?.message || ''}`;
      case 'realtime_alert':
        return `${data?.machineName || ''} | ${data?.alertType || ''}: ${data?.message || ''}`;
      default:
        return JSON.stringify(data).substring(0, 100);
    }
  };

  // Count events by type
  const eventCounts = {
    total: events?.length || 0,
    spc_analysis_complete: events?.filter(e => e.type === 'spc_analysis_complete').length || 0,
    cpk_alert: events?.filter(e => e.type === 'cpk_alert').length || 0,
    plan_status_change: events?.filter(e => e.type === 'plan_status_change').length || 0,
    machine_status_change: events?.filter(e => e.type === 'machine_status_change').length || 0,
    realtime_alert: events?.filter(e => e.type === 'realtime_alert').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Hệ thống", href: "/settings" },
            { label: "SSE Event Log" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SSE Event Log</h1>
            <p className="text-muted-foreground">
              Xem lịch sử các sự kiện SSE (thông báo realtime)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={sseStatus?.enabled ? "default" : "secondary"}>
              {sseStatus?.enabled ? "SSE Server Bật" : "SSE Server Tắt"}
            </Badge>
            <Badge variant="outline">
              {sseStatus?.clientCount || 0} clients
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Tổng events</div>
              <div className="text-2xl font-bold">{eventCounts.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-green-600">SPC Complete</div>
              <div className="text-2xl font-bold text-green-600">{eventCounts.spc_analysis_complete}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-red-600">CPK Alerts</div>
              <div className="text-2xl font-bold text-red-600">{eventCounts.cpk_alert}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-blue-600">Plan Status</div>
              <div className="text-2xl font-bold text-blue-600">{eventCounts.plan_status_change}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-orange-600">Machine Status</div>
              <div className="text-2xl font-bold text-orange-600">{eventCounts.machine_status_change}</div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/5 border-pink-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-pink-600">Realtime Alerts</div>
              <div className="text-2xl font-bold text-pink-600">{eventCounts.realtime_alert}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Event Log</CardTitle>
                <CardDescription>
                  Hiển thị {filteredEvents.length} / {events?.length || 0} events
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-48"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Loại event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="spc_analysis_complete">SPC Complete</SelectItem>
                    <SelectItem value="cpk_alert">CPK Alert</SelectItem>
                    <SelectItem value="plan_status_change">Plan Status</SelectItem>
                    <SelectItem value="oee_update">OEE Update</SelectItem>
                    <SelectItem value="machine_status_change">Machine Status</SelectItem>
                    <SelectItem value="maintenance_alert">Maintenance</SelectItem>
                    <SelectItem value="realtime_alert">Realtime Alert</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => clearLogMutation.mutate()}
                  disabled={clearLogMutation.isPending}
                >
                  {clearLogMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Không có events nào
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Thời gian</TableHead>
                      <TableHead className="w-40">Loại</TableHead>
                      <TableHead className="w-24">Clients</TableHead>
                      <TableHead>Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm">
                          {new Date(event.timestamp).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>{getEventBadge(event.type)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.clientCount}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getEventSummary(event)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
