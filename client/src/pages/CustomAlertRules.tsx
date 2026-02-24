import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Edit, Trash2, Play, CheckCircle, XCircle, AlertTriangle, Clock, Shield, Activity, History, Zap } from "lucide-react";

const METRIC_TYPES = [
  { value: "cpk", label: "CPK" },
  { value: "oee", label: "OEE (%)" },
  { value: "defect_rate", label: "Defect Rate (%)" },
  { value: "machine_downtime", label: "Machine Downtime (min)" },
  { value: "memory_usage", label: "Memory Usage (%)" },
  { value: "cpu_load", label: "CPU Load (%)" },
  { value: "db_latency", label: "DB Latency (ms)" },
  { value: "response_time", label: "Response Time (ms)" },
  { value: "error_rate", label: "Error Rate (%)" },
  { value: "throughput", label: "Throughput (req/s)" },
  { value: "queue_length", label: "Queue Length" },
  { value: "disk_usage", label: "Disk Usage (%)" },
];

const OPERATORS = [
  { value: "gt", label: ">" }, { value: "gte", label: ">=" },
  { value: "lt", label: "<" }, { value: "lte", label: "<=" },
  { value: "eq", label: "=" }, { value: "neq", label: "!=" },
  { value: "between", label: "Between" }, { value: "outside", label: "Outside" },
];

const SEVERITIES = [
  { value: "info", label: "Info" }, { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" }, { value: "emergency", label: "Emergency" },
];

const CHANNELS = ["in_app", "email", "slack", "webhook", "sms"];

type RuleForm = {
  name: string; description: string; metricType: string; operator: string;
  threshold: string; thresholdMax: string; severity: string;
  evaluationIntervalMinutes: number; cooldownMinutes: number; consecutiveBreachesRequired: number;
  notificationChannels: string[]; recipients: string; webhookUrl: string;
};

const defaultForm: RuleForm = {
  name: "", description: "", metricType: "cpk", operator: "lt", threshold: "1.33",
  thresholdMax: "", severity: "warning", evaluationIntervalMinutes: 5, cooldownMinutes: 30,
  consecutiveBreachesRequired: 1, notificationChannels: ["in_app"], recipients: "", webhookUrl: "",
};

export default function CustomAlertRules() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleForm>({ ...defaultForm });
  const [filterMetric, setFilterMetric] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const utils = trpc.useUtils();
  const listInput = useMemo(() => ({ page, limit: 20, metricType: filterMetric !== "all" ? filterMetric : undefined, severity: filterSeverity !== "all" ? filterSeverity : undefined }), [page, filterMetric, filterSeverity]);
  const { data: rulesData } = trpc.customAlert.list.useQuery(listInput);
  const historyInput = useMemo(() => ({ page: historyPage, limit: 20, severity: historyFilter !== "all" ? historyFilter : undefined }), [historyPage, historyFilter]);
  const { data: historyData } = trpc.customAlert.history.useQuery(historyInput);
  const emptyInput = useMemo(() => ({}), []);
  const { data: stats } = trpc.customAlert.stats.useQuery(emptyInput);

  const createMut = trpc.customAlert.create.useMutation({ onSuccess: () => { utils.customAlert.list.invalidate(); utils.customAlert.stats.invalidate(); setShowDialog(false); toast({ title: "Rule created" }); }, onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) });
  const updateMut = trpc.customAlert.update.useMutation({ onSuccess: () => { utils.customAlert.list.invalidate(); setShowDialog(false); toast({ title: "Rule updated" }); }, onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) });
  const deleteMut = trpc.customAlert.delete.useMutation({ onSuccess: () => { utils.customAlert.list.invalidate(); utils.customAlert.stats.invalidate(); toast({ title: "Rule deleted" }); } });
  const toggleMut = trpc.customAlert.toggle.useMutation({ onSuccess: () => { utils.customAlert.list.invalidate(); utils.customAlert.stats.invalidate(); } });
  const evaluateMut = trpc.customAlert.evaluate.useMutation({ onSuccess: (d: any) => toast({ title: "Evaluation complete", description: `${d.triggered} alerts triggered out of ${d.evaluated} rules` }), onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) });
  const acknowledgeMut = trpc.customAlert.acknowledge.useMutation({ onSuccess: () => { utils.customAlert.history.invalidate(); toast({ title: "Alert acknowledged" }); } });
  const resolveMut = trpc.customAlert.resolve.useMutation({ onSuccess: () => { utils.customAlert.history.invalidate(); utils.customAlert.stats.invalidate(); toast({ title: "Alert resolved" }); } });

  const handleSubmit = () => {
    const payload = { name: form.name, description: form.description || undefined, metricType: form.metricType, operator: form.operator, threshold: parseFloat(form.threshold), thresholdMax: form.thresholdMax ? parseFloat(form.thresholdMax) : undefined, severity: form.severity, evaluationIntervalMinutes: form.evaluationIntervalMinutes, cooldownMinutes: form.cooldownMinutes, consecutiveBreachesRequired: form.consecutiveBreachesRequired, notificationChannels: JSON.stringify(form.notificationChannels), recipients: form.recipients || undefined, webhookUrl: form.webhookUrl || undefined };
    if (editingId) updateMut.mutate({ id: editingId, ...payload }); else createMut.mutate(payload);
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    setForm({ name: rule.name, description: rule.description || "", metricType: rule.metricType, operator: rule.operator, threshold: String(rule.threshold), thresholdMax: rule.thresholdMax ? String(rule.thresholdMax) : "", severity: rule.severity, evaluationIntervalMinutes: rule.evaluationIntervalMinutes, cooldownMinutes: rule.cooldownMinutes, consecutiveBreachesRequired: rule.consecutiveBreachesRequired, notificationChannels: rule.notificationChannels ? JSON.parse(rule.notificationChannels) : ["in_app"], recipients: rule.recipients || "", webhookUrl: rule.webhookUrl || "" });
    setShowDialog(true);
  };

  const openCreate = () => { setEditingId(null); setForm({ ...defaultForm }); setShowDialog(true); };

  const severityBadge = (s: string) => {
    const colors: Record<string, string> = { info: "bg-blue-100 text-blue-800", warning: "bg-yellow-100 text-yellow-800", critical: "bg-red-100 text-red-800", emergency: "bg-red-200 text-red-900" };
    return <Badge className={colors[s] || ""}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-orange-500" /> Custom Alert Rules</h1>
          <p className="text-muted-foreground mt-1">Create and manage custom alert rules with notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => evaluateMut.mutate()} disabled={evaluateMut.isPending}><Play className="h-4 w-4 mr-1" /> {evaluateMut.isPending ? "Evaluating..." : "Evaluate All"}</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Shield className="h-4 w-4" /> Total Rules</div><p className="text-2xl font-bold mt-1">{stats?.totalRules ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4 text-green-500" /> Active</div><p className="text-2xl font-bold mt-1 text-green-600">{stats?.activeRules ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Total Triggers</div><p className="text-2xl font-bold mt-1">{stats?.totalTriggers ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4 text-red-500" /> Active Alerts</div><p className="text-2xl font-bold mt-1 text-red-600">{stats?.activeAlerts ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Last Eval</div><p className="text-lg font-bold mt-1">{stats?.lastEvaluation ? new Date(stats.lastEvaluation).toLocaleTimeString() : "N/A"}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules"><Shield className="h-4 w-4 mr-1" /> Rules ({rulesData?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History ({historyData?.total ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader><div className="flex items-center justify-between flex-wrap gap-2"><CardTitle>Alert Rules</CardTitle><div className="flex items-center gap-2">
              <Select value={filterMetric} onValueChange={setFilterMetric}><SelectTrigger className="w-40"><SelectValue placeholder="Metric" /></SelectTrigger><SelectContent><SelectItem value="all">All Metrics</SelectItem>{METRIC_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}><SelectTrigger className="w-32"><SelectValue placeholder="Severity" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
            </div></div></CardHeader>
            <CardContent>
              {rulesData?.rules?.length ? (
                <div className="space-y-3">
                  {rulesData.rules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{rule.name}</span>
                          {severityBadge(rule.severity)}
                          <Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Active" : "Disabled"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {METRIC_TYPES.find(m => m.value === rule.metricType)?.label ?? rule.metricType} {OPERATORS.find(o => o.value === rule.operator)?.label ?? rule.operator} {rule.threshold}
                          {rule.thresholdMax ? ` - ${rule.thresholdMax}` : ""} | Every {rule.evaluationIntervalMinutes}min | Cooldown {rule.cooldownMinutes}min | Triggers: {rule.totalTriggers}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.isActive} onCheckedChange={() => toggleMut.mutate({ id: rule.id, isActive: !rule.isActive })} />
                        <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this rule?")) deleteMut.mutate({ id: rule.id }); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                  {rulesData.totalPages > 1 && (<div className="flex justify-center gap-2 pt-4"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm text-muted-foreground py-2">{page} / {rulesData.totalPages}</span><Button variant="outline" size="sm" disabled={page >= rulesData.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>)}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No alert rules. Click "New Rule" to create one.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle>Alert History</CardTitle>
              <Select value={historyFilter} onValueChange={setHistoryFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
            </div></CardHeader>
            <CardContent>
              {historyData?.alerts?.length ? (
                <div className="space-y-3">
                  {historyData.alerts.map((alert: any) => (
                    <div key={alert.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><span className="font-medium">{alert.ruleName}</span>{severityBadge(alert.severity)}<Badge variant={alert.status === "active" ? "destructive" : alert.status === "acknowledged" ? "outline" : "secondary"}>{alert.status}</Badge></div>
                        <div className="flex items-center gap-1">
                          {alert.status === "active" && <Button variant="outline" size="sm" onClick={() => acknowledgeMut.mutate({ id: alert.id })}><CheckCircle className="h-4 w-4 mr-1" /> Ack</Button>}
                          {(alert.status === "active" || alert.status === "acknowledged") && <Button variant="outline" size="sm" onClick={() => resolveMut.mutate({ id: alert.id })}><XCircle className="h-4 w-4 mr-1" /> Resolve</Button>}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">Value: {alert.currentValue} {OPERATORS.find(o => o.value === alert.operator)?.label} {alert.threshold} | {new Date(alert.triggeredAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {historyData.totalPages > 1 && (<div className="flex justify-center gap-2 pt-4"><Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>Previous</Button><span className="text-sm text-muted-foreground py-2">{historyPage} / {historyData.totalPages}</span><Button variant="outline" size="sm" disabled={historyPage >= historyData.totalPages} onClick={() => setHistoryPage(p => p + 1)}>Next</Button></div>)}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No alert history</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Rule" : "Create New Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CPK Low Alert" /></div>
              <div><label className="text-sm font-medium">Severity</label><Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium">Metric *</label><Select value={form.metricType} onValueChange={v => setForm(f => ({ ...f, metricType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METRIC_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium">Operator *</label><Select value={form.operator} onValueChange={v => setForm(f => ({ ...f, operator: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium">Threshold *</label><Input type="number" step="any" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))} /></div>
            </div>
            {(form.operator === "between" || form.operator === "outside") && <div><label className="text-sm font-medium">Threshold Max</label><Input type="number" step="any" value={form.thresholdMax} onChange={e => setForm(f => ({ ...f, thresholdMax: e.target.value }))} /></div>}
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium">Eval Interval (min)</label><Input type="number" value={form.evaluationIntervalMinutes} onChange={e => setForm(f => ({ ...f, evaluationIntervalMinutes: parseInt(e.target.value) || 5 }))} /></div>
              <div><label className="text-sm font-medium">Cooldown (min)</label><Input type="number" value={form.cooldownMinutes} onChange={e => setForm(f => ({ ...f, cooldownMinutes: parseInt(e.target.value) || 30 }))} /></div>
              <div><label className="text-sm font-medium">Consecutive Breaches</label><Input type="number" value={form.consecutiveBreachesRequired} onChange={e => setForm(f => ({ ...f, consecutiveBreachesRequired: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div><label className="text-sm font-medium">Notification Channels</label><div className="flex flex-wrap gap-2 mt-1">{CHANNELS.map(ch => (<Badge key={ch} variant={form.notificationChannels.includes(ch) ? "default" : "outline"} className="cursor-pointer" onClick={() => setForm(f => ({ ...f, notificationChannels: f.notificationChannels.includes(ch) ? f.notificationChannels.filter(c => c !== ch) : [...f.notificationChannels, ch] }))}>{ch}</Badge>))}</div></div>
            {form.notificationChannels.includes("email") && <div><label className="text-sm font-medium">Email Recipients</label><Input value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} placeholder="admin@example.com" /></div>}
            {(form.notificationChannels.includes("webhook") || form.notificationChannels.includes("slack")) && <div><label className="text-sm font-medium">Webhook / Slack URL</label><Input value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://hooks.slack.com/..." /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending || !form.name || !form.threshold}>{editingId ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
