import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Webhook, Send, CheckCircle, XCircle, Info, MessageSquare, Hash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WebhookSettings() {
  // Slack config
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  
  // Teams config
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('');
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load current config
  const { data: config, isLoading, refetch } = trpc.system.getWebhookConfig.useQuery(undefined, {
    onSuccess: (data) => {
      if (data) {
        setSlackWebhookUrl(data.slackWebhookUrl || '');
        setSlackChannel(data.slackChannel || '');
        setSlackEnabled(data.slackEnabled || false);
        setTeamsWebhookUrl(data.teamsWebhookUrl || '');
        setTeamsEnabled(data.teamsEnabled || false);
      }
    },
  });

  // Save config mutation
  const saveMutation = trpc.system.saveWebhookConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình Webhook');
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Test webhook mutation
  const testSlackMutation = trpc.system.testSlackWebhook.useMutation({
    onSuccess: () => {
      toast.success('Đã gửi test message đến Slack!');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const testTeamsMutation = trpc.system.testTeamsWebhook.useMutation({
    onSuccess: () => {
      toast.success('Đã gửi test message đến Teams!');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        slackWebhookUrl,
        slackChannel,
        slackEnabled,
        teamsWebhookUrl,
        teamsEnabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSlack = async () => {
    setIsTesting(true);
    try {
      await testSlackMutation.mutateAsync({});
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestTeams = async () => {
    setIsTesting(true);
    try {
      await testTeamsMutation.mutateAsync({});
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Webhook className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Webhook</h1>
            <p className="text-muted-foreground">Tích hợp gửi alerts đến Slack và Microsoft Teams</p>
          </div>
        </div>

        <Tabs defaultValue="slack" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="slack" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Slack
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Microsoft Teams
            </TabsTrigger>
          </TabsList>

          {/* Slack Tab */}
          <TabsContent value="slack" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-purple-600" />
                    Cấu hình Slack
                  </CardTitle>
                  <CardDescription>
                    Thiết lập Incoming Webhook để nhận alerts trên Slack
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slackWebhookUrl">Webhook URL</Label>
                    <Input
                      id="slackWebhookUrl"
                      placeholder="https://hooks.slack.com/services/T.../B.../..."
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tạo Incoming Webhook trong Slack App
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slackChannel">Channel (tùy chọn)</Label>
                    <Input
                      id="slackChannel"
                      placeholder="#spc-alerts"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Override channel mặc định của webhook
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <Label>Kích hoạt Slack</Label>
                      <p className="text-xs text-muted-foreground">
                        Gửi alerts đến Slack
                      </p>
                    </div>
                    <Switch
                      checked={slackEnabled}
                      onCheckedChange={setSlackEnabled}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleTestSlack}
                      disabled={isTesting || !slackEnabled || !slackWebhookUrl}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Hướng dẫn Slack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>1.</strong> Vào Slack App Directory &gt; Incoming Webhooks</p>
                  <p><strong>2.</strong> Chọn "Add to Slack"</p>
                  <p><strong>3.</strong> Chọn channel nhận thông báo</p>
                  <p><strong>4.</strong> Copy Webhook URL và dán vào form</p>
                  <p><strong>5.</strong> Bật "Kích hoạt Slack" và lưu</p>
                  
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Alerts sẽ được gửi với format rich message bao gồm severity, thời gian và link đến dashboard
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Cấu hình Microsoft Teams
                  </CardTitle>
                  <CardDescription>
                    Thiết lập Incoming Webhook để nhận alerts trên Teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamsWebhookUrl">Webhook URL</Label>
                    <Input
                      id="teamsWebhookUrl"
                      placeholder="https://outlook.office.com/webhook/..."
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tạo Incoming Webhook trong Teams Channel
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <Label>Kích hoạt Teams</Label>
                      <p className="text-xs text-muted-foreground">
                        Gửi alerts đến Microsoft Teams
                      </p>
                    </div>
                    <Switch
                      checked={teamsEnabled}
                      onCheckedChange={setTeamsEnabled}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleTestTeams}
                      disabled={isTesting || !teamsEnabled || !teamsWebhookUrl}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Hướng dẫn Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>1.</strong> Mở Teams channel muốn nhận alerts</p>
                  <p><strong>2.</strong> Click "..." &gt; Connectors</p>
                  <p><strong>3.</strong> Tìm "Incoming Webhook" &gt; Configure</p>
                  <p><strong>4.</strong> Đặt tên và upload icon (tùy chọn)</p>
                  <p><strong>5.</strong> Copy Webhook URL và dán vào form</p>
                  <p><strong>6.</strong> Bật "Kích hoạt Teams" và lưu</p>
                  
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Alerts sẽ được gửi dưới dạng Adaptive Card với đầy đủ thông tin và action buttons
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái tích hợp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Hash className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="font-medium">Slack</p>
                    <p className="text-sm text-muted-foreground">
                      {slackWebhookUrl ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </p>
                  </div>
                </div>
                {slackEnabled ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Hoạt động
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-500">
                    <XCircle className="h-5 w-5" />
                    Tắt
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-medium">Microsoft Teams</p>
                    <p className="text-sm text-muted-foreground">
                      {teamsWebhookUrl ? 'Đã cấu hình' : 'Chưa cấu hình'}
                    </p>
                  </div>
                </div>
                {teamsEnabled ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Hoạt động
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-500">
                    <XCircle className="h-5 w-5" />
                    Tắt
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
