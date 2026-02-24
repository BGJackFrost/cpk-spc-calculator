/**
 * AlertSoundSettings - Component for configuring sounds per alert type
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
  Activity,
  Gauge,
  Server,
  Bell,
  AlertTriangle,
  TrendingDown,
  ArrowRightLeft,
  XCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  Save
} from 'lucide-react';
import { alertSoundService, AlertType, AlertSoundPreferences } from '@/services/alertSoundService';
import { toast } from 'sonner';

interface AlertSoundSettingsProps {
  className?: string;
}

// Icon mapping for alert types
const ALERT_ICONS: Record<string, React.ReactNode> = {
  cpk_low: <TrendingDown className="h-4 w-4 text-orange-500" />,
  cpk_critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  rule_violation: <XCircle className="h-4 w-4 text-red-500" />,
  trend_detected: <Activity className="h-4 w-4 text-yellow-500" />,
  shift_detected: <ArrowRightLeft className="h-4 w-4 text-yellow-500" />,
  out_of_spec: <AlertTriangle className="h-4 w-4 text-red-500" />,
  availability_low: <Gauge className="h-4 w-4 text-orange-500" />,
  performance_low: <Activity className="h-4 w-4 text-orange-500" />,
  quality_low: <CheckCircle className="h-4 w-4 text-orange-500" />,
  oee_critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  downtime_start: <Server className="h-4 w-4 text-yellow-500" />,
  downtime_extended: <Server className="h-4 w-4 text-red-500" />,
  connection_lost: <WifiOff className="h-4 w-4 text-red-500" />,
  connection_restored: <Wifi className="h-4 w-4 text-green-500" />,
  sync_conflict: <RefreshCw className="h-4 w-4 text-orange-500" />,
  sync_complete: <CheckCircle className="h-4 w-4 text-green-500" />,
  backup_complete: <Save className="h-4 w-4 text-green-500" />,
  general: <Bell className="h-4 w-4" />
};

export function AlertSoundSettings({ className = '' }: AlertSoundSettingsProps) {
  const [preferences, setPreferences] = useState<AlertSoundPreferences>(
    alertSoundService.getPreferences()
  );
  const [playingAlert, setPlayingAlert] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences on mount
  useEffect(() => {
    setPreferences(alertSoundService.getPreferences());
  }, []);

  // Update global enabled
  const handleGlobalEnabledChange = useCallback((enabled: boolean) => {
    alertSoundService.savePreferences({ enabled });
    setPreferences(alertSoundService.getPreferences());
    toast.success(enabled ? 'Đã bật âm thanh cảnh báo' : 'Đã tắt âm thanh cảnh báo');
  }, []);

  // Update global volume
  const handleGlobalVolumeChange = useCallback((volume: number) => {
    alertSoundService.savePreferences({ globalVolume: volume });
    setPreferences(alertSoundService.getPreferences());
  }, []);

  // Toggle alert enabled
  const handleAlertEnabledChange = useCallback((alertType: AlertType, enabled: boolean) => {
    alertSoundService.setAlertEnabled(alertType, enabled);
    setPreferences(alertSoundService.getPreferences());
  }, []);

  // Update alert volume
  const handleAlertVolumeChange = useCallback((alertType: AlertType, volume: number) => {
    alertSoundService.setAlertVolume(alertType, volume);
    setPreferences(alertSoundService.getPreferences());
  }, []);

  // Reset alert to default
  const handleResetAlert = useCallback((alertType: AlertType) => {
    alertSoundService.resetAlertToDefault(alertType);
    setPreferences(alertSoundService.getPreferences());
    toast.success('Đã reset về mặc định');
  }, []);

  // Reset all to defaults
  const handleResetAll = useCallback(() => {
    alertSoundService.resetAllToDefaults();
    setPreferences(alertSoundService.getPreferences());
    toast.success('Đã reset tất cả về mặc định');
  }, []);

  // Play alert sound with animation
  const handlePlaySound = useCallback((alertType: AlertType) => {
    // Clear any existing timeout
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
    
    setPlayingAlert(alertType);
    alertSoundService.playAlertSound(alertType);
    
    // Reset after sound plays
    playTimeoutRef.current = setTimeout(() => {
      setPlayingAlert(null);
    }, 1500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  // Get alert types grouped by category
  const alertTypes = alertSoundService.getAlertTypes();
  const groupedAlerts = alertTypes.reduce((acc, alert) => {
    if (!acc[alert.category]) {
      acc[alert.category] = [];
    }
    acc[alert.category].push(alert);
    return acc;
  }, {} as Record<string, typeof alertTypes>);

  // Check if alert has custom settings
  const hasCustomSettings = (alertType: AlertType): boolean => {
    return !!preferences.alertOverrides[alertType];
  };

  // Get effective enabled state for alert
  const isAlertEnabled = (alertType: AlertType): boolean => {
    if (!preferences.enabled) return false;
    const override = preferences.alertOverrides[alertType];
    return override?.enabled !== false;
  };

  // Get effective volume for alert
  const getAlertVolume = (alertType: AlertType): number => {
    const override = preferences.alertOverrides[alertType];
    return override?.volume ?? preferences.globalVolume;
  };

  // Test all sounds in sequence
  const handleTestAllSounds = useCallback(async () => {
    if (testingAll) return;
    
    setTestingAll(true);
    const enabledAlerts = alertTypes.filter(alert => {
      if (!preferences.enabled) return false;
      const override = preferences.alertOverrides[alert.type];
      return override?.enabled !== false;
    });
    
    for (let i = 0; i < enabledAlerts.length; i++) {
      const alert = enabledAlerts[i];
      setPlayingAlert(alert.type);
      alertSoundService.playAlertSound(alert.type);
      
      // Wait for sound to finish before playing next
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    setPlayingAlert(null);
    setTestingAll(false);
    toast.success(`Đã test ${enabledAlerts.length} âm thanh cảnh báo`);
  }, [testingAll, alertTypes, preferences]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Alert Sound Settings
            </CardTitle>
            <CardDescription>
              Cấu hình âm thanh cho từng loại cảnh báo SPC/OEE
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestAllSounds}
              disabled={testingAll || !preferences.enabled}
            >
              {testingAll ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {testingAll ? 'Testing...' : 'Test All'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Settings */}
        <div className="p-4 bg-muted rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preferences.enabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Âm thanh cảnh báo</p>
                <p className="text-sm text-muted-foreground">
                  Bật/tắt tất cả âm thanh cảnh báo
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={handleGlobalEnabledChange}
            />
          </div>

          {preferences.enabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Âm lượng chung: {preferences.globalVolume}%</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    alertSoundService.previewSound(
                      { frequency: 800, duration: 200, pattern: [800, 1000] },
                      preferences.globalVolume
                    );
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Test
                </Button>
              </div>
              <Slider
                value={[preferences.globalVolume]}
                onValueChange={([v]) => handleGlobalVolumeChange(v)}
                max={100}
                step={5}
              />
            </div>
          )}
        </div>

        {/* Alert Categories */}
        {preferences.enabled && (
          <Tabs defaultValue="SPC" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="SPC">SPC</TabsTrigger>
              <TabsTrigger value="OEE">OEE</TabsTrigger>
              <TabsTrigger value="System">System</TabsTrigger>
              <TabsTrigger value="General">General</TabsTrigger>
            </TabsList>

            {Object.entries(groupedAlerts).map(([category, alerts]) => (
              <TabsContent key={category} value={category} className="space-y-2">
                <Accordion type="multiple" className="w-full">
                  {alerts.map((alert) => (
                    <AccordionItem key={alert.type} value={alert.type}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`transition-transform duration-200 ${
                            playingAlert === alert.type ? 'scale-125 animate-pulse' : ''
                          }`}>
                            {ALERT_ICONS[alert.type] || <Bell className="h-4 w-4" />}
                          </div>
                          <span className="text-sm font-medium">{alert.name}</span>
                          
                          {/* Quick Test Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySound(alert.type);
                            }}
                            disabled={!isAlertEnabled(alert.type) || playingAlert === alert.type}
                          >
                            {playingAlert === alert.type ? (
                              <Volume2 className="h-3 w-3 animate-pulse text-primary" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          
                          <div className="flex items-center gap-2 ml-auto mr-4">
                            {hasCustomSettings(alert.type) && (
                              <Badge variant="outline" className="text-xs">
                                Custom
                              </Badge>
                            )}
                            <Badge 
                              variant={isAlertEnabled(alert.type) ? 'default' : 'secondary'}
                              className={`text-xs transition-colors ${
                                playingAlert === alert.type ? 'bg-primary animate-pulse' : ''
                              }`}
                            >
                              {playingAlert === alert.type ? 'Playing' : isAlertEnabled(alert.type) ? 'ON' : 'OFF'}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Enable/Disable */}
                          <div className="flex items-center justify-between">
                            <Label>Bật âm thanh</Label>
                            <Switch
                              checked={isAlertEnabled(alert.type)}
                              onCheckedChange={(enabled) => 
                                handleAlertEnabledChange(alert.type, enabled)
                              }
                            />
                          </div>

                          {/* Volume */}
                          {isAlertEnabled(alert.type) && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Âm lượng: {getAlertVolume(alert.type)}%</Label>
                              </div>
                              <Slider
                                value={[getAlertVolume(alert.type)]}
                                onValueChange={([v]) => 
                                  handleAlertVolumeChange(alert.type, v)
                                }
                                max={100}
                                step={5}
                              />
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlaySound(alert.type)}
                              disabled={!isAlertEnabled(alert.type) || playingAlert === alert.type}
                              className={`transition-all ${
                                playingAlert === alert.type 
                                  ? 'bg-primary text-primary-foreground border-primary' 
                                  : ''
                              }`}
                            >
                              {playingAlert === alert.type ? (
                                <>
                                  <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
                                  <span className="animate-pulse">Playing...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 mr-1" />
                                  Preview Sound
                                </>
                              )}
                            </Button>
                            {hasCustomSettings(alert.type) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetAlert(alert.type)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Lưu ý:</strong> Âm thanh cảnh báo sẽ phát khi có thông báo realtime từ hệ thống.
            Đảm bảo trình duyệt cho phép phát âm thanh để nhận cảnh báo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertSoundSettings;
