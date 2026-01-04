/**
 * PushNotificationSettings - Mobile Push Notification Configuration
 * Cho phép người dùng tùy chỉnh loại notification muốn nhận
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Bell,
  BellOff,
  BellRing,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  Moon,
  Sun,
  Shield,
  Activity,
  Gauge,
  AlertTriangle,
  Cpu,
  Server,
  TrendingUp,
  TrendingDown,
  Settings,
  Save,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  Smartphone,
  Mail,
  MessageSquare,
  Zap,
  Target,
  Calendar,
  Timer
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Types
interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  threshold?: number;
  thresholdUnit?: string;
}

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  weekdaysOnly: boolean;
  allowCritical: boolean;
}

interface NotificationSound {
  id: string;
  name: string;
  file: string;
}

export default function PushNotificationSettings() {
  // Notification categories
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'cpk_alert',
      name: 'CPK Alerts',
      description: 'Cảnh báo khi CPK vượt ngưỡng cấu hình',
      icon: <Gauge className="h-5 w-5" />,
      enabled: true,
      channels: { push: true, email: true, sms: false },
      priority: 'high',
      threshold: 1.33,
      thresholdUnit: 'CPK'
    },
    {
      id: 'oee_alert',
      name: 'OEE Alerts',
      description: 'Cảnh báo hiệu suất thiết bị thấp',
      icon: <Activity className="h-5 w-5" />,
      enabled: true,
      channels: { push: true, email: false, sms: false },
      priority: 'medium',
      threshold: 85,
      thresholdUnit: '%'
    },
    {
      id: 'spc_violation',
      name: 'SPC Rule Violations',
      description: 'Cảnh báo vi phạm 8 SPC Rules',
      icon: <AlertTriangle className="h-5 w-5" />,
      enabled: true,
      channels: { push: true, email: true, sms: false },
      priority: 'high'
    },
    {
      id: 'iot_device',
      name: 'IoT Device Alerts',
      description: 'Cảnh báo thiết bị IoT offline hoặc lỗi',
      icon: <Cpu className="h-5 w-5" />,
      enabled: true,
      channels: { push: true, email: false, sms: false },
      priority: 'medium'
    },
    {
      id: 'escalation',
      name: 'Escalation Alerts',
      description: 'Thông báo leo thang khi cảnh báo không được xử lý',
      icon: <TrendingUp className="h-5 w-5" />,
      enabled: true,
      channels: { push: true, email: true, sms: true },
      priority: 'critical'
    },
    {
      id: 'maintenance',
      name: 'Maintenance Reminders',
      description: 'Nhắc nhở bảo trì định kỳ',
      icon: <Calendar className="h-5 w-5" />,
      enabled: false,
      channels: { push: true, email: false, sms: false },
      priority: 'low'
    },
    {
      id: 'system',
      name: 'System Notifications',
      description: 'Thông báo hệ thống và cập nhật',
      icon: <Server className="h-5 w-5" />,
      enabled: false,
      channels: { push: true, email: false, sms: false },
      priority: 'low'
    },
    {
      id: 'report',
      name: 'Report Ready',
      description: 'Thông báo khi báo cáo đã sẵn sàng',
      icon: <Mail className="h-5 w-5" />,
      enabled: true,
      channels: { push: false, email: true, sms: false },
      priority: 'low'
    }
  ]);

  // Quiet hours settings
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    weekdaysOnly: false,
    allowCritical: true
  });

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('default');
  const [soundVolume, setSoundVolume] = useState(70);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [vibrationPattern, setVibrationPattern] = useState('short');

  // Badge settings
  const [badgeEnabled, setBadgeEnabled] = useState(true);
  const [badgeCount, setBadgeCount] = useState<'all' | 'unread' | 'critical'>('unread');

  // Delivery settings
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [groupInterval, setGroupInterval] = useState(5);
  const [maxPerHour, setMaxPerHour] = useState(20);

  // Available sounds
  const sounds: NotificationSound[] = [
    { id: 'default', name: 'Default', file: 'default.mp3' },
    { id: 'alert', name: 'Alert', file: 'alert.mp3' },
    { id: 'chime', name: 'Chime', file: 'chime.mp3' },
    { id: 'bell', name: 'Bell', file: 'bell.mp3' },
    { id: 'urgent', name: 'Urgent', file: 'urgent.mp3' },
    { id: 'silent', name: 'Silent', file: '' }
  ];

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('push_notification_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.categories) {
          setCategories(prev => prev.map(cat => {
            const savedCat = settings.categories.find((s: any) => s.id === cat.id);
            if (savedCat) {
              return { ...cat, ...savedCat, icon: cat.icon };
            }
            return cat;
          }));
        }
        if (settings.quietHours) setQuietHours(settings.quietHours);
        if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
        if (settings.selectedSound) setSelectedSound(settings.selectedSound);
        if (settings.soundVolume !== undefined) setSoundVolume(settings.soundVolume);
        if (settings.vibrationEnabled !== undefined) setVibrationEnabled(settings.vibrationEnabled);
        if (settings.vibrationPattern) setVibrationPattern(settings.vibrationPattern);
        if (settings.badgeEnabled !== undefined) setBadgeEnabled(settings.badgeEnabled);
        if (settings.badgeCount) setBadgeCount(settings.badgeCount);
        if (settings.groupNotifications !== undefined) setGroupNotifications(settings.groupNotifications);
        if (settings.groupInterval !== undefined) setGroupInterval(settings.groupInterval);
        if (settings.maxPerHour !== undefined) setMaxPerHour(settings.maxPerHour);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  // Toggle category
  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    ));
  };

  // Toggle channel for category
  const toggleChannel = (categoryId: string, channel: 'push' | 'email' | 'sms') => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId
        ? { ...cat, channels: { ...cat.channels, [channel]: !cat.channels[channel] } }
        : cat
    ));
  };

  // Update threshold
  const updateThreshold = (categoryId: string, threshold: number) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, threshold } : cat
    ));
  };

  // Update priority
  const updatePriority = (categoryId: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, priority } : cat
    ));
  };

  // Save settings
  const saveSettings = async () => {
    const settings = {
      categories: categories.map(cat => ({
        id: cat.id,
        enabled: cat.enabled,
        channels: cat.channels,
        priority: cat.priority,
        threshold: cat.threshold
      })),
      quietHours,
      soundEnabled,
      selectedSound,
      soundVolume,
      vibrationEnabled,
      vibrationPattern,
      badgeEnabled,
      badgeCount,
      groupNotifications,
      groupInterval,
      maxPerHour
    };

    localStorage.setItem('push_notification_settings', JSON.stringify(settings));
    
    // TODO: Save to server via tRPC
    // await trpc.notification.saveSettings.mutate(settings);
    
    toast.success('Đã lưu cài đặt thông báo');
  };

  // Test notification
  const sendTestNotification = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Test Notification', {
          body: 'Đây là thông báo test từ CPK/SPC Calculator',
          icon: '/favicon.ico',
          tag: 'test'
        });
        toast.success('Đã gửi thông báo test');
      } else {
        toast.error('Vui lòng cấp quyền thông báo');
      }
    } else {
      toast.error('Trình duyệt không hỗ trợ thông báo');
    }
  };

  // Play test sound
  const playTestSound = () => {
    if (selectedSound !== 'silent') {
      // In real app, play actual sound file
      toast.info(`Playing sound: ${selectedSound}`);
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const enabledCount = categories.filter(c => c.enabled).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BellRing className="h-6 w-6" />
              Push Notification Settings
            </h1>
            <p className="text-muted-foreground">
              Tùy chỉnh loại thông báo và cách nhận thông báo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={sendTestNotification}>
              <Send className="mr-2 h-4 w-4" />
              Test
            </Button>
            <Button onClick={saveSettings}>
              <Save className="mr-2 h-4 w-4" />
              Lưu cài đặt
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Loại thông báo</p>
                  <p className="text-2xl font-bold">{enabledCount}/{categories.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quiet Hours</p>
                  <p className="text-2xl font-bold">{quietHours.enabled ? 'ON' : 'OFF'}</p>
                </div>
                <Moon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Âm thanh</p>
                  <p className="text-2xl font-bold">{soundEnabled ? 'ON' : 'OFF'}</p>
                </div>
                {soundEnabled ? (
                  <Volume2 className="h-8 w-8 text-green-500" />
                ) : (
                  <VolumeX className="h-8 w-8 text-gray-500" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rung</p>
                  <p className="text-2xl font-bold">{vibrationEnabled ? 'ON' : 'OFF'}</p>
                </div>
                <Vibrate className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">
              <Bell className="mr-2 h-4 w-4" />
              Loại thông báo
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <Target className="mr-2 h-4 w-4" />
              Ngưỡng cảnh báo
            </TabsTrigger>
            <TabsTrigger value="quiet">
              <Moon className="mr-2 h-4 w-4" />
              Quiet Hours
            </TabsTrigger>
            <TabsTrigger value="sound">
              <Volume2 className="mr-2 h-4 w-4" />
              Âm thanh & Rung
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Loại thông báo</CardTitle>
                <CardDescription>
                  Bật/tắt và chọn kênh nhận cho từng loại thông báo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {categories.map((category) => (
                    <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 flex-1">
                          <Switch
                            checked={category.enabled}
                            onCheckedChange={() => toggleCategory(category.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={`p-2 rounded-lg ${category.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            {category.icon}
                          </div>
                          <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{category.name}</span>
                              {getPriorityBadge(category.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4 space-y-4">
                          {/* Channels */}
                          <div>
                            <Label className="mb-2 block">Kênh nhận thông báo</Label>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={category.channels.push}
                                  onCheckedChange={() => toggleChannel(category.id, 'push')}
                                  disabled={!category.enabled}
                                />
                                <Label className="flex items-center gap-1">
                                  <Smartphone className="h-4 w-4" />
                                  Push
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={category.channels.email}
                                  onCheckedChange={() => toggleChannel(category.id, 'email')}
                                  disabled={!category.enabled}
                                />
                                <Label className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  Email
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={category.channels.sms}
                                  onCheckedChange={() => toggleChannel(category.id, 'sms')}
                                  disabled={!category.enabled}
                                />
                                <Label className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  SMS
                                </Label>
                              </div>
                            </div>
                          </div>

                          {/* Priority */}
                          <div>
                            <Label className="mb-2 block">Mức độ ưu tiên</Label>
                            <Select
                              value={category.priority}
                              onValueChange={(v) => updatePriority(category.id, v as any)}
                              disabled={!category.enabled}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds">
            <Card>
              <CardHeader>
                <CardTitle>Ngưỡng cảnh báo</CardTitle>
                <CardDescription>
                  Cấu hình ngưỡng kích hoạt cảnh báo cho từng loại
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {categories.filter(c => c.threshold !== undefined).map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {category.icon}
                        <Label>{category.name}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={category.threshold}
                          onChange={(e) => updateThreshold(category.id, parseFloat(e.target.value))}
                          className="w-24"
                          step={category.id === 'cpk_alert' ? 0.01 : 1}
                          disabled={!category.enabled}
                        />
                        <span className="text-sm text-muted-foreground">{category.thresholdUnit}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <Separator />
                  </div>
                ))}

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Gợi ý ngưỡng
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CPK Warning: 1.33 (tiêu chuẩn công nghiệp)</li>
                    <li>• CPK Critical: 1.0 (cần can thiệp ngay)</li>
                    <li>• OEE Warning: 85% (mức tốt)</li>
                    <li>• OEE Critical: 65% (cần cải thiện)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiet Hours Tab */}
          <TabsContent value="quiet">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Quiet Hours
                </CardTitle>
                <CardDescription>
                  Tắt thông báo trong khoảng thời gian nghỉ ngơi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bật Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Tạm dừng thông báo trong khoảng thời gian đã cấu hình
                    </p>
                  </div>
                  <Switch
                    checked={quietHours.enabled}
                    onCheckedChange={(v) => setQuietHours(prev => ({ ...prev, enabled: v }))}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bắt đầu</Label>
                    <Input
                      type="time"
                      value={quietHours.startTime}
                      onChange={(e) => setQuietHours(prev => ({ ...prev, startTime: e.target.value }))}
                      disabled={!quietHours.enabled}
                    />
                  </div>
                  <div>
                    <Label>Kết thúc</Label>
                    <Input
                      type="time"
                      value={quietHours.endTime}
                      onChange={(e) => setQuietHours(prev => ({ ...prev, endTime: e.target.value }))}
                      disabled={!quietHours.enabled}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Chỉ áp dụng ngày trong tuần</Label>
                    <p className="text-sm text-muted-foreground">
                      Không áp dụng vào cuối tuần
                    </p>
                  </div>
                  <Switch
                    checked={quietHours.weekdaysOnly}
                    onCheckedChange={(v) => setQuietHours(prev => ({ ...prev, weekdaysOnly: v }))}
                    disabled={!quietHours.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cho phép thông báo Critical</Label>
                    <p className="text-sm text-muted-foreground">
                      Vẫn nhận thông báo Critical trong Quiet Hours
                    </p>
                  </div>
                  <Switch
                    checked={quietHours.allowCritical}
                    onCheckedChange={(v) => setQuietHours(prev => ({ ...prev, allowCritical: v }))}
                    disabled={!quietHours.enabled}
                  />
                </div>

                {quietHours.enabled && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-500">
                      <Moon className="h-5 w-5" />
                      <span className="font-medium">
                        Quiet Hours: {quietHours.startTime} - {quietHours.endTime}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quietHours.weekdaysOnly ? 'Chỉ ngày trong tuần' : 'Tất cả các ngày'}
                      {quietHours.allowCritical && ' • Cho phép Critical'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sound & Vibration Tab */}
          <TabsContent value="sound">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sound Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Âm thanh
                  </CardTitle>
                  <CardDescription>
                    Cấu hình âm thanh thông báo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label>Bật âm thanh</Label>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Chọn âm thanh</Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSound}
                        onValueChange={setSelectedSound}
                        disabled={!soundEnabled}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sounds.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>
                              {sound.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={playTestSound}
                        disabled={!soundEnabled || selectedSound === 'silent'}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Âm lượng</Label>
                      <span className="text-sm font-medium">{soundVolume}%</span>
                    </div>
                    <Slider
                      value={[soundVolume]}
                      onValueChange={(v) => setSoundVolume(v[0])}
                      min={0}
                      max={100}
                      step={5}
                      disabled={!soundEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Vibration Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Vibrate className="h-5 w-5" />
                    Rung
                  </CardTitle>
                  <CardDescription>
                    Cấu hình rung khi nhận thông báo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label>Bật rung</Label>
                    <Switch
                      checked={vibrationEnabled}
                      onCheckedChange={setVibrationEnabled}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Kiểu rung</Label>
                    <Select
                      value={vibrationPattern}
                      onValueChange={setVibrationPattern}
                      disabled={!vibrationEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Ngắn (1 lần)</SelectItem>
                        <SelectItem value="double">Đôi (2 lần)</SelectItem>
                        <SelectItem value="long">Dài (liên tục)</SelectItem>
                        <SelectItem value="pattern">Pattern (SOS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Badge Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Badge
                  </CardTitle>
                  <CardDescription>
                    Cấu hình badge hiển thị trên icon app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label>Hiển thị badge</Label>
                    <Switch
                      checked={badgeEnabled}
                      onCheckedChange={setBadgeEnabled}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Đếm số lượng</Label>
                    <Select
                      value={badgeCount}
                      onValueChange={(v) => setBadgeCount(v as any)}
                      disabled={!badgeEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả thông báo</SelectItem>
                        <SelectItem value="unread">Chưa đọc</SelectItem>
                        <SelectItem value="critical">Chỉ Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Delivery
                  </CardTitle>
                  <CardDescription>
                    Cấu hình cách gửi thông báo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Gom nhóm thông báo</Label>
                      <p className="text-sm text-muted-foreground">
                        Gom nhiều thông báo cùng loại thành một
                      </p>
                    </div>
                    <Switch
                      checked={groupNotifications}
                      onCheckedChange={setGroupNotifications}
                    />
                  </div>

                  {groupNotifications && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Khoảng cách gom nhóm</Label>
                        <span className="text-sm font-medium">{groupInterval} phút</span>
                      </div>
                      <Slider
                        value={[groupInterval]}
                        onValueChange={(v) => setGroupInterval(v[0])}
                        min={1}
                        max={30}
                        step={1}
                      />
                    </div>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Giới hạn mỗi giờ</Label>
                      <span className="text-sm font-medium">{maxPerHour} thông báo</span>
                    </div>
                    <Slider
                      value={[maxPerHour]}
                      onValueChange={(v) => setMaxPerHour(v[0])}
                      min={5}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Giới hạn số thông báo nhận được mỗi giờ (trừ Critical)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
