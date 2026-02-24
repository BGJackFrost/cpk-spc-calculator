/**
 * Firebase Push Settings Page
 * Quản lý cấu hình Firebase và push notification
 */

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Settings, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  History,
  Users,
  MessageSquare
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function FirebasePushSettingsPage() {
  const [projectId, setProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  // Queries
  const configStatus = trpc.firebasePush.getConfigStatus.useQuery();
  const myDevices = trpc.firebasePush.getMyDeviceTokens.useQuery();
  const mySettings = trpc.firebasePush.getMyPushSettings.useQuery();
  const pushStats = trpc.firebasePush.getStats.useQuery({ days: 7 });
  const pushHistory = trpc.firebasePush.getHistory.useQuery({ limit: 20 });

  // Mutations
  const saveConfig = trpc.firebasePush.saveConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình Firebase');
      configStatus.refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const initializeFirebase = trpc.firebasePush.initializeFromConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã khởi tạo Firebase thành công');
      configStatus.refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const sendTest = trpc.firebasePush.sendTestNotification.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã gửi test notification đến ${data.successCount}/${data.totalDevices} thiết bị`);
      pushHistory.refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const updateSettings = trpc.firebasePush.updatePushSettings.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật cài đặt');
      mySettings.refetch();
    },
  });

  const handleSaveConfig = () => {
    if (!projectId || !clientEmail || !privateKey) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    saveConfig.mutate({ projectId, clientEmail, privateKey });
  };

  const handleSettingChange = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Firebase Push Notification</h1>
            <p className="text-muted-foreground">Quản lý cấu hình và gửi push notification đến mobile app</p>
          </div>
          <div className="flex items-center gap-2">
            {configStatus.data?.isInitialized ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Đã kết nối
              </Badge>
            ) : configStatus.data?.isConfigured ? (
              <Badge variant="secondary" className="bg-yellow-500 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Chưa khởi tạo
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Chưa cấu hình
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Bell className="w-4 h-4" />
              Cài đặt
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Smartphone className="w-4 h-4" />
              Thiết bị
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Lịch sử
            </TabsTrigger>
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Firebase Config */}
              <Card>
                <CardHeader>
                  <CardTitle>Cấu hình Firebase Admin SDK</CardTitle>
                  <CardDescription>
                    Nhập thông tin từ Firebase Console để kích hoạt push notification
                  </CardDescription>
                </CardHeader>
                
                {/* Hướng dẫn lấy credentials */}
                <div className="mx-6 mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Hướng dẫn lấy Firebase Credentials
                  </h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>
                      Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">Firebase Console</a>
                    </li>
                    <li>Chọn hoặc tạo project mới</li>
                    <li>Vào <strong>Project Settings</strong> (biểu tượng bánh răng)</li>
                    <li>Chọn tab <strong>Service accounts</strong></li>
                    <li>Click <strong>"Generate new private key"</strong></li>
                    <li>Mở file JSON đã tải về và copy các giá trị:</li>
                  </ol>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border text-xs font-mono">
                    <div className="text-gray-600 dark:text-gray-400">{'{'}</div>
                    <div className="ml-4">
                      <span className="text-green-600">"project_id"</span>: <span className="text-orange-500">"your-project-id"</span>,
                    </div>
                    <div className="ml-4">
                      <span className="text-green-600">"client_email"</span>: <span className="text-orange-500">"firebase-adminsdk@..."</span>,
                    </div>
                    <div className="ml-4">
                      <span className="text-green-600">"private_key"</span>: <span className="text-orange-500">"-----BEGIN PRIVATE KEY-----\n..."</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">{'}'}</div>
                  </div>
                </div>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project ID</Label>
                    <Input
                      id="projectId"
                      placeholder="your-project-id"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="firebase-adminsdk@your-project.iam.gserviceaccount.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privateKey">Private Key</Label>
                    <Textarea
                      id="privateKey"
                      placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                      rows={4}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Copy nguyên văn từ trường "private_key" trong file JSON (bao gồm cả \n)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveConfig} disabled={saveConfig.isPending}>
                      {saveConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Lưu cấu hình
                    </Button>
                    {configStatus.data?.isConfigured && !configStatus.data?.isInitialized && (
                      <Button
                        variant="outline"
                        onClick={() => initializeFirebase.mutate()}
                        disabled={initializeFirebase.isPending}
                      >
                        {initializeFirebase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Khởi tạo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status & Test */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Trạng thái</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Project ID</p>
                        <p className="font-medium">{configStatus.data?.projectId || 'Chưa cấu hình'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Thiết bị đăng ký</p>
                        <p className="font-medium">{pushStats.data?.activeDevices || 0}</p>
                      </div>
                    </div>

                    {configStatus.data?.isInitialized && (
                      <Button
                        className="w-full"
                        onClick={() => sendTest.mutate()}
                        disabled={sendTest.isPending}
                      >
                        {sendTest.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Gửi test notification
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Thống kê 7 ngày</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {pushStats.data?.byStatus?.sent || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Đã gửi</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {pushStats.data?.byStatus?.delivered || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Đã nhận</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {pushStats.data?.byStatus?.failed || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Thất bại</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt nhận thông báo</CardTitle>
                <CardDescription>Tùy chỉnh loại thông báo bạn muốn nhận</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bật thông báo</Label>
                    <p className="text-sm text-muted-foreground">Nhận tất cả thông báo đẩy</p>
                  </div>
                  <Switch
                    checked={mySettings.data?.enabled ?? true}
                    onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Loại cảnh báo</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cảnh báo IoT</Label>
                      <p className="text-sm text-muted-foreground">Thông báo từ thiết bị IoT</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.iotAlerts ?? true}
                      onCheckedChange={(checked) => handleSettingChange('iotAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cảnh báo SPC</Label>
                      <p className="text-sm text-muted-foreground">Cảnh báo từ phân tích SPC</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.spcAlerts ?? true}
                      onCheckedChange={(checked) => handleSettingChange('spcAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cảnh báo CPK</Label>
                      <p className="text-sm text-muted-foreground">Cảnh báo khi CPK vượt ngưỡng</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.cpkAlerts ?? true}
                      onCheckedChange={(checked) => handleSettingChange('cpkAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cảnh báo Escalation</Label>
                      <p className="text-sm text-muted-foreground">Cảnh báo leo thang</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.escalationAlerts ?? true}
                      onCheckedChange={(checked) => handleSettingChange('escalationAlerts', checked)}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Tùy chọn nâng cao</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Chỉ cảnh báo Critical</Label>
                      <p className="text-sm text-muted-foreground">Chỉ nhận thông báo mức độ nghiêm trọng</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.criticalOnly ?? false}
                      onCheckedChange={(checked) => handleSettingChange('criticalOnly', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Giờ yên tĩnh</Label>
                      <p className="text-sm text-muted-foreground">Tắt thông báo trong khoảng thời gian</p>
                    </div>
                    <Switch
                      checked={mySettings.data?.quietHoursEnabled ?? false}
                      onCheckedChange={(checked) => handleSettingChange('quietHoursEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle>Thiết bị đã đăng ký</CardTitle>
                <CardDescription>Danh sách thiết bị nhận push notification</CardDescription>
              </CardHeader>
              <CardContent>
                {myDevices.data?.length === 0 ? (
                  <Alert>
                    <Smartphone className="w-4 h-4" />
                    <AlertDescription>
                      Chưa có thiết bị nào đăng ký. Tải app mobile và đăng nhập để nhận thông báo.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {myDevices.data?.map((device: any) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{device.deviceName || 'Unknown Device'}</p>
                            <p className="text-sm text-muted-foreground">
                              {device.platform} • {device.deviceModel || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={device.isActive ? 'default' : 'secondary'}>
                            {device.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lần cuối: {new Date(device.lastUsedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch sử gửi thông báo</CardTitle>
                  <CardDescription>20 thông báo gần nhất</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => pushHistory.refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {pushHistory.data?.items?.length === 0 ? (
                  <Alert>
                    <MessageSquare className="w-4 h-4" />
                    <AlertDescription>Chưa có thông báo nào được gửi.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {pushHistory.data?.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div
                          className={`p-2 rounded-full ${
                            item.status === 'sent'
                              ? 'bg-green-100 text-green-600'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}
                        >
                          {item.status === 'sent' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : item.status === 'failed' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <Loader2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{item.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {item.alertType}
                            </Badge>
                            <Badge
                              variant={
                                item.severity === 'critical'
                                  ? 'destructive'
                                  : item.severity === 'warning'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {item.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{item.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.sentAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
