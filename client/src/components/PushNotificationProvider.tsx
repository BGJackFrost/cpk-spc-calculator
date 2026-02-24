import { useEffect, useRef, createContext, useContext, useState, ReactNode } from 'react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Bell, BellOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PushNotificationContextType {
  isEnabled: boolean;
  permission: NotificationPermission;
  enableNotifications: () => Promise<boolean>;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}

interface NotificationSettings {
  criticalAlerts: boolean;
  warningAlerts: boolean;
  infoAlerts: boolean;
  soundEnabled: boolean;
}

const defaultSettings: NotificationSettings = {
  criticalAlerts: true,
  warningAlerts: true,
  infoAlerts: false,
  soundEnabled: true,
};

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return context;
}

interface Props {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: Props) {
  const { 
    isSupported, 
    permission, 
    requestPermission, 
    showCriticalAlert, 
    showWarningAlert,
    showNotification 
  } = usePushNotification();
  
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('pushNotificationSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const lastAlertIdRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for alert sound
  useEffect(() => {
    audioRef.current = new Audio('/alert-sound.mp3');
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pushNotificationSettings', JSON.stringify(settings));
  }, [settings]);

  // Subscribe to SSE for real-time alerts
  useEffect(() => {
    if (permission !== 'granted') return;

    const eventSource = new EventSource('/api/sse');

    eventSource.addEventListener('predictive_alert', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Avoid duplicate notifications
        if (data.alertId && data.alertId <= lastAlertIdRef.current) return;
        if (data.alertId) lastAlertIdRef.current = data.alertId;

        const { severity, message, details } = data;

        // Check settings before showing notification
        if (severity === 'critical' && settings.criticalAlerts) {
          showCriticalAlert(message, details);
          if (settings.soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        } else if (severity === 'warning' && settings.warningAlerts) {
          showWarningAlert(message, details);
        } else if (severity === 'info' && settings.infoAlerts) {
          showNotification('ℹ️ Thông tin - SPC System', {
            body: message,
            tag: 'info-alert',
          });
        }
      } catch (error) {
        console.error('Error processing SSE alert:', error);
      }
    });

    eventSource.addEventListener('cpk_alert', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.cpk < 1.0 && settings.criticalAlerts) {
          showCriticalAlert(`CPK thấp nghiêm trọng: ${data.cpk.toFixed(2)}`, {
            productionLine: data.productionLine,
            metric: 'CPK',
            value: data.cpk,
            threshold: 1.0,
          });
          if (settings.soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        } else if (data.cpk < 1.33 && settings.warningAlerts) {
          showWarningAlert(`CPK cần cải thiện: ${data.cpk.toFixed(2)}`, {
            productionLine: data.productionLine,
            metric: 'CPK',
            value: data.cpk,
          });
        }
      } catch (error) {
        console.error('Error processing CPK alert:', error);
      }
    });

    eventSource.onerror = () => {
      console.log('SSE connection error, will reconnect...');
    };

    return () => {
      eventSource.close();
    };
  }, [permission, settings, showCriticalAlert, showWarningAlert, showNotification]);

  const enableNotifications = async () => {
    const granted = await requestPermission();
    return granted;
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const contextValue: PushNotificationContextType = {
    isEnabled: permission === 'granted',
    permission,
    enableNotifications,
    settings,
    updateSettings,
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
}

// Notification Settings Dialog Component
export function NotificationSettingsDialog() {
  const { isEnabled, permission, enableNotifications, settings, updateSettings } = usePushNotificationContext();
  const [open, setOpen] = useState(false);

  const handleEnableClick = async () => {
    const success = await enableNotifications();
    if (success) {
      toast.success('Đã bật thông báo trình duyệt');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {isEnabled && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Cài đặt thông báo trình duyệt
          </DialogTitle>
          <DialogDescription>
            Nhận thông báo cảnh báo nghiêm trọng ngay trên trình duyệt
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Trạng thái</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' 
                  ? 'Đã bật thông báo' 
                  : permission === 'denied'
                  ? 'Đã từ chối (cần bật trong cài đặt trình duyệt)'
                  : 'Chưa bật thông báo'}
              </p>
            </div>
            {permission !== 'granted' && permission !== 'denied' && (
              <Button onClick={handleEnableClick}>
                Bật thông báo
              </Button>
            )}
            {permission === 'granted' && (
              <span className="flex items-center gap-1 text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Đang hoạt động
              </span>
            )}
          </div>

          {/* Notification Types */}
          {isEnabled && (
            <div className="space-y-4">
              <h4 className="font-medium">Loại thông báo</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="critical" className="flex flex-col">
                  <span>Cảnh báo nghiêm trọng</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    CPK &lt; 1.0, OEE &lt; 50%
                  </span>
                </Label>
                <Switch
                  id="critical"
                  checked={settings.criticalAlerts}
                  onCheckedChange={(checked) => updateSettings({ criticalAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="warning" className="flex flex-col">
                  <span>Cảnh báo</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    CPK &lt; 1.33, xu hướng giảm
                  </span>
                </Label>
                <Switch
                  id="warning"
                  checked={settings.warningAlerts}
                  onCheckedChange={(checked) => updateSettings({ warningAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="info" className="flex flex-col">
                  <span>Thông tin</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    Cập nhật trạng thái, hoàn thành phân tích
                  </span>
                </Label>
                <Switch
                  id="info"
                  checked={settings.infoAlerts}
                  onCheckedChange={(checked) => updateSettings({ infoAlerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Label htmlFor="sound" className="flex flex-col">
                  <span>Âm thanh cảnh báo</span>
                  <span className="text-sm text-muted-foreground font-normal">
                    Phát âm thanh khi có cảnh báo nghiêm trọng
                  </span>
                </Label>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                />
              </div>
            </div>
          )}

          {/* Test Notification */}
          {isEnabled && (
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  new Notification('🔔 Test thông báo - SPC System', {
                    body: 'Thông báo đang hoạt động bình thường!',
                    icon: '/favicon.ico',
                  });
                  toast.success('Đã gửi thông báo test');
                }}
              >
                Gửi thông báo test
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
