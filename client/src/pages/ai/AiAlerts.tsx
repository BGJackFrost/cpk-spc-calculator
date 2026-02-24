import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bell, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Eye, Check, X, Filter, BellOff, Volume2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AiAlerts() {
  const { toast } = useToast();
  
  // Load alert rules from API
  const { data: alertRules, isLoading, refetch } = trpc.ai.settings.getAlertRules.useQuery();
  const addRuleMutation = trpc.ai.settings.addAlertRule.useMutation({
    onSuccess: () => {
      toast({ title: "Đã thêm", description: "Quy tắc cảnh báo mới đã được thêm" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
  const deleteRuleMutation = trpc.ai.settings.deleteAlertRule.useMutation({
    onSuccess: () => {
      toast({ title: "Đã xóa", description: "Quy tắc cảnh báo đã được xóa" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const handleDeleteRule = (id: string) => {
    deleteRuleMutation.mutate({ id });
  };

// Mock alerts data (for display only, rules come from API)
// Mock data removed - mockAlertsData (data comes from tRPC or is not yet implemented)

  const handleMarkRead = (id: number) => {
    toast({ title: "Đã đánh dấu đã đọc", description: "Alert đã được đánh dấu đã đọc" });
  };

  const handleAcknowledge = (id: number) => {
    toast({ title: "Đã xác nhận", description: "Alert đã được xác nhận" });
  };

  const handleDismiss = (id: number) => {
    toast({ title: "Đã bỏ qua", description: "Alert đã được bỏ qua" });
  };

  const handleMarkAllRead = () => {
    toast({ title: "Đã đánh dấu tất cả", description: "Tất cả alerts đã được đánh dấu đã đọc" });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge className="bg-red-600"><XCircle className="w-3 h-3 mr-1" />Critical</Badge>;
      case "high": return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />High</Badge>;
      case "medium": return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Medium</Badge>;
      case "low": return <Badge className="bg-blue-500"><Bell className="w-3 h-3 mr-1" />Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      model: "Model",
      drift: "Data Drift",
      performance: "Performance",
      training: "Training",
      anomaly: "Anomaly",
      system: "System",
      ab_test: "A/B Test",
      quality: "Quality",
    };
    return <Badge variant="outline">{labels[category] || category}</Badge>;
  };

  const filteredAlerts = mockAlertsData.alerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && alert.category !== categoryFilter) return false;
    if (readFilter === "unread" && alert.read) return false;
    if (readFilter === "read" && !alert.read) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-red-500" />
              AI Alerts
            </h1>
            <p className="text-muted-foreground mt-1">Cảnh báo và thông báo từ hệ thống AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleMarkAllRead}>
              <Check className="w-4 h-4 mr-2" />Đánh dấu tất cả đã đọc
            </Button>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng</p>
              <p className="text-2xl font-bold">{mockAlertsData.summary.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-700">Chưa đọc</p>
              <p className="text-2xl font-bold text-blue-800">{mockAlertsData.summary.unread}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">Critical</p>
              <p className="text-2xl font-bold text-red-800">{mockAlertsData.summary.critical}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-sm text-orange-700">High</p>
              <p className="text-2xl font-bold text-orange-800">{mockAlertsData.summary.high}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="pt-4">
              <p className="text-sm text-yellow-700">Medium</p>
              <p className="text-2xl font-bold text-yellow-800">{mockAlertsData.summary.medium}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Low</p>
              <p className="text-2xl font-bold">{mockAlertsData.summary.low}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Mức độ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="drift">Data Drift</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="anomaly">Anomaly</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="unread">Chưa đọc</SelectItem>
                  <SelectItem value="read">Đã đọc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`${!alert.read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""} ${alert.severity === "critical" ? "border-l-red-500" : alert.severity === "high" ? "border-l-orange-500" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityBadge(alert.severity)}
                      {getCategoryBadge(alert.category)}
                      {!alert.read && <Badge variant="secondary" className="text-xs">Mới</Badge>}
                      {alert.acknowledged && <Badge variant="outline" className="text-xs text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Đã xác nhận</Badge>}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{alert.title}</h3>
                    <p className="text-muted-foreground mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {alert.timestamp}
                      </span>
                      <span>Nguồn: {alert.source}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {!alert.read && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkRead(alert.id)}>
                        <Eye className="w-4 h-4 mr-1" />Đã đọc
                      </Button>
                    )}
                    {!alert.acknowledged && (
                      <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
                        <Check className="w-4 h-4 mr-1" />Xác nhận
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleDismiss(alert.id)}>
                      <BellOff className="w-4 h-4 mr-1" />Bỏ qua
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
