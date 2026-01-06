/**
 * Scheduled OEE Reports Management
 * Quản lý báo cáo OEE định kỳ qua Telegram/Slack
 */

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Send,
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  MessageCircle,
  Hash,
  CheckCircle,
  XCircle,
  History,
  Settings,
  Factory,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

interface ReportFormData {
  name: string;
  description: string;
  productionLineIds: number[];
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  notificationChannel: 'telegram' | 'slack' | 'both';
  telegramConfigId?: number;
  slackWebhookUrl: string;
  includeAvailability: boolean;
  includePerformance: boolean;
  includeQuality: boolean;
  includeComparison: boolean;
  includeTrend: boolean;
  isActive: boolean;
}

const defaultFormData: ReportFormData = {
  name: '',
  description: '',
  productionLineIds: [],
  frequency: 'weekly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  hour: 8,
  minute: 0,
  notificationChannel: 'telegram',
  telegramConfigId: undefined,
  slackWebhookUrl: '',
  includeAvailability: true,
  includePerformance: true,
  includeQuality: true,
  includeComparison: true,
  includeTrend: true,
  isActive: true,
};

export default function ScheduledOeeReports() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(defaultFormData);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  // Fetch reports
  const { data: reports, isLoading, refetch } = trpc.scheduledOeeReport.list.useQuery();

  // Fetch production lines
  const { data: productionLines } = trpc.oee.getProductionLines.useQuery();

  // Fetch telegram configs
  const { data: telegramConfigs } = trpc.telegram.listConfigs.useQuery();

  // Fetch history
  const { data: history, refetch: refetchHistory } = trpc.scheduledOeeReport.history.useQuery({
    reportId: selectedHistoryId || undefined,
    limit: 100,
  });

  // Mutations
  const createMutation = trpc.scheduledOeeReport.create.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo báo cáo định kỳ');
      setShowDialog(false);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const updateMutation = trpc.scheduledOeeReport.update.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật báo cáo');
      setShowDialog(false);
      setEditingId(null);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const deleteMutation = trpc.scheduledOeeReport.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa báo cáo');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const toggleMutation = trpc.scheduledOeeReport.toggleActive.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const sendNowMutation = trpc.scheduledOeeReport.sendNow.useMutation({
    onSuccess: () => {
      toast.success('Đã gửi báo cáo');
      refetch();
      refetchHistory();
    },
    onError: (error) => {
      toast.error('Lỗi gửi báo cáo: ' + error.message);
    },
  });

  // Handle edit
  const handleEdit = (report: any) => {
    setEditingId(report.id);
    setFormData({
      name: report.name,
      description: report.description || '',
      productionLineIds: report.productionLineIds || [],
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      hour: report.hour,
      minute: report.minute,
      notificationChannel: report.notificationChannel,
      telegramConfigId: report.telegramConfigId,
      slackWebhookUrl: report.slackWebhookUrl || '',
      includeAvailability: report.includeAvailability,
      includePerformance: report.includePerformance,
      includeQuality: report.includeQuality,
      includeComparison: report.includeComparison,
      includeTrend: report.includeTrend,
      isActive: report.isActive,
    });
    setShowDialog(true);
  };

  // Handle save
  const handleSave = () => {
    if (!formData.name) {
      toast.error('Vui lòng nhập tên báo cáo');
      return;
    }
    if (formData.productionLineIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một dây chuyền');
      return;
    }
    if (formData.notificationChannel === 'telegram' || formData.notificationChannel === 'both') {
      if (!formData.telegramConfigId) {
        toast.error('Vui lòng chọn cấu hình Telegram');
        return;
      }
    }
    if (formData.notificationChannel === 'slack' || formData.notificationChannel === 'both') {
      if (!formData.slackWebhookUrl) {
        toast.error('Vui lòng nhập Slack Webhook URL');
        return;
      }
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm('Bạn có chắc muốn xóa báo cáo này?')) {
      deleteMutation.mutate({ id });
    }
  };

  // Get frequency label
  const getFrequencyLabel = (frequency: string, dayOfWeek?: number, dayOfMonth?: number) => {
    switch (frequency) {
      case 'daily':
        return 'Hàng ngày';
      case 'weekly':
        const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
        return `Hàng tuần (${day?.label || 'Thứ 2'})`;
      case 'monthly':
        return `Hàng tháng (ngày ${dayOfMonth || 1})`;
      default:
        return frequency;
    }
  };

  // Get channel badge
  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'telegram':
        return <Badge className="bg-blue-500"><Send className="h-3 w-3 mr-1" />Telegram</Badge>;
      case 'slack':
        return <Badge className="bg-purple-500"><Hash className="h-3 w-3 mr-1" />Slack</Badge>;
      case 'both':
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500"><Send className="h-3 w-3" /></Badge>
            <Badge className="bg-purple-500"><Hash className="h-3 w-3" /></Badge>
          </div>
        );
      default:
        return <Badge variant="outline">{channel}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo OEE định kỳ</h1>
            <p className="text-muted-foreground">
              Cấu hình gửi báo cáo OEE tự động qua Telegram/Slack
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={() => {
              setEditingId(null);
              setFormData(defaultFormData);
              setShowDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo báo cáo
            </Button>
          </div>
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">
              <Calendar className="h-4 w-4 mr-2" />
              Báo cáo định kỳ
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Lịch sử gửi
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách báo cáo</CardTitle>
                <CardDescription>
                  Quản lý các báo cáo OEE được gửi định kỳ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : reports && reports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên báo cáo</TableHead>
                        <TableHead>Tần suất</TableHead>
                        <TableHead>Giờ gửi</TableHead>
                        <TableHead>Kênh</TableHead>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Lần gửi tiếp</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report: any) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{report.name}</div>
                              {report.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {report.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getFrequencyLabel(report.frequency, report.dayOfWeek, report.dayOfMonth)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {String(report.hour).padStart(2, '0')}:{String(report.minute).padStart(2, '0')}
                            </div>
                          </TableCell>
                          <TableCell>{getChannelBadge(report.notificationChannel)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {report.productionLineIds?.length || 0} dây chuyền
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={report.isActive}
                              onCheckedChange={(checked) => toggleMutation.mutate({ id: report.id, isActive: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            {report.nextScheduledAt ? (
                              <span className="text-sm">
                                {new Date(report.nextScheduledAt).toLocaleString('vi-VN')}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => sendNowMutation.mutate({ id: report.id })}
                                disabled={sendNowMutation.isPending}
                                title="Gửi ngay"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(report)}
                                title="Chỉnh sửa"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(report.id)}
                                className="text-red-500 hover:text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-4 opacity-50" />
                    <p>Chưa có báo cáo định kỳ nào</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setEditingId(null);
                        setFormData(defaultFormData);
                        setShowDialog(true);
                      }}
                    >
                      Tạo báo cáo đầu tiên
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lịch sử gửi báo cáo</CardTitle>
                    <CardDescription>
                      Theo dõi các báo cáo đã được gửi
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedHistoryId?.toString() || 'all'}
                    onValueChange={(v) => setSelectedHistoryId(v === 'all' ? null : Number(v))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Lọc theo báo cáo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả báo cáo</SelectItem>
                      {reports?.map((r: any) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Báo cáo</TableHead>
                        <TableHead>Kênh</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {new Date(item.sentAt).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell>{item.reportName}</TableCell>
                          <TableCell>
                            {item.channel === 'telegram' ? (
                              <Badge className="bg-blue-500"><Send className="h-3 w-3 mr-1" />Telegram</Badge>
                            ) : (
                              <Badge className="bg-purple-500"><Hash className="h-3 w-3 mr-1" />Slack</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.status === 'sent' ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Đã gửi
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Thất bại
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.errorMessage && (
                              <span className="text-sm text-red-500 truncate max-w-[200px] block">
                                {item.errorMessage}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mb-4 opacity-50" />
                    <p>Chưa có lịch sử gửi báo cáo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Chỉnh sửa báo cáo' : 'Tạo báo cáo mới'}
              </DialogTitle>
              <DialogDescription>
                Cấu hình báo cáo OEE định kỳ gửi qua Telegram/Slack
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên báo cáo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Báo cáo OEE hàng tuần"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả ngắn về báo cáo"
                    rows={2}
                  />
                </div>
              </div>

              {/* Production Lines */}
              <div>
                <Label>Dây chuyền sản xuất *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-[150px] overflow-y-auto border rounded-lg p-3">
                  {productionLines?.map((line: any) => (
                    <div key={line.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`line-${line.id}`}
                        checked={formData.productionLineIds.includes(line.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              productionLineIds: [...formData.productionLineIds, line.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              productionLineIds: formData.productionLineIds.filter(id => id !== line.id),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`line-${line.id}`} className="cursor-pointer">
                        {line.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tần suất</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v as any })}
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

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label>Ngày trong tuần</Label>
                    <Select
                      value={formData.dayOfWeek.toString()}
                      onValueChange={(v) => setFormData({ ...formData, dayOfWeek: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <Label>Ngày trong tháng</Label>
                    <Select
                      value={formData.dayOfMonth.toString()}
                      onValueChange={(v) => setFormData({ ...formData, dayOfMonth: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Ngày {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Giờ gửi</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.hour.toString()}
                      onValueChange={(v) => setFormData({ ...formData, hour: Number(v) })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i).map(h => (
                          <SelectItem key={h} value={h.toString()}>
                            {String(h).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="self-center">:</span>
                    <Select
                      value={formData.minute.toString()}
                      onValueChange={(v) => setFormData({ ...formData, minute: Number(v) })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map(m => (
                          <SelectItem key={m} value={m.toString()}>
                            {String(m).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notification Channel */}
              <div className="space-y-4">
                <div>
                  <Label>Kênh thông báo</Label>
                  <Select
                    value={formData.notificationChannel}
                    onValueChange={(v) => setFormData({ ...formData, notificationChannel: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="both">Cả hai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.notificationChannel === 'telegram' || formData.notificationChannel === 'both') && (
                  <div>
                    <Label>Cấu hình Telegram</Label>
                    <Select
                      value={formData.telegramConfigId?.toString() || ''}
                      onValueChange={(v) => setFormData({ ...formData, telegramConfigId: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cấu hình Telegram" />
                      </SelectTrigger>
                      <SelectContent>
                        {telegramConfigs?.map((config: any) => (
                          <SelectItem key={config.id} value={config.id.toString()}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.notificationChannel === 'slack' || formData.notificationChannel === 'both') && (
                  <div>
                    <Label>Slack Webhook URL</Label>
                    <Input
                      value={formData.slackWebhookUrl}
                      onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                )}
              </div>

              {/* Report Content */}
              <div>
                <Label>Nội dung báo cáo</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeAvailability"
                      checked={formData.includeAvailability}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeAvailability: !!checked })}
                    />
                    <Label htmlFor="includeAvailability">Availability</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includePerformance"
                      checked={formData.includePerformance}
                      onCheckedChange={(checked) => setFormData({ ...formData, includePerformance: !!checked })}
                    />
                    <Label htmlFor="includePerformance">Performance</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeQuality"
                      checked={formData.includeQuality}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeQuality: !!checked })}
                    />
                    <Label htmlFor="includeQuality">Quality</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeComparison"
                      checked={formData.includeComparison}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeComparison: !!checked })}
                    />
                    <Label htmlFor="includeComparison">So sánh</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeTrend"
                      checked={formData.includeTrend}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeTrend: !!checked })}
                    />
                    <Label htmlFor="includeTrend">Xu hướng</Label>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Kích hoạt báo cáo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Cập nhật' : 'Tạo báo cáo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
