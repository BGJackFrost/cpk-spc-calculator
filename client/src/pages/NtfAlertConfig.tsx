import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, Settings, History, Calendar, Plus, Trash2, Play, Mail, Clock, AlertTriangle, CheckCircle, TrendingUp, Download } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function NtfAlertConfig() {
  const [activeTab, setActiveTab] = useState("config");
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    reportType: "daily" as "daily" | "weekly" | "monthly",
    sendHour: 8,
    sendDay: 1,
    recipients: "",
    enabled: true,
  });

  // Queries
  const { data: config, refetch: refetchConfig } = trpc.ntfConfig.getConfig.useQuery();
  const { data: alertHistory, refetch: refetchHistory } = trpc.ntfConfig.getAlertHistory.useQuery({ limit: 50 });
  const { data: reportSchedules, refetch: refetchSchedules } = trpc.ntfConfig.listReportSchedules.useQuery();
  const [trendDays, setTrendDays] = useState(30);
  const [trendGroupBy, setTrendGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const { data: trendData } = trpc.ntfConfig.getTrendData.useQuery({ days: trendDays, groupBy: trendGroupBy });

  // Mutations
  const updateConfig = trpc.ntfConfig.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      refetchConfig();
    },
    onError: (err) => toast.error(err.message),
  });

  const triggerCheck = trpc.ntfConfig.triggerCheck.useMutation({
    onSuccess: (result) => {
      if (result.alertSent) {
        toast.success(`Đã kiểm tra và gửi cảnh báo. NTF rate: ${result.ntfRate.toFixed(1)}%`);
      } else {
        toast.info(result.message);
      }
      refetchHistory();
    },
    onError: (err) => toast.error(err.message),
  });

  const createSchedule = trpc.ntfConfig.createReportSchedule.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo lịch báo cáo");
      setShowAddSchedule(false);
      setNewSchedule({ name: "", reportType: "daily", sendHour: 8, sendDay: 1, recipients: "", enabled: true });
      refetchSchedules();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSchedule = trpc.ntfConfig.updateReportSchedule.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật lịch báo cáo");
      refetchSchedules();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSchedule = trpc.ntfConfig.deleteReportSchedule.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa lịch báo cáo");
      refetchSchedules();
    },
    onError: (err) => toast.error(err.message),
  });

  const exportHistory = trpc.ntfConfig.exportAlertHistory.useMutation({
    onSuccess: (result) => {
      // Download file
      const link = document.createElement('a');
      link.href = `data:${result.mimeType};base64,${result.data}`;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Đã xuất file ${result.filename}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveConfig = () => {
    if (!config) return;
    updateConfig.mutate({
      warningThreshold: Number(config.warningThreshold),
      criticalThreshold: Number(config.criticalThreshold),
      alertEmails: config.alertEmails || [],
      enabled: config.enabled,
      checkIntervalMinutes: config.checkIntervalMinutes,
      cooldownMinutes: config.cooldownMinutes,
    });
  };

  const handleAddEmail = (email: string) => {
    if (!config || !email || !email.includes("@")) return;
    const emails = [...(config.alertEmails || []), email];
    updateConfig.mutate({ alertEmails: emails });
  };

  const handleRemoveEmail = (email: string) => {
    if (!config) return;
    const emails = (config.alertEmails || []).filter((e: string) => e !== email);
    updateConfig.mutate({ alertEmails: emails });
  };

  const handleCreateSchedule = () => {
    const recipients = newSchedule.recipients.split(",").map(e => e.trim()).filter(e => e.includes("@"));
    if (recipients.length === 0) {
      toast.error("Vui lòng nhập ít nhất một email hợp lệ");
      return;
    }
    createSchedule.mutate({
      name: newSchedule.name,
      reportType: newSchedule.reportType,
      sendHour: newSchedule.sendHour,
      sendDay: newSchedule.reportType !== "daily" ? newSchedule.sendDay : undefined,
      recipients,
      enabled: newSchedule.enabled,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Cảnh báo NTF</h1>
            <p className="text-muted-foreground">Quản lý ngưỡng cảnh báo và lịch gửi báo cáo NTF</p>
          </div>
          <Button onClick={() => triggerCheck.mutate()} disabled={triggerCheck.isPending}>
            <Play className="w-4 h-4 mr-2" />
            Kiểm tra ngay
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="schedules">
              <Calendar className="w-4 h-4 mr-2" />
              Lịch báo cáo
            </TabsTrigger>
            <TabsTrigger value="trend">
              <TrendingUp className="w-4 h-4 mr-2" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Lịch sử cảnh báo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Ngưỡng cảnh báo
                  </CardTitle>
                  <CardDescription>Thiết lập ngưỡng NTF rate để kích hoạt cảnh báo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Bật cảnh báo tự động</Label>
                    <Switch
                      checked={config?.enabled ?? true}
                      onCheckedChange={(checked) => updateConfig.mutate({ enabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ngưỡng cảnh báo (Warning) - %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={config?.warningThreshold ?? 20}
                      onChange={(e) => {
                        if (config) {
                          (config as any).warningThreshold = Number(e.target.value);
                        }
                      }}
                      onBlur={handleSaveConfig}
                    />
                    <p className="text-xs text-muted-foreground">Gửi cảnh báo khi NTF rate vượt ngưỡng này</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ngưỡng nghiêm trọng (Critical) - %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={config?.criticalThreshold ?? 30}
                      onChange={(e) => {
                        if (config) {
                          (config as any).criticalThreshold = Number(e.target.value);
                        }
                      }}
                      onBlur={handleSaveConfig}
                    />
                    <p className="text-xs text-muted-foreground">Gửi cảnh báo nghiêm trọng khi vượt ngưỡng này</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tần suất kiểm tra (phút)</Label>
                    <Input
                      type="number"
                      min={15}
                      max={1440}
                      value={config?.checkIntervalMinutes ?? 60}
                      onChange={(e) => {
                        if (config) {
                          (config as any).checkIntervalMinutes = Number(e.target.value);
                        }
                      }}
                      onBlur={handleSaveConfig}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cooldown giữa các cảnh báo (phút)</Label>
                    <Input
                      type="number"
                      min={30}
                      max={1440}
                      value={config?.cooldownMinutes ?? 120}
                      onChange={(e) => {
                        if (config) {
                          (config as any).cooldownMinutes = Number(e.target.value);
                        }
                      }}
                      onBlur={handleSaveConfig}
                    />
                    <p className="text-xs text-muted-foreground">Thời gian chờ trước khi gửi cảnh báo tiếp theo</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email nhận cảnh báo
                  </CardTitle>
                  <CardDescription>Danh sách email nhận thông báo khi có cảnh báo NTF</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Nhập email..."
                      id="new-email"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddEmail((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.getElementById("new-email") as HTMLInputElement;
                        handleAddEmail(input.value);
                        input.value = "";
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(config?.alertEmails || []).map((email: string) => (
                      <div key={email} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{email}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveEmail(email)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {(config?.alertEmails || []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Chưa có email nào được thêm
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {config?.lastAlertAt && (
              <Card>
                <CardHeader>
                  <CardTitle>Cảnh báo gần nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Thời gian</p>
                      <p className="font-medium">{new Date(config.lastAlertAt).toLocaleString("vi-VN")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">NTF Rate</p>
                      <p className="font-medium text-lg">{Number(config.lastAlertNtfRate).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Lịch gửi báo cáo định kỳ</h3>
              <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm lịch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo lịch báo cáo mới</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tên lịch</Label>
                      <Input
                        value={newSchedule.name}
                        onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                        placeholder="VD: Báo cáo NTF hàng ngày"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại báo cáo</Label>
                      <Select
                        value={newSchedule.reportType}
                        onValueChange={(v) => setNewSchedule({ ...newSchedule, reportType: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Giờ gửi (0-23)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={newSchedule.sendHour}
                        onChange={(e) => setNewSchedule({ ...newSchedule, sendHour: Number(e.target.value) })}
                      />
                    </div>
                    {newSchedule.reportType === "weekly" && (
                      <div className="space-y-2">
                        <Label>Ngày trong tuần (0=CN, 1=T2, ...)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={6}
                          value={newSchedule.sendDay}
                          onChange={(e) => setNewSchedule({ ...newSchedule, sendDay: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    {newSchedule.reportType === "monthly" && (
                      <div className="space-y-2">
                        <Label>Ngày trong tháng (1-28)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={newSchedule.sendDay}
                          onChange={(e) => setNewSchedule({ ...newSchedule, sendDay: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Email nhận (phân cách bằng dấu phẩy)</Label>
                      <Input
                        value={newSchedule.recipients}
                        onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Kích hoạt</Label>
                      <Switch
                        checked={newSchedule.enabled}
                        onCheckedChange={(checked) => setNewSchedule({ ...newSchedule, enabled: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddSchedule(false)}>Hủy</Button>
                    <Button onClick={handleCreateSchedule} disabled={!newSchedule.name || !newSchedule.recipients}>
                      Tạo lịch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Thời gian gửi</TableHead>
                    <TableHead>Email nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Lần gửi cuối</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportSchedules || []).map((schedule: any) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schedule.reportType === "daily" ? "Hàng ngày" : schedule.reportType === "weekly" ? "Hàng tuần" : "Hàng tháng"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {schedule.sendHour}:00
                          {schedule.reportType === "weekly" && ` (${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][schedule.sendDay || 0]})`}
                          {schedule.reportType === "monthly" && ` (ngày ${schedule.sendDay})`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(schedule.recipients || []).slice(0, 2).map((email: string) => (
                            <Badge key={email} variant="secondary" className="text-xs">{email}</Badge>
                          ))}
                          {(schedule.recipients || []).length > 2 && (
                            <Badge variant="secondary" className="text-xs">+{schedule.recipients.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) => updateSchedule.mutate({ id: schedule.id, enabled: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        {schedule.lastSentAt ? (
                          <div className="flex items-center gap-1">
                            {schedule.lastSentStatus === "success" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm">{new Date(schedule.lastSentAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Xóa lịch báo cáo này?")) {
                              deleteSchedule.mutate({ id: schedule.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(reportSchedules || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Chưa có lịch báo cáo nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Xu hướng NTF Rate
                    </CardTitle>
                    <CardDescription>Biểu đồ NTF rate theo thời gian</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={String(trendDays)} onValueChange={(v) => setTrendDays(Number(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 ngày</SelectItem>
                        <SelectItem value="14">14 ngày</SelectItem>
                        <SelectItem value="30">30 ngày</SelectItem>
                        <SelectItem value="90">90 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={trendGroupBy} onValueChange={(v) => setTrendGroupBy(v as any)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Theo ngày</SelectItem>
                        <SelectItem value="week">Theo tuần</SelectItem>
                        <SelectItem value="month">Theo tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {trendData && trendData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ntfGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="periodStart" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          className="text-xs"
                        />
                        <YAxis 
                          domain={[0, 'auto']}
                          tickFormatter={(value) => `${value.toFixed(0)}%`}
                          className="text-xs"
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'NTF Rate']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <ReferenceLine y={config?.warningThreshold || 20} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Warning', position: 'right', fill: '#f59e0b', fontSize: 12 }} />
                        <ReferenceLine y={config?.criticalThreshold || 30} stroke="#dc2626" strokeDasharray="5 5" label={{ value: 'Critical', position: 'right', fill: '#dc2626', fontSize: 12 }} />
                        <Area 
                          type="monotone" 
                          dataKey="ntfRate" 
                          stroke="#f59e0b" 
                          fillOpacity={1} 
                          fill="url(#ntfGradient)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Chưa có dữ liệu để hiển thị
                  </div>
                )}
              </CardContent>
            </Card>

            {trendData && trendData.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">NTF Rate trung bình</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(trendData.reduce((sum, d) => sum + d.ntfRate, 0) / trendData.length).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tổng số lỗi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {trendData.reduce((sum, d) => sum + d.total, 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      NTF: {trendData.reduce((sum, d) => sum + d.ntfCount, 0).toLocaleString()} | 
                      Real NG: {trendData.reduce((sum, d) => sum + d.realNgCount, 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ngày NTF cao nhất</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const maxDay = trendData.reduce((max, d) => d.ntfRate > max.ntfRate ? d : max, trendData[0]);
                      return (
                        <>
                          <div className="text-2xl font-bold text-red-500">{maxDay.ntfRate.toFixed(1)}%</div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(maxDay.periodStart).toLocaleDateString('vi-VN')}
                          </p>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lịch sử cảnh báo NTF</CardTitle>
                    <CardDescription>Các cảnh báo đã được gửi trong quá khứ</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportHistory.mutate({ format: 'excel', days: 90 })}
                      disabled={exportHistory.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportHistory.mutate({ format: 'pdf', days: 90 })}
                      disabled={exportHistory.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>NTF Rate</TableHead>
                    <TableHead>Thống kê</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Khoảng thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(alertHistory || []).map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell>{new Date(alert.createdAt).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>
                        <Badge variant={alert.alertType === "critical" ? "destructive" : "default"}>
                          {alert.alertType === "critical" ? "Nghiêm trọng" : "Cảnh báo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${alert.alertType === "critical" ? "text-red-500" : "text-yellow-500"}`}>
                          {Number(alert.ntfRate).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Tổng: {alert.totalDefects}</div>
                          <div>NTF: {alert.ntfCount} | Real NG: {alert.realNgCount}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.emailSent ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{(alert.emailRecipients || []).length} email</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(alert.periodStart).toLocaleDateString("vi-VN")} - {new Date(alert.periodEnd).toLocaleDateString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(alertHistory || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Chưa có cảnh báo nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
