import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Mail,
  MessageSquare,
  Webhook,
  Clock,
  ArrowUp,
  Link2,
  Settings,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ============ Escalation Rules Tab ============
function EscalationRulesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    alertType: '',
    severityFilter: [] as string[],
    escalationLevels: [
      { level: 1, delayMinutes: 5, channels: ['email'] as ('email' | 'sms' | 'push')[], recipients: [''], message: '' },
    ],
    cooldownMinutes: 30,
  });
  
  const { data: rules, refetch } = trpc.iotAlertEscalation.getRules.useQuery();
  const createMutation = trpc.iotAlertEscalation.createRule.useMutation({
    onSuccess: () => {
      toast.success('Escalation rule created');
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.iotAlertEscalation.deleteRule.useMutation({
    onSuccess: () => {
      toast.success('Rule deleted');
      refetch();
    },
  });
  
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'slack': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Escalation Rules</h3>
          <p className="text-sm text-muted-foreground">Define how alerts escalate over time</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Escalation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Rule Name</Label>
                <Input 
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="Critical Alert Escalation"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Describe when this rule applies"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alert Type Filter</Label>
                  <Select 
                    value={newRule.alertType}
                    onValueChange={(v) => setNewRule({ ...newRule, alertType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="pressure">Pressure</SelectItem>
                      <SelectItem value="vibration">Vibration</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                      <SelectItem value="connectivity">Connectivity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cooldown (minutes)</Label>
                  <Input 
                    type="number"
                    value={newRule.cooldownMinutes}
                    onChange={(e) => setNewRule({ ...newRule, cooldownMinutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Escalation Levels</Label>
                {newRule.escalationLevels.map((level, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge>Level {level.level}</Badge>
                      <span className="text-sm text-muted-foreground">
                        After {level.delayMinutes} minutes
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Delay (minutes)</Label>
                        <Input 
                          type="number"
                          value={level.delayMinutes}
                          onChange={(e) => {
                            const levels = [...newRule.escalationLevels];
                            levels[index].delayMinutes = parseInt(e.target.value);
                            setNewRule({ ...newRule, escalationLevels: levels });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Channels</Label>
                        <Select 
                          value={level.channels[0] || 'email'}
                          onValueChange={(v: any) => {
                            const levels = [...newRule.escalationLevels];
                            levels[index].channels = [v];
                            setNewRule({ ...newRule, escalationLevels: levels });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="push">Push Notification</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="teams">Teams</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label>Recipients (comma separated)</Label>
                      <Input 
                        value={level.recipients.join(', ')}
                        onChange={(e) => {
                          const levels = [...newRule.escalationLevels];
                          levels[index].recipients = e.target.value.split(',').map(r => r.trim());
                          setNewRule({ ...newRule, escalationLevels: levels });
                        }}
                        placeholder="email@example.com, +84123456789"
                      />
                    </div>
                  </Card>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setNewRule({
                    ...newRule,
                    escalationLevels: [
                      ...newRule.escalationLevels,
                      { 
                        level: newRule.escalationLevels.length + 1, 
                        delayMinutes: 15 * (newRule.escalationLevels.length + 1), 
                        channels: ['email'], 
                        recipients: [''],
                        message: '',
                      },
                    ],
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newRule)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4">
        {rules?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No escalation rules defined
            </CardContent>
          </Card>
        ) : (
          rules?.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: rule.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{rule.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Cooldown: {rule.cooldownMinutes}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4 text-muted-foreground" />
                    <span>{rule.escalationLevels?.length || 0} levels</span>
                  </div>
                </div>
                
                {rule.escalationLevels && rule.escalationLevels.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {rule.escalationLevels.map((level: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="flex items-center gap-1">
                        L{level.level}: {level.delayMinutes}m
                        {level.channels?.map((ch: string) => getChannelIcon(ch))}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============ Alert Correlations Tab ============
function AlertCorrelationsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCorrelation, setNewCorrelation] = useState({
    name: '',
    description: '',
    correlationWindowMinutes: 5,
    sourceAlertPattern: {},
    relatedAlertPattern: {},
    actionType: 'suppress' as const,
    actionConfig: {},
  });
  
  const { data: correlations, refetch } = trpc.iotAlertEscalation.getCorrelations.useQuery();
  const createMutation = trpc.iotAlertEscalation.createCorrelation.useMutation({
    onSuccess: () => {
      toast.success('Correlation created');
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const getActionColor = (action: string) => {
    switch (action) {
      case 'suppress': return 'secondary';
      case 'merge': return 'default';
      case 'escalate': return 'destructive';
      default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Alert Correlations</h3>
          <p className="text-sm text-muted-foreground">Define relationships between alerts</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Correlation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Alert Correlation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={newCorrelation.name}
                  onChange={(e) => setNewCorrelation({ ...newCorrelation, name: e.target.value })}
                  placeholder="Power Failure Correlation"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newCorrelation.description}
                  onChange={(e) => setNewCorrelation({ ...newCorrelation, description: e.target.value })}
                  placeholder="Describe the correlation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Time Window (minutes)</Label>
                  <Input 
                    type="number"
                    value={newCorrelation.correlationWindowMinutes}
                    onChange={(e) => setNewCorrelation({ 
                      ...newCorrelation, 
                      correlationWindowMinutes: parseInt(e.target.value) 
                    })}
                  />
                </div>
                <div>
                  <Label>Action Type</Label>
                  <Select 
                    value={newCorrelation.actionType}
                    onValueChange={(v: any) => setNewCorrelation({ ...newCorrelation, actionType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suppress">Suppress</SelectItem>
                      <SelectItem value="merge">Merge</SelectItem>
                      <SelectItem value="escalate">Escalate</SelectItem>
                      <SelectItem value="notify">Notify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newCorrelation)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4">
        {correlations?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No correlations defined
            </CardContent>
          </Card>
        ) : (
          correlations?.map((corr) => (
            <Card key={corr.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    <CardTitle className="text-base">{corr.name}</CardTitle>
                    <Badge variant={corr.isActive ? 'default' : 'secondary'}>
                      {corr.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <Badge variant={getActionColor(corr.actionType) as any}>
                    {corr.actionType}
                  </Badge>
                </div>
                <CardDescription>{corr.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Window: {corr.correlationWindowMinutes}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============ Main Page ============
export default function IoTAlertEscalation() {
  const { data: stats, refetch } = trpc.iotAlertEscalation.getStats.useQuery();
  
  const testEscalation = trpc.iotAlertEscalation.testEscalation.useMutation({
    onSuccess: () => toast.success('Test escalation triggered'),
    onError: (error) => toast.error(error.message),
  });
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Alert Escalation</h1>
            <p className="text-muted-foreground">
              Configure alert escalation rules and correlations
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => testEscalation.mutate({
                deviceId: 1,
                alertType: 'test',
                severity: 'critical',
                message: 'Test escalation',
              })}
            >
              <Play className="h-4 w-4 mr-2" />
              Test Escalation
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.activeRules || 0}</div>
                  <div className="text-xs text-muted-foreground">Active Rules</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.escalationsToday || 0}</div>
                  <div className="text-xs text-muted-foreground">Escalations Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.activeCorrelations || 0}</div>
                  <div className="text-xs text-muted-foreground">Correlations</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.correlationsToday || 0}</div>
                  <div className="text-xs text-muted-foreground">Correlated Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules">
              <ArrowUp className="h-4 w-4 mr-2" />
              Escalation Rules
            </TabsTrigger>
            <TabsTrigger value="correlations">
              <Link2 className="h-4 w-4 mr-2" />
              Alert Correlations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules">
            <EscalationRulesTab />
          </TabsContent>
          
          <TabsContent value="correlations">
            <AlertCorrelationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
