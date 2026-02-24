import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, History, Webhook, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type WebhookType = "slack" | "teams" | "custom";
type EventType = "cpk_alert" | "rule_violation" | "analysis_complete";

interface WebhookFormData {
  name: string;
  url: string;
  webhookType: WebhookType;
  secret: string;
  headers: string;
  events: EventType[];
}

const defaultFormData: WebhookFormData = {
  name: "",
  url: "",
  webhookType: "custom",
  secret: "",
  headers: "",
  events: [],
};

export default function WebhookManagement() {
  const { t } = useLanguage();
  // Using sonner toast
  const utils = trpc.useUtils();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>(defaultFormData);
  
  const { data: webhooks = [], isLoading } = trpc.webhook.list.useQuery();
  const { data: logs = [] } = trpc.webhook.getLogs.useQuery(
    { webhookId: selectedWebhookId || undefined, limit: 50 },
    { enabled: isLogsDialogOpen }
  );
  
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success(t.alerts.saveSuccess);
      utils.webhook.list.invalidate();
      closeDialog();
    },
    onError: (error) => {
      toast.error(t.alerts.error, { description: error.message });
    },
  });
  
  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success(t.alerts.saveSuccess);
      utils.webhook.list.invalidate();
      closeDialog();
    },
    onError: (error) => {
      toast.error(t.alerts.error, { description: error.message });
    },
  });
  
  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success(t.alerts.deleteSuccess);
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast.error(t.alerts.error, { description: error.message });
    },
  });
  
  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.webhook.testSuccess);
      } else {
        toast.error(t.webhook.testFailed, { description: result.error });
      }
    },
    onError: (error) => {
      toast.error(t.alerts.error, { description: error.message });
    },
  });
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };
  
  const openCreateDialog = () => {
    setFormData(defaultFormData);
    setEditingId(null);
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (webhook: typeof webhooks[0]) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      webhookType: webhook.webhookType as WebhookType,
      secret: webhook.secret || "",
      headers: webhook.headers || "",
      events: JSON.parse(webhook.events || "[]") as EventType[],
    });
    setEditingId(webhook.id);
    setIsDialogOpen(true);
  };
  
  const openLogsDialog = (webhookId: number) => {
    setSelectedWebhookId(webhookId);
    setIsLogsDialogOpen(true);
  };
  
  const handleSubmit = () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error(t.alerts.error, { description: "Please fill all required fields" });
      return;
    }
    
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const handleDelete = (id: number) => {
    if (confirm(t.alerts.confirmDelete)) {
      deleteMutation.mutate({ id });
    }
  };
  
  const handleToggleActive = (webhook: typeof webhooks[0]) => {
    updateMutation.mutate({
      id: webhook.id,
      isActive: webhook.isActive === 1 ? 0 : 1,
    });
  };
  
  const handleEventToggle = (event: EventType) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };
  
  const getWebhookTypeBadge = (type: string) => {
    switch (type) {
      case "slack":
        return <Badge className="bg-purple-500">{t.webhook.slack}</Badge>;
      case "teams":
        return <Badge className="bg-blue-500">{t.webhook.teams}</Badge>;
      default:
        return <Badge variant="outline">{t.webhook.custom}</Badge>;
    }
  };
  
  const getEventBadge = (event: string) => {
    switch (event) {
      case "cpk_alert":
        return <Badge variant="destructive" className="text-xs">{t.webhook.cpkAlert}</Badge>;
      case "rule_violation":
        return <Badge variant="secondary" className="text-xs">{t.webhook.ruleViolation}</Badge>;
      case "analysis_complete":
        return <Badge className="text-xs bg-green-500">{t.webhook.analysisComplete}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{event}</Badge>;
    }
  };
  
  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            {t.webhook.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure webhooks to receive notifications on Slack, Teams, or custom endpoints
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t.webhook.createWebhook}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            {webhooks.length} webhook(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t.common.loading}</div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.common.noData}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.webhook.webhookName}</TableHead>
                  <TableHead>{t.webhook.webhookType}</TableHead>
                  <TableHead>{t.webhook.events}</TableHead>
                  <TableHead>{t.webhook.triggerCount}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell>{getWebhookTypeBadge(webhook.webhookType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(webhook.events || "[]").map((event: string) => (
                          <span key={event}>{getEventBadge(event)}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{webhook.triggerCount}</TableCell>
                    <TableCell>
                      <Switch
                        checked={webhook.isActive === 1}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testMutation.mutate({ id: webhook.id })}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLogsDialog(webhook.id)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t.webhook.editWebhook : t.webhook.createWebhook}
            </DialogTitle>
            <DialogDescription>
              Configure webhook settings and event subscriptions
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.webhook.webhookName} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Slack Webhook"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="url">{t.webhook.webhookUrl} *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">{t.webhook.webhookType}</Label>
                <Select
                  value={formData.webhookType}
                  onValueChange={(value: WebhookType) => setFormData({ ...formData, webhookType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slack">{t.webhook.slack}</SelectItem>
                    <SelectItem value="teams">{t.webhook.teams}</SelectItem>
                    <SelectItem value="custom">{t.webhook.custom}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t.webhook.events} *</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cpk_alert"
                      checked={formData.events.includes("cpk_alert")}
                      onCheckedChange={() => handleEventToggle("cpk_alert")}
                    />
                    <label htmlFor="cpk_alert" className="text-sm cursor-pointer">
                      {t.webhook.cpkAlert} - Triggered when CPK falls below threshold
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rule_violation"
                      checked={formData.events.includes("rule_violation")}
                      onCheckedChange={() => handleEventToggle("rule_violation")}
                    />
                    <label htmlFor="rule_violation" className="text-sm cursor-pointer">
                      {t.webhook.ruleViolation} - Triggered when SPC rules are violated
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="analysis_complete"
                      checked={formData.events.includes("analysis_complete")}
                      onCheckedChange={() => handleEventToggle("analysis_complete")}
                    />
                    <label htmlFor="analysis_complete" className="text-sm cursor-pointer">
                      {t.webhook.analysisComplete} - Triggered when analysis completes
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="secret">{t.webhook.secret}</Label>
                <Input
                  id="secret"
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="Optional secret for signature verification"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="headers">{t.webhook.headers}</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">JSON format for custom headers</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Logs Dialog */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Delivery Logs</DialogTitle>
            <DialogDescription>
              Recent webhook delivery attempts and their results
            </DialogDescription>
          </DialogHeader>
          
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{getEventBadge(log.eventType)}</TableCell>
                    <TableCell>
                      {log.success === 1 ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{log.responseStatus}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>{log.responseStatus || "Error"}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.errorMessage || log.responseBody?.substring(0, 100) || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
