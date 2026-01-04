import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Loader2, FileText, Star, Clock, Mail, Webhook, MessageSquare } from "lucide-react";

export default function EscalationTemplates() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "",
    level1TimeoutMinutes: 15, level1Emails: "", level1Webhooks: "", level1SmsEnabled: false, level1SmsPhones: "",
    level2TimeoutMinutes: 30, level2Emails: "", level2Webhooks: "", level2SmsEnabled: false, level2SmsPhones: "",
    level3TimeoutMinutes: 60, level3Emails: "", level3Webhooks: "", level3SmsEnabled: false, level3SmsPhones: "",
    alertTypes: "", productionLineIds: "", machineIds: "",
    isDefault: false, isActive: true,
  });

  const { data: templates, isLoading, refetch } = trpc.escalationTemplate.list.useQuery();
  const { data: webhooks } = trpc.escalationWebhook.list.useQuery({ activeOnly: true });

  const createMutation = trpc.escalationTemplate.create.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã tạo template mới" }); setIsCreateOpen(false); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const updateMutation = trpc.escalationTemplate.update.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã cập nhật template" }); setEditingId(null); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = trpc.escalationTemplate.delete.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã xóa template" }); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "",
      level1TimeoutMinutes: 15, level1Emails: "", level1Webhooks: "", level1SmsEnabled: false, level1SmsPhones: "",
      level2TimeoutMinutes: 30, level2Emails: "", level2Webhooks: "", level2SmsEnabled: false, level2SmsPhones: "",
      level3TimeoutMinutes: 60, level3Emails: "", level3Webhooks: "", level3SmsEnabled: false, level3SmsPhones: "",
      alertTypes: "", productionLineIds: "", machineIds: "",
      isDefault: false, isActive: true,
    });
  };

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      name: template.name, description: template.description || "",
      level1TimeoutMinutes: template.level1TimeoutMinutes, level1Emails: template.level1Emails?.join(", ") || "",
      level1Webhooks: template.level1Webhooks?.join(", ") || "", level1SmsEnabled: template.level1SmsEnabled,
      level1SmsPhones: template.level1SmsPhones?.join(", ") || "",
      level2TimeoutMinutes: template.level2TimeoutMinutes, level2Emails: template.level2Emails?.join(", ") || "",
      level2Webhooks: template.level2Webhooks?.join(", ") || "", level2SmsEnabled: template.level2SmsEnabled,
      level2SmsPhones: template.level2SmsPhones?.join(", ") || "",
      level3TimeoutMinutes: template.level3TimeoutMinutes, level3Emails: template.level3Emails?.join(", ") || "",
      level3Webhooks: template.level3Webhooks?.join(", ") || "", level3SmsEnabled: template.level3SmsEnabled,
      level3SmsPhones: template.level3SmsPhones?.join(", ") || "",
      alertTypes: template.alertTypes?.join(", ") || "",
      productionLineIds: template.productionLineIds?.join(", ") || "",
      machineIds: template.machineIds?.join(", ") || "",
      isDefault: template.isDefault, isActive: template.isActive,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    const parseEmails = (s: string) => s ? s.split(",").map(e => e.trim()).filter(Boolean) : undefined;
    const parseNumbers = (s: string) => s ? s.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : undefined;
    const data: any = {
      name: formData.name, description: formData.description || undefined,
      level1TimeoutMinutes: formData.level1TimeoutMinutes, level1Emails: parseEmails(formData.level1Emails),
      level1Webhooks: parseNumbers(formData.level1Webhooks), level1SmsEnabled: formData.level1SmsEnabled,
      level1SmsPhones: parseEmails(formData.level1SmsPhones),
      level2TimeoutMinutes: formData.level2TimeoutMinutes, level2Emails: parseEmails(formData.level2Emails),
      level2Webhooks: parseNumbers(formData.level2Webhooks), level2SmsEnabled: formData.level2SmsEnabled,
      level2SmsPhones: parseEmails(formData.level2SmsPhones),
      level3TimeoutMinutes: formData.level3TimeoutMinutes, level3Emails: parseEmails(formData.level3Emails),
      level3Webhooks: parseNumbers(formData.level3Webhooks), level3SmsEnabled: formData.level3SmsEnabled,
      level3SmsPhones: parseEmails(formData.level3SmsPhones),
      alertTypes: parseEmails(formData.alertTypes),
      productionLineIds: parseNumbers(formData.productionLineIds),
      machineIds: parseNumbers(formData.machineIds),
      isDefault: formData.isDefault, isActive: formData.isActive,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...data });
    else createMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalation Templates</h1>
            <p className="text-muted-foreground">Quản lý các mẫu cấu hình escalation để tái sử dụng</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setEditingId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Thêm Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Chỉnh sửa Template" : "Thêm Template mới"}</DialogTitle>
                <DialogDescription>Cấu hình mẫu escalation với 3 levels</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên template *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Critical Production Alert" />
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>

                <Tabs defaultValue="level1">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="level1">Level 1</TabsTrigger>
                    <TabsTrigger value="level2">Level 2</TabsTrigger>
                    <TabsTrigger value="level3">Level 3</TabsTrigger>
                  </TabsList>
                  {[1, 2, 3].map(level => (
                    <TabsContent key={level} value={`level${level}`} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label><Clock className="h-4 w-4 inline mr-1" /> Timeout (phút)</Label>
                          <Input type="number" value={(formData as any)[`level${level}TimeoutMinutes`]} onChange={(e) => setFormData({ ...formData, [`level${level}TimeoutMinutes`]: parseInt(e.target.value) || 15 })} />
                        </div>
                        <div className="space-y-2">
                          <Label><Mail className="h-4 w-4 inline mr-1" /> Emails (phân cách bởi dấu phẩy)</Label>
                          <Input value={(formData as any)[`level${level}Emails`]} onChange={(e) => setFormData({ ...formData, [`level${level}Emails`]: e.target.value })} placeholder="email1@test.com, email2@test.com" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label><Webhook className="h-4 w-4 inline mr-1" /> Webhook IDs</Label>
                          <Input value={(formData as any)[`level${level}Webhooks`]} onChange={(e) => setFormData({ ...formData, [`level${level}Webhooks`]: e.target.value })} placeholder="1, 2, 3" />
                          {webhooks && webhooks.length > 0 && (
                            <p className="text-xs text-muted-foreground">Có sẵn: {webhooks.map((w: any) => `${w.id}:${w.name}`).join(", ")}</p>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={(formData as any)[`level${level}SmsEnabled`]} onCheckedChange={(v) => setFormData({ ...formData, [`level${level}SmsEnabled`]: v })} />
                            <Label><MessageSquare className="h-4 w-4 inline mr-1" /> Bật SMS</Label>
                          </div>
                          {(formData as any)[`level${level}SmsEnabled`] && (
                            <Input value={(formData as any)[`level${level}SmsPhones`]} onChange={(e) => setFormData({ ...formData, [`level${level}SmsPhones`]: e.target.value })} placeholder="+84123456789" />
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Bộ lọc áp dụng (để trống = áp dụng cho tất cả)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Alert Types</Label>
                      <Input value={formData.alertTypes} onChange={(e) => setFormData({ ...formData, alertTypes: e.target.value })} placeholder="cpk_violation, ooc" />
                    </div>
                    <div className="space-y-2">
                      <Label>Production Line IDs</Label>
                      <Input value={formData.productionLineIds} onChange={(e) => setFormData({ ...formData, productionLineIds: e.target.value })} placeholder="1, 2, 3" />
                    </div>
                    <div className="space-y-2">
                      <Label>Machine IDs</Label>
                      <Input value={formData.machineIds} onChange={(e) => setFormData({ ...formData, machineIds: e.target.value })} placeholder="1, 2, 3" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={formData.isDefault} onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })} /><Label><Star className="h-4 w-4 inline mr-1" /> Template mặc định</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} /><Label>Kích hoạt</Label></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingId(null); resetForm(); }}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : templates && templates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Level 1</TableHead>
                    <TableHead>Level 2</TableHead>
                    <TableHead>Level 3</TableHead>
                    <TableHead>Bộ lọc</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.isDefault && <Star className="h-4 w-4 text-yellow-500" />}
                          <div>
                            <p className="font-medium">{template.name}</p>
                            {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{template.level1TimeoutMinutes}m</p>
                          <p className="text-xs text-muted-foreground">{template.level1Emails?.length || 0} emails</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{template.level2TimeoutMinutes}m</p>
                          <p className="text-xs text-muted-foreground">{template.level2Emails?.length || 0} emails</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{template.level3TimeoutMinutes}m</p>
                          <p className="text-xs text-muted-foreground">{template.level3Emails?.length || 0} emails</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.alertTypes?.length > 0 && <Badge variant="outline" className="text-xs">{template.alertTypes.length} types</Badge>}
                          {template.productionLineIds?.length > 0 && <Badge variant="outline" className="text-xs">{template.productionLineIds.length} lines</Badge>}
                          {!template.alertTypes?.length && !template.productionLineIds?.length && <span className="text-xs text-muted-foreground">Tất cả</span>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={template.isActive ? "default" : "secondary"}>{template.isActive ? "Hoạt động" : "Tắt"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Xóa template này?")) deleteMutation.mutate({ id: template.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium">Chưa có template nào</h3>
                <p className="text-sm text-muted-foreground">Tạo template để tái sử dụng cấu hình escalation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
