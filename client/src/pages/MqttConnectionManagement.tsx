/**
 * MQTT Connection Management Page
 * Quản lý kết nối MQTT broker và topics
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Send,
  MessageSquare,
  Settings,
  TestTube,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MqttConnectionManagement() {
  const { toast } = useToast();
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    brokerUrl: 'mqtt://localhost',
    port: 1883,
    clientId: '',
    username: '',
    password: '',
    useTls: false,
    keepAlive: 60,
    cleanSession: true,
  });

  const [topicForm, setTopicForm] = useState({
    topic: '',
    qos: 1,
    payloadFormat: 'json' as 'json' | 'text' | 'binary',
  });

  const [testMessage, setTestMessage] = useState({
    topic: 'test/topic',
    payload: '{"value": 42, "unit": "°C"}',
  });

  // Queries
  const { data: connections, refetch: refetchConnections } = trpc.mqtt.getStatus.useQuery();
  
  // Mutations
  const connectMutation = trpc.mqtt.connect.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã kết nối MQTT broker' });
      refetchConnections();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectMutation = trpc.mqtt.disconnect.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã ngắt kết nối' });
      refetchConnections();
    },
  });

  const subscribeMutation = trpc.mqtt.subscribe.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã subscribe topic' });
      refetchConnections();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const unsubscribeMutation = trpc.mqtt.unsubscribe.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã unsubscribe topic' });
      refetchConnections();
    },
  });

  const publishMutation = trpc.mqtt.publish.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã gửi message' });
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const testPublishMutation = trpc.mqtt.testPublish.useMutation({
    onSuccess: (result) => {
      toast({ 
        title: 'Test thành công', 
        description: `Published to ${result.topic}` 
      });
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const { data: history } = trpc.mqtt.getHistory.useQuery({ limit: 50 });

  // Handlers
  const handleConnect = () => {
    connectMutation.mutate({
      brokerUrl: `${formData.brokerUrl}:${formData.port}`,
      username: formData.username || undefined,
      password: formData.password || undefined,
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleSubscribe = () => {
    if (topicForm.topic) {
      subscribeMutation.mutate({ topic: topicForm.topic });
      setIsTopicDialogOpen(false);
      setTopicForm({ topic: '', qos: 1, payloadFormat: 'json' });
    }
  };

  const handleUnsubscribe = (topic: string) => {
    unsubscribeMutation.mutate({ topic });
  };

  const handlePublish = () => {
    try {
      const payload = JSON.parse(testMessage.payload);
      publishMutation.mutate({
        topic: testMessage.topic,
        payload,
      });
    } catch {
      publishMutation.mutate({
        topic: testMessage.topic,
        payload: testMessage.payload,
      });
    }
  };

  const handleTestPublish = () => {
    testPublishMutation.mutate({
      deviceId: 'demo-sensor-01',
      metric: 'temperature',
      value: Math.random() * 50 + 20,
      unit: '°C',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý MQTT Connections</h1>
            <p className="text-muted-foreground">
              Cấu hình kết nối MQTT broker và quản lý topics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetchConnections()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  connections?.connected ? "bg-green-500" : "bg-red-500"
                )} />
                <CardTitle>Trạng thái kết nối</CardTitle>
              </div>
              <Badge variant={connections?.connected ? "default" : "secondary"}>
                {connections?.connected ? (
                  <><Wifi className="w-3 h-3 mr-1" /> Connected</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> Disconnected</>
                )}
              </Badge>
            </div>
            <CardDescription>
              Broker: {connections?.brokerUrl || 'Chưa cấu hình'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Connection Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Broker URL</Label>
                    <Input
                      value={formData.brokerUrl}
                      onChange={(e) => setFormData({ ...formData, brokerUrl: e.target.value })}
                      placeholder="mqtt://localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username (optional)</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (optional)</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-tls"
                      checked={formData.useTls}
                      onCheckedChange={(checked) => setFormData({ ...formData, useTls: checked })}
                    />
                    <Label htmlFor="use-tls">Use TLS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="clean-session"
                      checked={formData.cleanSession}
                      onCheckedChange={(checked) => setFormData({ ...formData, cleanSession: checked })}
                    />
                    <Label htmlFor="clean-session">Clean Session</Label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-center gap-4">
                {connections?.connected ? (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    Ngắt kết nối
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Kết nối
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleTestPublish}
                  disabled={!connections?.connected || testPublishMutation.isPending}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Publish
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="topics">
          <TabsList>
            <TabsTrigger value="topics">
              <MessageSquare className="w-4 h-4 mr-2" />
              Topics ({connections?.subscriptions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="messages">
              <Send className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="history">
              <Settings className="w-4 h-4 mr-2" />
              History ({history?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Topics Tab */}
          <TabsContent value="topics">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subscribed Topics</CardTitle>
                  <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={!connections?.connected}>
                        <Plus className="w-4 h-4 mr-2" />
                        Subscribe Topic
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subscribe Topic</DialogTitle>
                        <DialogDescription>
                          Nhập topic pattern để subscribe (hỗ trợ wildcard + và #)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Topic</Label>
                          <Input
                            value={topicForm.topic}
                            onChange={(e) => setTopicForm({ ...topicForm, topic: e.target.value })}
                            placeholder="devices/+/metrics/#"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>QoS</Label>
                          <Select
                            value={String(topicForm.qos)}
                            onValueChange={(v) => setTopicForm({ ...topicForm, qos: parseInt(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">QoS 0 - At most once</SelectItem>
                              <SelectItem value="1">QoS 1 - At least once</SelectItem>
                              <SelectItem value="2">QoS 2 - Exactly once</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                          Hủy
                        </Button>
                        <Button onClick={handleSubscribe} disabled={subscribeMutation.isPending}>
                          {subscribeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Subscribe
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {connections?.subscriptions && connections.subscriptions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.subscriptions.map((topic) => (
                        <TableRow key={topic}>
                          <TableCell className="font-mono">{topic}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnsubscribe(topic)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có topic nào được subscribe
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Publish Message</CardTitle>
                <CardDescription>
                  Gửi message đến một topic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    value={testMessage.topic}
                    onChange={(e) => setTestMessage({ ...testMessage, topic: e.target.value })}
                    placeholder="devices/sensor-01/metrics/temperature"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payload (JSON or text)</Label>
                  <Textarea
                    value={testMessage.payload}
                    onChange={(e) => setTestMessage({ ...testMessage, payload: e.target.value })}
                    rows={4}
                    className="font-mono"
                  />
                </div>
                <Button
                  onClick={handlePublish}
                  disabled={!connections?.connected || publishMutation.isPending}
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publish
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>
                  Lịch sử messages đã nhận
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {history.map((msg, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-primary">{msg.topic}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                        <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                          {typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có message nào
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Subscribe</CardTitle>
            <CardDescription>
              Các topic pattern phổ biến
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                'devices/#',
                'devices/+/metrics/#',
                'devices/+/alarms',
                'devices/+/status',
                'spc/#',
                'spc/+/alerts',
              ].map((topic) => (
                <Button
                  key={topic}
                  variant="outline"
                  size="sm"
                  onClick={() => subscribeMutation.mutate({ topic })}
                  disabled={!connections?.connected || connections?.subscriptions?.includes(topic)}
                >
                  {topic}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
