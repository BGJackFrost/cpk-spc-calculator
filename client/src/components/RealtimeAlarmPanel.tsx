/**
 * Realtime Alarm Panel Component
 * Hiển thị và quản lý các cảnh báo SPC realtime
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, Bell, BellOff, CheckCircle, Clock, 
  Volume2, VolumeX, X, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Alarm {
  id: string;
  timestamp: Date;
  machineId: number;
  machineName: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'spc_violation' | 'cpk_low' | 'out_of_spec' | 'trend' | 'shift';
  rule?: string;
  message: string;
  value?: number;
  limit?: number;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

interface RealtimeAlarmPanelProps {
  alarms: Alarm[];
  onAcknowledge: (alarmId: string) => void;
  onAcknowledgeAll: () => void;
  onClear: (alarmId: string) => void;
  className?: string;
}

export function RealtimeAlarmPanel({
  alarms,
  onAcknowledge,
  onAcknowledgeAll,
  onClear,
  className,
}: RealtimeAlarmPanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevAlarmCountRef = useRef(0);

  // Play alarm sound when new alarm arrives
  useEffect(() => {
    const unacknowledgedCount = alarms.filter(a => !a.acknowledged).length;
    
    if (soundEnabled && unacknowledgedCount > prevAlarmCountRef.current) {
      playAlarmSound();
    }
    
    prevAlarmCountRef.current = unacknowledgedCount;
  }, [alarms, soundEnabled]);

  const playAlarmSound = () => {
    // Create audio context for alarm sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const filteredAlarms = alarms.filter(alarm => {
    if (filter === 'unacknowledged') return !alarm.acknowledged;
    return true;
  });

  const unacknowledgedCount = alarms.filter(a => !a.acknowledged).length;
  const criticalCount = alarms.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'spc_violation': return 'Vi phạm SPC Rule';
      case 'cpk_low': return 'CPK thấp';
      case 'out_of_spec': return 'Ngoài giới hạn';
      case 'trend': return 'Xu hướng bất thường';
      case 'shift': return 'Dịch chuyển trung bình';
      default: return type;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className={cn(
                "w-5 h-5",
                criticalCount > 0 && "text-red-500 animate-pulse"
              )} />
              Cảnh báo Realtime
            </CardTitle>
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unacknowledgedCount} mới
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {expanded && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="filter-unack"
                  checked={filter === 'unacknowledged'}
                  onCheckedChange={(checked) => setFilter(checked ? 'unacknowledged' : 'all')}
                />
                <Label htmlFor="filter-unack" className="text-sm">
                  Chỉ hiện chưa xác nhận
                </Label>
              </div>
            </div>
            
            {unacknowledgedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAcknowledgeAll}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Xác nhận tất cả
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {filteredAlarms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Không có cảnh báo nào</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredAlarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      alarm.acknowledged 
                        ? "bg-muted/50 opacity-60" 
                        : alarm.severity === 'critical'
                          ? "bg-red-500/10 border-red-500/50"
                          : alarm.severity === 'warning'
                            ? "bg-yellow-500/10 border-yellow-500/50"
                            : "bg-blue-500/10 border-blue-500/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Badge className={getSeverityColor(alarm.severity)}>
                          {getSeverityIcon(alarm.severity)}
                        </Badge>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{alarm.machineName}</span>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(alarm.type)}
                            </Badge>
                            {alarm.rule && (
                              <Badge variant="secondary" className="text-xs">
                                {alarm.rule}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm mt-1">{alarm.message}</p>
                          
                          {alarm.value !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Giá trị: <span className="font-mono">{alarm.value.toFixed(3)}</span>
                              {alarm.limit !== undefined && (
                                <> | Giới hạn: <span className="font-mono">{alarm.limit.toFixed(3)}</span></>
                              )}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatTime(alarm.timestamp)}
                            
                            {alarm.acknowledged && alarm.acknowledgedBy && (
                              <span className="ml-2">
                                • Đã xác nhận bởi {alarm.acknowledgedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!alarm.acknowledged && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onAcknowledge(alarm.id)}
                            title="Xác nhận"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onClear(alarm.id)}
                          title="Xóa"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
      
      {/* Flashing indicator for critical alarms */}
      {criticalCount > 0 && (
        <div className="absolute top-0 right-0 w-3 h-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
      )}
    </Card>
  );
}

export default RealtimeAlarmPanel;
