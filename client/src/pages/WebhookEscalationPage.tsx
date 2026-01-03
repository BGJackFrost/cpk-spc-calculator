import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Bell,
  Clock,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Mail,
  Webhook,
} from 'lucide-react';

interface EscalationTarget {
  type: 'webhook' | 'email';
  value: string;
}

interface EscalationRule {
  id: number;
  name: string;
  description?: string;
  source_webhook_id: number;
  trigger_after_failures: number;
  trigger_after_minutes: number;
  level1_targets: EscalationTarget[];
  level1_delay_minutes: number;
  level2_targets: EscalationTarget[];
  level2_delay_minutes: number;
  level3_targets: EscalationTarget[];
  level3_delay_minutes: number;
  auto_resolve_on_success: boolean;
  notify_on_escalate: boolean;
  notify_on_resolve: boolean;
  is_active: boolean;
  created_at: string;
}

export default function WebhookEscalationPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceWebhookId: 0,
    triggerAfterFailures: 3,
    triggerAfterMinutes: 15,
    level1Targets: [] as EscalationTarget[],
    level1DelayMinutes: 0,
    level2Targets: [] as EscalationTarget[],
    level2DelayMinutes: 15,
    level3Targets: [] as EscalationTarget[],
    level3DelayMinutes: 30,
    autoResolveOnSuccess: true,
    notifyOnEscalate: true,
    notifyOnResolve: true,
    isActive: true,
  });
  const [newTarget, setNewTarget] = useState({ type: 'email' as 'email' | 'webhook', value: '', level: 1 });

  const { data: rules, refetch: refetchRules } = trpc.webhookEscalation.list.useQuery();
  const { data: webhooks } = trpc.alertWebhook.list.useQuery();
  const { data: logs } = trpc.webhookEscalation.getLogs.useQuery({ limit: 50 });
  const { data: pending, refetch: refetchPending } = trpc.webhookEscalation.getPending.useQuery();

  const createMutation = trpc.webhookEscalation.create.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo quy tắc escalation');
      setIsCreateDialogOpen(false);
      resetForm();
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.webhookEscalation.update.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật quy tắc');
      setEditingRule(null);
      resetForm();
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.webhookEscalation.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa quy tắc');
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const resolveMutation = trpc.webhookEscalation.resolve.useMutation({
    onSuccess: () => {
      toast.success('Đã giải quyết escalation');
      refetchPending();
    },
    onError: (error) => toast.error(error.message),
  });

  const acknowledgeMutation = trpc.webhookEscalation.acknowledge.useMutation({
    onSuccess: () => {
      toast.success('Đã xác nhận escalation');
      refetchPending();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sourceWebhookId: 0,
      triggerAfterFailures: 3,
      triggerAfterMinutes: 15,
      level1Targets: [],
      level1DelayMinutes: 0,
      level2Targets: [],
      level2DelayMinutes: 15,
      level3Targets: [],
      level3DelayMinutes: 30,
      autoResolveOnSuccess: true,
      notifyOnEscalate: true,
      notifyOnResolve: true,
      isActive: true,
    });
    setNewTarget({ type: 'email', value: '', level: 1 });
  };

  const handleEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      sourceWebhookId: rule.source_webhook_id,
      triggerAfterFailures: rule.trigger_after_failures,
      triggerAfterMinutes: rule.trigger_after_minutes,
      level1Targets: rule.level1_targets || [],
      level1DelayMinutes: rule.level1_delay_minutes,
      level2Targets: rule.level2_targets || [],
      level2DelayMinutes: rule.level2_delay_minutes,
      level3Targets: rule.level3_targets || [],
      level3DelayMinutes: rule.level3_delay_minutes,
      autoResolveOnSuccess: rule.auto_resolve_on_success,
      notifyOnEscalate: rule.notify_on_escalate,
      notifyOnResolve: rule.notify_on_resolve,
      isActive: rule.is_active,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên quy tắc');
      return;
    }
    if (!formData.sourceWebhookId) {
      toast.error('Vui lòng chọn webhook nguồn');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Xác nhận xóa quy tắc này?')) {
      deleteMutation.mutate({ id });
    }
  };

  const addTarget = (level: number) => {
    if (!newTarget.value.trim()) {
      toast.error('Vui lòng nhập giá trị');
      return;
    }
    const target: EscalationTarget = { type: newTarget.type, value: newTarget.value };
    const key = `level${level}Targets` as keyof typeof formData;
    const currentTargets = formData[key] as EscalationTarget[];
    setFormData({ ...formData, [key]: [...currentTargets, target] });
    setNewTarget({ ...newTarget, value: '' });
  };

  const removeTarget = (level: number, index: number) => {
    const key = `level${level}Targets` as keyof typeof formData;
    const currentTargets = formData[key] as EscalationTarget[];
    setFormData({ ...formData, [key]: currentTargets.filter((_, i) => i !== index) });
  };

  const getWebhookName = (id: number) => {
    const webhook = webhooks?.find((w: any) => w.id === id);
    return webhook?.name || `Webhook #${id}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Webhook Escalation</h1>
            <p className="text-muted-foreground">Cấu hình leo thang cảnh báo tự động khi webhook thất bại</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingRule(null); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Tạo quy tắc mới
          </Button>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Quy tắc Escalation</TabsTrigger>
            <TabsTrigger value="pending">
              Đang chờ xử lý
              {pending && pending.length > 0 && <Badge variant="destructive" className="ml-2">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="logs">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5" />Danh sách Quy tắc</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên quy tắc</TableHead>
                      <TableHead>Webhook nguồn</TableHead>
                      <TableHead>Điều kiện kích hoạt</TableHead>
                      <TableHead>Số cấp độ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.map((rule: EscalationRule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{getWebhookName(rule.source_webhook_id)}</Badge></TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{rule.trigger_after_failures} lần thất bại</p>
                            <p className="text-muted-foreground">hoặc {rule.trigger_after_minutes} phút</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rule.level1_targets?.length > 0 && <Badge variant="secondary">L1</Badge>}
                            {rule.level2_targets?.length > 0 && <Badge variant="secondary">L2</Badge>}
                            {rule.level3_targets?.length > 0 && <Badge variant="secondary">L3</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Hoạt động' : 'Tắt'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}><Edit className="w-3 h-3" /></Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!rules || rules.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Chưa có quy tắc escalation nào</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-orange-500" />Escalation đang chờ xử lý</CardTitle>
                <CardDescription>Các cảnh báo đã được leo thang và cần được xử lý</CardDescription>
              </CardHeader>
              <CardContent>
                {pending && pending.length > 0 ? (
                  <div className="space-y-4">
                    {pending.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">Level {item.current_level}</Badge>
                              <span className="font-medium">{item.target_type}: {item.target_value}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Escalated: {new Date(item.escalated_at).toLocaleString('vi-VN')}</p>
                            {item.error_message && <p className="text-sm text-red-500 mt-1">{item.error_message}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => acknowledgeMutation.mutate({ id: item.id })} disabled={item.status === 'acknowledged'}>
                              <CheckCircle className="w-3 h-3 mr-1" />Xác nhận
                            </Button>
                            <Button size="sm" onClick={() => resolveMutation.mutate({ id: item.id })}>
                              <XCircle className="w-3 h-3 mr-1" />Giải quyết
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                    <p>Không có escalation nào đang chờ xử lý</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Lịch sử Escalation</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.logs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{new Date(log.escalated_at).toLocaleString('vi-VN')}</TableCell>
                        <TableCell><Badge variant="outline">Level {log.current_level}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {log.target_type === 'email' ? <Mail className="w-3 h-3" /> : <Webhook className="w-3 h-3" />}
                            <span className="text-sm">{log.target_value}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'resolved' ? 'default' : log.status === 'acknowledged' ? 'secondary' : log.status === 'sent' ? 'outline' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.resolution_note || log.error_message || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs?.logs || logs.logs.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Chưa có lịch sử escalation</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Sửa quy tắc Escalation' : 'Tạo quy tắc Escalation mới'}</DialogTitle>
              <DialogDescription>Cấu hình leo thang cảnh báo khi webhook thất bại liên tục</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tên quy tắc *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Escalation cho Slack Alert" />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả quy tắc..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Webhook nguồn *</Label>
                  <Select value={String(formData.sourceWebhookId || '')} onValueChange={(v) => setFormData({ ...formData, sourceWebhookId: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="Chọn webhook" /></SelectTrigger>
                    <SelectContent>
                      {webhooks?.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name} ({w.webhook_type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Điều kiện kích hoạt</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sau số lần thất bại</Label>
                    <Input type="number" value={formData.triggerAfterFailures} onChange={(e) => setFormData({ ...formData, triggerAfterFailures: parseInt(e.target.value) })} min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hoặc sau (phút)</Label>
                    <Input type="number" value={formData.triggerAfterMinutes} onChange={(e) => setFormData({ ...formData, triggerAfterMinutes: parseInt(e.target.value) })} min={1} />
                  </div>
                </div>
              </div>

              {[1, 2, 3].map((level) => {
                const targetsKey = `level${level}Targets` as keyof typeof formData;
                const delayKey = `level${level}DelayMinutes` as keyof typeof formData;
                const targets = formData[targetsKey] as EscalationTarget[];
                const delay = formData[delayKey] as number;

                return (
                  <div key={level} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Level {level}</h4>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Delay (phút):</Label>
                        <Input type="number" value={delay} onChange={(e) => setFormData({ ...formData, [delayKey]: parseInt(e.target.value) })} className="w-20" min={0} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {targets.map((target, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                          {target.type === 'email' ? <Mail className="w-4 h-4" /> : <Webhook className="w-4 h-4" />}
                          <span className="flex-1 text-sm">{target.value}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeTarget(level, idx)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Select value={newTarget.level === level ? newTarget.type : 'email'} onValueChange={(v) => setNewTarget({ ...newTarget, type: v as 'email' | 'webhook', level })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder={newTarget.type === 'email' ? 'email@example.com' : 'https://...'} value={newTarget.level === level ? newTarget.value : ''} onChange={(e) => setNewTarget({ ...newTarget, value: e.target.value, level })} className="flex-1" />
                      <Button variant="outline" onClick={() => addTarget(level)}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Tùy chọn</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Tự động giải quyết khi thành công</Label><Switch checked={formData.autoResolveOnSuccess} onCheckedChange={(v) => setFormData({ ...formData, autoResolveOnSuccess: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Thông báo khi leo thang</Label><Switch checked={formData.notifyOnEscalate} onCheckedChange={(v) => setFormData({ ...formData, notifyOnEscalate: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Thông báo khi giải quyết</Label><Switch checked={formData.notifyOnResolve} onCheckedChange={(v) => setFormData({ ...formData, notifyOnResolve: v })} /></div>
                  <div className="flex items-center justify-between"><Label>Kích hoạt quy tắc</Label><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} /></div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingRule(null); resetForm(); }}>Hủy</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editingRule ? 'Cập nhật' : 'Tạo mới'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
