/**
 * Performance Alert Widget
 * 
 * Displays and manages performance alerts and alert rules
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle,
  Clock,
  Database,
  Edit,
  Info,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

type AlertRuleType = "slow_query_threshold" | "pool_utilization" | "pool_queue_length" | "error_rate" | "cache_hit_rate" | "memory_usage";
type AlertSeverity = "info" | "warning" | "critical";

const ruleTypeLabels: Record<AlertRuleType, string> = {
  slow_query_threshold: "Slow Query",
  pool_utilization: "Pool Utilization",
  pool_queue_length: "Pool Queue",
  error_rate: "Error Rate",
  cache_hit_rate: "Cache Hit Rate",
  memory_usage: "Memory Usage",
};

const ruleTypeUnits: Record<AlertRuleType, string> = {
  slow_query_threshold: "ms",
  pool_utilization: "%",
  pool_queue_length: "",
  error_rate: "%",
  cache_hit_rate: "%",
  memory_usage: "%",
};

const severityColors: Record<AlertSeverity, string> = {
  info: "bg-blue-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
};

const severityBadgeVariants: Record<AlertSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  warning: "outline",
  critical: "destructive",
};

export function PerformanceAlertWidget() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    type: "slow_query_threshold" as AlertRuleType,
    threshold: 1000,
    severity: "warning" as AlertSeverity,
    enabled: true,
    notifyEmail: false,
    notifyWebhook: false,
    cooldownMinutes: 5,
    description: "",
  });

  // Queries
  const { data: rules, refetch: refetchRules, isLoading: rulesLoading } = trpc.performanceAlert.getRules.useQuery();
  const { data: alerts, refetch: refetchAlerts, isLoading: alertsLoading } = trpc.performanceAlert.getAlerts.useQuery({ limit: 100 });
  const { data: stats, refetch: refetchStats } = trpc.performanceAlert.getStats.useQuery();

  // Mutations
  const createRuleMutation = trpc.performanceAlert.createRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule created");
      setShowCreateDialog(false);
      resetNewRule();
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRuleMutation = trpc.performanceAlert.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule updated");
      setEditingRule(null);
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRuleMutation = trpc.performanceAlert.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule deleted");
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleRuleMutation = trpc.performanceAlert.toggleRule.useMutation({
    onSuccess: () => {
      refetchRules();
    },
    onError: (error) => toast.error(error.message),
  });

  const acknowledgeAlertMutation = trpc.performanceAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged");
      refetchAlerts();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const acknowledgeAllMutation = trpc.performanceAlert.acknowledgeAlerts.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} alerts acknowledged`);
      refetchAlerts();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const runChecksMutation = trpc.performanceAlert.runChecks.useMutation({
    onSuccess: (data) => {
      if (data.alerts.length > 0) {
        toast.warning(`${data.alerts.length} new alerts triggered`);
      } else {
        toast.success("All metrics within thresholds");
      }
      refetchAlerts();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const clearAlertsMutation = trpc.performanceAlert.clearAlerts.useMutation({
    onSuccess: () => {
      toast.success("All alerts cleared");
      refetchAlerts();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetNewRule = () => {
    setNewRule({
      name: "",
      type: "slow_query_threshold",
      threshold: 1000,
      severity: "warning",
      enabled: true,
      notifyEmail: false,
      notifyWebhook: false,
      cooldownMinutes: 5,
      description: "",
    });
  };

  const handleCreateRule = () => {
    createRuleMutation.mutate(newRule);
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;
    updateRuleMutation.mutate({
      id: editingRule.id,
      name: editingRule.name,
      threshold: editingRule.threshold,
      severity: editingRule.severity,
      enabled: editingRule.enabled,
      notifyEmail: editingRule.notifyEmail,
      notifyWebhook: editingRule.notifyWebhook,
      cooldownMinutes: editingRule.cooldownMinutes,
      description: editingRule.description,
    });
  };

  const handleAcknowledgeAll = () => {
    const unacknowledgedIds = alerts?.filter((a: any) => !a.acknowledgedAt).map((a: any) => a.id) || [];
    if (unacknowledgedIds.length > 0) {
      acknowledgeAllMutation.mutate({ alertIds: unacknowledgedIds });
    }
  };

  const formatTimestamp = (date: Date | string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unacknowledged</p>
                <p className="text-2xl font-bold text-yellow-500">{stats?.unacknowledged || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last 24h</p>
                <p className="text-2xl font-bold">{stats?.last24Hours || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">{stats?.bySeverity?.critical || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Alerts
              </CardTitle>
              <CardDescription>Monitor and manage performance alert rules</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runChecksMutation.mutate()}
                disabled={runChecksMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Run Checks
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchRules();
                  refetchAlerts();
                  refetchStats();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="alerts" className="flex items-center gap-1">
                <Bell className="h-4 w-4" />
                Alerts
                {stats?.unacknowledged ? (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {stats.unacknowledged}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Rules
              </TabsTrigger>
            </TabsList>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Showing {alerts?.length || 0} alerts
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcknowledgeAll}
                    disabled={!stats?.unacknowledged || acknowledgeAllMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Acknowledge All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearAlertsMutation.mutate()}
                    disabled={clearAlertsMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                {alertsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !alerts?.length ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mb-2" />
                    <p>No alerts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts?.map((alert: any) => (
                        <TableRow key={alert.id} className={alert.acknowledgedAt ? "opacity-60" : ""}>
                          <TableCell>
                            <Badge variant={severityBadgeVariants[alert.severity as AlertSeverity]}>
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{ruleTypeLabels[alert.type as AlertRuleType]}</TableCell>
                          <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                          <TableCell>
                            {alert.currentValue.toFixed(1)} / {alert.threshold}
                            {ruleTypeUnits[alert.type as AlertRuleType]}
                          </TableCell>
                          <TableCell className="text-sm">{formatTimestamp(alert.createdAt)}</TableCell>
                          <TableCell>
                            {alert.acknowledgedAt ? (
                              <Badge variant="outline" className="text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Ack
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!alert.acknowledgedAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => acknowledgeAlertMutation.mutate({ alertId: alert.id })}
                                disabled={acknowledgeAlertMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {rules?.length || 0} alert rules configured
                </p>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Alert Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          placeholder="Alert rule name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={newRule.type}
                            onValueChange={(v) => setNewRule({ ...newRule, type: v as AlertRuleType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ruleTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Severity</Label>
                          <Select
                            value={newRule.severity}
                            onValueChange={(v) => setNewRule({ ...newRule, severity: v as AlertSeverity })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warning">Warning</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Threshold ({ruleTypeUnits[newRule.type] || ""})</Label>
                          <Input
                            type="number"
                            value={newRule.threshold}
                            onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cooldown (minutes)</Label>
                          <Input
                            type="number"
                            value={newRule.cooldownMinutes}
                            onChange={(e) => setNewRule({ ...newRule, cooldownMinutes: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={newRule.description}
                          onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRule.notifyEmail}
                            onCheckedChange={(v) => setNewRule({ ...newRule, notifyEmail: v })}
                          />
                          <Label>Email</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRule.notifyWebhook}
                            onCheckedChange={(v) => setNewRule({ ...newRule, notifyWebhook: v })}
                          />
                          <Label>Webhook</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRule} disabled={createRuleMutation.isPending}>
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[400px]">
                {rulesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !rules?.length ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Settings className="h-12 w-12 mb-2" />
                    <p>No alert rules configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enabled</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Cooldown</TableHead>
                        <TableHead>Notify</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules?.map((rule: any) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(v) => toggleRuleMutation.mutate({ id: rule.id, enabled: v })}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell>{ruleTypeLabels[rule.type as AlertRuleType]}</TableCell>
                          <TableCell>
                            {rule.threshold}{ruleTypeUnits[rule.type as AlertRuleType]}
                          </TableCell>
                          <TableCell>
                            <Badge variant={severityBadgeVariants[rule.severity as AlertSeverity]}>
                              {rule.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{rule.cooldownMinutes}m</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {rule.notifyEmail && <Bell className="h-4 w-4 text-blue-500" />}
                              {rule.notifyWebhook && <Zap className="h-4 w-4 text-purple-500" />}
                              {!rule.notifyEmail && !rule.notifyWebhook && (
                                <BellOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRule({ ...rule })}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Alert Rule</DialogTitle>
                                  </DialogHeader>
                                  {editingRule && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                          value={editingRule.name}
                                          onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Threshold ({ruleTypeUnits[editingRule.type as AlertRuleType]})</Label>
                                          <Input
                                            type="number"
                                            value={editingRule.threshold}
                                            onChange={(e) => setEditingRule({ ...editingRule, threshold: Number(e.target.value) })}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Severity</Label>
                                          <Select
                                            value={editingRule.severity}
                                            onValueChange={(v) => setEditingRule({ ...editingRule, severity: v })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="info">Info</SelectItem>
                                              <SelectItem value="warning">Warning</SelectItem>
                                              <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Cooldown (minutes)</Label>
                                        <Input
                                          type="number"
                                          value={editingRule.cooldownMinutes}
                                          onChange={(e) => setEditingRule({ ...editingRule, cooldownMinutes: Number(e.target.value) })}
                                        />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                          <Switch
                                            checked={editingRule.notifyEmail}
                                            onCheckedChange={(v) => setEditingRule({ ...editingRule, notifyEmail: v })}
                                          />
                                          <Label>Email</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Switch
                                            checked={editingRule.notifyWebhook}
                                            onCheckedChange={(v) => setEditingRule({ ...editingRule, notifyWebhook: v })}
                                          />
                                          <Label>Webhook</Label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingRule(null)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleUpdateRule} disabled={updateRuleMutation.isPending}>
                                      Save
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Delete this rule?")) {
                                    deleteRuleMutation.mutate({ id: rule.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceAlertWidget;
