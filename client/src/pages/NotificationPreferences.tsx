/**
 * NotificationPreferences - Page for managing notification settings
 * Allows users to configure push notification preferences
 */

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  Shield,
  Activity,
  Cpu,
  Server,
  AlertTriangle,
  CheckCircle,
  Settings,
  Save,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationSoundPreview, NotificationSoundType } from '@/components/NotificationSoundPreview';
import { NotificationSettingsExport, NotificationPreferencesData } from '@/components/NotificationSettingsExport';
import { AlertSoundSettings } from '@/components/AlertSoundSettings';
import { SettingsBackupManager } from '@/components/SettingsBackupManager';
import { toast } from 'sonner';

// Types
interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[];
}

export default function NotificationPreferences() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription,
    showNotification
  } = usePushNotifications();

  // Notification channels
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'spc_alerts',
      name: 'SPC Alerts',
      description: 'Cảnh báo khi CPK/PPK vượt ngưỡng',
      icon: <Activity className="h-5 w-5" />,
      enabled: true,
      priority: 'high'
    },
    {
      id: 'oee_alerts',
      name: 'OEE Alerts',
      description: 'Cảnh báo hiệu suất máy móc',
      icon: <AlertTriangle className="h-5 w-5" />,
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'security_alerts',
      name: 'Security Alerts',
      description: 'Cảnh báo bảo mật và truy cập',
      icon: <Shield className="h-5 w-5" />,
      enabled: true,
      priority: 'critical'
    },
    {
      id: 'iot_alerts',
      name: 'IoT Device Alerts',
      description: 'Cảnh báo thiết bị IoT offline/lỗi',
      icon: <Cpu className="h-5 w-5" />,
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'system_alerts',
      name: 'System Alerts',
      description: 'Cảnh báo hệ thống và server',
      icon: <Server className="h-5 w-5" />,
      enabled: false,
      priority: 'low'
    }
  ]);

  // Sound and vibration settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<NotificationSoundType>('default');
  const [soundVolume, setSoundVolume] = useState(70);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Quiet hours
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  });

  // Email digest settings
  const [emailDigest, setEmailDigest] = useState({
    enabled: true,
    frequency: 'daily'
  });

  // Toggle channel
  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
    ));
  };

  // Update channel priority
  const updateChannelPriority = (channelId: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, priority } : ch
    ));
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      const preferences = {
        channels: channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          enabled: ch.enabled,
          priority: ch.priority
        })),
        soundEnabled,
        soundType,
        soundVolume,
        vibrationEnabled,
        quietHours,
        emailDigest
      };
      
      console.log('Saving preferences:', preferences);
      
      // Store in localStorage as fallback
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));
      
      toast.success('Đã lưu cài đặt thông báo');
    } catch (error) {
      toast.error('Không thể lưu cài đặt');
    }
  };

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.channels) {
          // Merge saved channels with default icons
          setChannels(prev => prev.map(ch => {
            const savedCh = prefs.channels.find((s: any) => s.id === ch.id);
            if (savedCh) {
              return { ...ch, enabled: savedCh.enabled, priority: savedCh.priority };
            }
            return ch;
          }));
        }
        if (prefs.soundEnabled !== undefined) setSoundEnabled(prefs.soundEnabled);
        if (prefs.soundType) setSoundType(prefs.soundType);
        if (prefs.soundVolume !== undefined) setSoundVolume(prefs.soundVolume);
        if (prefs.vibrationEnabled !== undefined) setVibrationEnabled(prefs.vibrationEnabled);
        if (prefs.quietHours) setQuietHours(prefs.quietHours);
        if (prefs.emailDigest) setEmailDigest(prefs.emailDigest);
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  }, []);

  // Handle import settings
  const handleImportSettings = useCallback((settings: Partial<NotificationPreferencesData>) => {
    if (settings.channels) {
      setChannels(prev => prev.map(ch => {
        const importedCh = settings.channels?.find(s => s.id === ch.id);
        if (importedCh) {
          return { ...ch, enabled: importedCh.enabled, priority: importedCh.priority };
        }
        return ch;
      }));
    }
    if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
    if (settings.soundType) setSoundType(settings.soundType as NotificationSoundType);
    if (settings.soundVolume !== undefined) setSoundVolume(settings.soundVolume);
    if (settings.vibrationEnabled !== undefined) setVibrationEnabled(settings.vibrationEnabled);
    if (settings.quietHours) setQuietHours(settings.quietHours);
    if (settings.emailDigest) setEmailDigest(settings.emailDigest);
    
    // Auto-save after import
    setTimeout(() => savePreferences(), 100);
  }, []);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Quản lý cài đặt thông báo và cảnh báo
            </p>
          </div>
          <Button onClick={savePreferences}>
            <Save className="mr-2 h-4 w-4" />
            Lưu cài đặt
          </Button>
        </div>

        {/* Push Notification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Nhận thông báo trực tiếp trên thiết bị của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm">Trình duyệt của bạn không hỗ trợ push notifications</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSubscribed ? (
                      <Bell className="h-5 w-5 text-green-500" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isSubscribed ? 'Push notifications đang bật' : 'Push notifications đang tắt'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Permission: {permission}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isSubscribed ? 'outline' : 'default'}
                    onClick={toggleSubscription}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : isSubscribed ? (
                      <BellOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Bell className="mr-2 h-4 w-4" />
                    )}
                    {isSubscribed ? 'Tắt' : 'Bật'}
                  </Button>
                </div>

                {permission === 'denied' && (
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-sm">
                      Notifications bị chặn. Vui lòng cho phép trong cài đặt trình duyệt.
                    </span>
                  </div>
                )}

                {/* Test Notification Section */}
                {isSubscribed && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">Test Notification</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gửi thông báo test để kiểm tra cài đặt của bạn
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            showNotification('spc_alert', 'SPC Alert Test', 'Đây là thông báo test cho SPC alerts');
                            toast.success('Đã gửi test notification SPC');
                          }}
                        >
                          <Activity className="mr-1 h-3 w-3" />
                          Test SPC
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            showNotification('oee_alert', 'OEE Alert Test', 'Đây là thông báo test cho OEE alerts');
                            toast.success('Đã gửi test notification OEE');
                          }}
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Test OEE
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            showNotification('security_alert', 'Security Alert Test', 'Đây là thông báo test cho Security alerts');
                            toast.success('Đã gửi test notification Security');
                          }}
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Test Security
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            showNotification('iot_alert', 'IoT Alert Test', 'Đây là thông báo test cho IoT alerts');
                            toast.success('Đã gửi test notification IoT');
                          }}
                        >
                          <Cpu className="mr-1 h-3 w-3" />
                          Test IoT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            showNotification('system_alert', 'System Alert Test', 'Đây là thông báo test cho System alerts');
                            toast.success('Đã gửi test notification System');
                          }}
                        >
                          <Server className="mr-1 h-3 w-3" />
                          Test System
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Chọn loại thông báo bạn muốn nhận
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                    {channel.icon}
                  </div>
                  <div>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Select
                    value={channel.priority}
                    onValueChange={(value: any) => updateChannelPriority(channel.id, value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sound Preview - New Component */}
        <NotificationSoundPreview
          selectedSound={soundType}
          onSoundChange={setSoundType}
          volume={soundVolume}
          onVolumeChange={setSoundVolume}
        />

        {/* Sound & Vibration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Sound & Vibration
            </CardTitle>
            <CardDescription>
              Cài đặt âm thanh và rung cho thông báo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Âm thanh thông báo</p>
                  <p className="text-sm text-muted-foreground">Phát âm thanh khi có thông báo mới</p>
                </div>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-5 w-5" />
                <div>
                  <p className="font-medium">Rung</p>
                  <p className="text-sm text-muted-foreground">Rung thiết bị khi có thông báo</p>
                </div>
              </div>
              <Switch
                checked={vibrationEnabled}
                onCheckedChange={setVibrationEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Tắt thông báo trong khoảng thời gian nhất định
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bật Quiet Hours</p>
                <p className="text-sm text-muted-foreground">
                  Chỉ nhận thông báo critical trong thời gian này
                </p>
              </div>
              <Switch
                checked={quietHours.enabled}
                onCheckedChange={(enabled) => setQuietHours(prev => ({ ...prev, enabled }))}
              />
            </div>

            {quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bắt đầu</Label>
                  <input
                    type="time"
                    value={quietHours.startTime}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kết thúc</Label>
                  <input
                    type="time"
                    value={quietHours.endTime}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Digest */}
        <Card>
          <CardHeader>
            <CardTitle>Email Digest</CardTitle>
            <CardDescription>
              Nhận tóm tắt thông báo qua email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bật Email Digest</p>
                <p className="text-sm text-muted-foreground">
                  Nhận email tóm tắt các thông báo
                </p>
              </div>
              <Switch
                checked={emailDigest.enabled}
                onCheckedChange={(enabled) => setEmailDigest(prev => ({ ...prev, enabled }))}
              />
            </div>

            {emailDigest.enabled && (
              <div className="space-y-2">
                <Label>Tần suất</Label>
                <Select
                  value={emailDigest.frequency}
                  onValueChange={(value) => setEmailDigest(prev => ({ ...prev, frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Realtime</SelectItem>
                    <SelectItem value="hourly">Mỗi giờ</SelectItem>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Sound Settings - Per Alert Type */}
        <AlertSoundSettings />

        {/* Export/Import Settings - New Component */}
        <NotificationSettingsExport
          channels={channels.map(ch => ({
            id: ch.id,
            name: ch.name,
            enabled: ch.enabled,
            priority: ch.priority
          }))}
          soundEnabled={soundEnabled}
          soundType={soundType}
          soundVolume={soundVolume}
          vibrationEnabled={vibrationEnabled}
          quietHours={quietHours}
          emailDigest={emailDigest}
          onImport={handleImportSettings}
        />

        {/* Settings Backup Manager */}
        <SettingsBackupManager />
      </div>
    </DashboardLayout>
  );
}
