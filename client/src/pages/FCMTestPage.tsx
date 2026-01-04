/**
 * FCM Test Page - Trang test gửi push notifications
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, CheckCircle, XCircle, RefreshCw, Smartphone, Users, Hash, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function FCMTestPage() {
  const [deviceToken, setDeviceToken] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('Test Notification');
  const [notificationBody, setNotificationBody] = useState('This is a test notification from CPK/SPC Calculator');
  const [selectedTopic, setSelectedTopic] = useState('cpk_alerts');

  const { data: status, refetch: refetchStatus } = trpc.fcmIntegration.getStatus.useQuery();
  const { data: statistics } = trpc.fcmIntegration.getStatistics.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.fcmIntegration.getHistory.useQuery();
  const { data: topics, refetch: refetchTopics } = trpc.fcmIntegration.getTopics.useQuery();

  const sendToDevice = trpc.fcmIntegration.sendToDevice.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã gửi notification! Message ID: ${data.messageId}`);
      refetchHistory();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const sendToTopic = trpc.fcmIntegration.sendToTopic.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã gửi notification đến topic! Message ID: ${data.messageId}`);
      refetchHistory();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const sendTestNotification = trpc.fcmIntegration.sendTestNotification.useMutation({
    onSuccess: () => { toast.success('Đã gửi test notification!'); refetchHistory(); },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const sendCpkAlert = trpc.fcmIntegration.sendCpkAlert.useMutation({
    onSuccess: (data) => { toast.success(`Đã gửi CPK alert! Sent: ${data.sentCount}`); refetchHistory(); },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleSendToDevice = () => {
    if (!deviceToken.trim()) { toast.error('Vui lòng nhập device token'); return; }
    sendToDevice.mutate({ token: deviceToken, title: notificationTitle, body: notificationBody });
  };

  const handleSendToTopic = () => {
    sendToTopic.mutate({ topic: selectedTopic, title: notificationTitle, body: notificationBody });
  };

  const handleSendCpkAlert = () => {
    sendCpkAlert.mutate({ planName: 'Test Plan', cpkValue: 0.95, threshold: 1.0, severity: 'warning' });
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString('vi-VN');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FCM Test Page</h1>
            <p className="text-muted-foreground">Test gửi push notifications qua Firebase Cloud Messaging</p>
          </div>
          <Button variant="outline" onClick={() => { refetchStatus(); refetchHistory(); refetchTopics(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Làm mới
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" />Firebase Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {status?.isInitialized ? (
                  <><CheckCircle className="h-5 w-5 text-green-500" /><span className="text-green-500 font-bold">Connected</span></>
                ) : (
                  <><XCircle className="h-5 w-5 text-red-500" /><span className="text-red-500 font-bold">Not Connected</span></>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Hash className="h-4 w-4" />Active Topics</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{status?.activeTopics || 0}</div></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Send className="h-4 w-4" />Total Sent</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{statistics?.totalSent || 0}</div></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Success Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {statistics?.totalSent ? Math.round((statistics.successCount / statistics.totalSent) * 100) : 100}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send">
          <TabsList>
            <TabsTrigger value="send">Gửi Notification</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
            <TabsTrigger value="quick">Quick Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />Gửi đến Device</CardTitle>
                  <CardDescription>Gửi notification đến một device cụ thể</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Device Token</Label><Textarea placeholder="Nhập FCM device token..." value={deviceToken} onChange={(e) => setDeviceToken(e.target.value)} rows={3} /></div>
                  <div><Label>Title</Label><Input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} /></div>
                  <div><Label>Body</Label><Textarea value={notificationBody} onChange={(e) => setNotificationBody(e.target.value)} rows={2} /></div>
                  <Button onClick={handleSendToDevice} disabled={sendToDevice.isPending} className="w-full">
                    <Send className="h-4 w-4 mr-2" />{sendToDevice.isPending ? 'Đang gửi...' : 'Gửi đến Device'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Gửi đến Topic</CardTitle>
                  <CardDescription>Gửi notification đến tất cả subscribers của topic</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Topic</Label>
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {topics?.map((topic: any) => (<SelectItem key={topic.name} value={topic.name}>{topic.displayName}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Title</Label><Input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} /></div>
                  <div><Label>Body</Label><Textarea value={notificationBody} onChange={(e) => setNotificationBody(e.target.value)} rows={2} /></div>
                  <Button onClick={handleSendToTopic} disabled={sendToTopic.isPending} className="w-full">
                    <Send className="h-4 w-4 mr-2" />{sendToTopic.isPending ? 'Đang gửi...' : 'Gửi đến Topic'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Danh sách Topics</CardTitle><CardDescription>Các topics có sẵn để gửi notifications</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topics?.map((topic: any) => (
                      <TableRow key={topic.name}>
                        <TableCell className="font-mono">{topic.name}</TableCell>
                        <TableCell>{topic.displayName}</TableCell>
                        <TableCell className="text-muted-foreground">{topic.description}</TableCell>
                        <TableCell>{topic.subscriberCount}</TableCell>
                        <TableCell><Badge variant={topic.isActive ? 'default' : 'secondary'}>{topic.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Lịch sử Notifications</CardTitle><CardDescription>Các notifications đã gửi gần đây</CardDescription></CardHeader>
              <CardContent>
                {history?.items && history.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{formatTime(item.createdAt)}</TableCell>
                          <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell className="text-xs">{item.targetValue}</TableCell>
                          <TableCell className="text-green-500">{item.successCount}</TableCell>
                          <TableCell className="text-red-500">{item.failureCount}</TableCell>
                          <TableCell><Badge variant={item.status === 'sent' ? 'default' : 'destructive'}>{item.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground"><Bell className="h-12 w-12 mx-auto mb-4" /><p>Chưa có lịch sử notifications</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Test Notification</CardTitle><CardDescription>Gửi notification test nhanh</CardDescription></CardHeader>
                <CardContent>
                  <Button onClick={() => sendTestNotification.mutate()} disabled={sendTestNotification.isPending} className="w-full">
                    <Bell className="h-4 w-4 mr-2" />{sendTestNotification.isPending ? 'Đang gửi...' : 'Gửi Test'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">CPK Alert</CardTitle><CardDescription>Gửi cảnh báo CPK mẫu</CardDescription></CardHeader>
                <CardContent>
                  <Button onClick={handleSendCpkAlert} disabled={sendCpkAlert.isPending} variant="destructive" className="w-full">
                    <AlertTriangle className="h-4 w-4 mr-2" />{sendCpkAlert.isPending ? 'Đang gửi...' : 'Gửi CPK Alert'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Broadcast</CardTitle><CardDescription>Gửi đến tất cả topics</CardDescription></CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => toast.info('Feature coming soon')}>
                    <Users className="h-4 w-4 mr-2" />Broadcast All
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
