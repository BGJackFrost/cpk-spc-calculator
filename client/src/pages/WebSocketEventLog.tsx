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
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  MessageSquare, 
  Shield, 
  RefreshCw, 
  Trash2,
  Search,
  Loader2
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export default function WebSocketEventLog() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: events, isLoading, refetch } = trpc.system.getWebSocketEventLog.useQuery(
    { limit },
    { refetchInterval: 5000 } // Auto refresh every 5 seconds
  );

  const { data: wsStatus } = trpc.system.getWebSocketStatus.useQuery();

  const clearLogMutation = trpc.system.clearWebSocketEventLog.useMutation({
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
      event.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.clientId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  // Get event type badge
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'connect':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Wifi className="h-3 w-3 mr-1" /> Connect</Badge>;
      case 'disconnect':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><WifiOff className="h-3 w-3 mr-1" /> Disconnect</Badge>;
      case 'error':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Error</Badge>;
      case 'message':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><MessageSquare className="h-3 w-3 mr-1" /> Message</Badge>;
      case 'rate_limit':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Shield className="h-3 w-3 mr-1" /> Rate Limit</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Count events by type
  const eventCounts = {
    total: events?.length || 0,
    connect: events?.filter(e => e.type === 'connect').length || 0,
    disconnect: events?.filter(e => e.type === 'disconnect').length || 0,
    error: events?.filter(e => e.type === 'error').length || 0,
    rate_limit: events?.filter(e => e.type === 'rate_limit').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Hệ thống", href: "/settings" },
            { label: "WebSocket Event Log" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">WebSocket Event Log</h1>
            <p className="text-muted-foreground">
              Xem lịch sử các sự kiện WebSocket (connect/disconnect/errors)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={wsStatus?.enabled ? "default" : "secondary"}>
              {wsStatus?.enabled ? "WebSocket Bật" : "WebSocket Tắt"}
            </Badge>
            <Badge variant="outline">
              {wsStatus?.clientCount || 0} clients
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Tổng events</div>
              <div className="text-2xl font-bold">{eventCounts.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-green-600">Connects</div>
              <div className="text-2xl font-bold text-green-600">{eventCounts.connect}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-red-600">Disconnects</div>
              <div className="text-2xl font-bold text-red-600">{eventCounts.disconnect}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-orange-600">Errors</div>
              <div className="text-2xl font-bold text-orange-600">{eventCounts.error}</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="text-sm text-yellow-600">Rate Limits</div>
              <div className="text-2xl font-bold text-yellow-600">{eventCounts.rate_limit}</div>
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
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Loại event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="connect">Connect</SelectItem>
                    <SelectItem value="disconnect">Disconnect</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="rate_limit">Rate Limit</SelectItem>
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
                    <SelectItem value="1000">1000</SelectItem>
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
                      <TableHead className="w-32">Loại</TableHead>
                      <TableHead className="w-48">Client ID</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {new Date(event.timestamp).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>{getEventBadge(event.type)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {event.clientId || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.message || '—'}
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
