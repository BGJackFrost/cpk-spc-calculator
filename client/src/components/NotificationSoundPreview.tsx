/**
 * NotificationSoundPreview - Component for previewing notification sounds
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  Bell,
  AlertTriangle,
  Shield,
  Cpu,
  Server,
  Activity
} from 'lucide-react';

// Sound types
export type NotificationSoundType = 
  | 'default'
  | 'chime'
  | 'alert'
  | 'warning'
  | 'critical'
  | 'success'
  | 'message'
  | 'none';

interface SoundOption {
  id: NotificationSoundType;
  name: string;
  description: string;
  icon: React.ReactNode;
  frequency?: number; // Hz for generating tone
  duration?: number; // ms
  pattern?: number[]; // For complex sounds
}

// Sound options
const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'default',
    name: 'Mặc định',
    description: 'Âm thanh thông báo chuẩn',
    icon: <Bell className="h-4 w-4" />,
    frequency: 800,
    duration: 200
  },
  {
    id: 'chime',
    name: 'Chime',
    description: 'Âm thanh nhẹ nhàng',
    icon: <Activity className="h-4 w-4" />,
    frequency: 1000,
    duration: 150,
    pattern: [1000, 1200, 1400]
  },
  {
    id: 'alert',
    name: 'Alert',
    description: 'Âm thanh cảnh báo',
    icon: <AlertTriangle className="h-4 w-4" />,
    frequency: 600,
    duration: 300,
    pattern: [600, 600, 600]
  },
  {
    id: 'warning',
    name: 'Warning',
    description: 'Âm thanh cảnh báo mạnh',
    icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    frequency: 400,
    duration: 400,
    pattern: [400, 500, 400, 500]
  },
  {
    id: 'critical',
    name: 'Critical',
    description: 'Âm thanh khẩn cấp',
    icon: <Shield className="h-4 w-4 text-red-500" />,
    frequency: 300,
    duration: 500,
    pattern: [300, 400, 300, 400, 300]
  },
  {
    id: 'success',
    name: 'Success',
    description: 'Âm thanh thành công',
    icon: <Check className="h-4 w-4 text-green-500" />,
    frequency: 1200,
    duration: 100,
    pattern: [800, 1000, 1200]
  },
  {
    id: 'message',
    name: 'Message',
    description: 'Âm thanh tin nhắn',
    icon: <Cpu className="h-4 w-4" />,
    frequency: 900,
    duration: 100,
    pattern: [900, 1100]
  },
  {
    id: 'none',
    name: 'Không âm thanh',
    description: 'Tắt âm thanh thông báo',
    icon: <VolumeX className="h-4 w-4 text-muted-foreground" />
  }
];

interface NotificationSoundPreviewProps {
  selectedSound: NotificationSoundType;
  onSoundChange: (sound: NotificationSoundType) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  className?: string;
}

export function NotificationSoundPreview({
  selectedSound,
  onSoundChange,
  volume,
  onVolumeChange,
  className = ''
}: NotificationSoundPreviewProps) {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a tone
  const playTone = useCallback((frequency: number, duration: number, vol: number) => {
    const audioContext = getAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Normalize volume (0-100 to 0-1)
    const normalizedVolume = vol / 100;
    gainNode.gain.setValueAtTime(normalizedVolume * 0.3, audioContext.currentTime);
    
    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    return oscillator;
  }, [getAudioContext]);

  // Play sound pattern
  const playSound = useCallback(async (soundId: NotificationSoundType) => {
    if (soundId === 'none') return;
    
    const sound = SOUND_OPTIONS.find(s => s.id === soundId);
    if (!sound || !sound.frequency) return;

    setIsPlaying(soundId);

    try {
      if (sound.pattern && sound.pattern.length > 0) {
        // Play pattern
        for (let i = 0; i < sound.pattern.length; i++) {
          await new Promise<void>((resolve) => {
            playTone(sound.pattern![i], sound.duration || 150, volume);
            setTimeout(resolve, (sound.duration || 150) + 50);
          });
        }
      } else {
        // Play single tone
        playTone(sound.frequency, sound.duration || 200, volume);
        await new Promise(resolve => setTimeout(resolve, sound.duration || 200));
      }
    } finally {
      setIsPlaying(null);
    }
  }, [playTone, volume]);

  // Stop playing
  const stopPlaying = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      oscillatorRef.current = null;
    }
    setIsPlaying(null);
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Notification Sound Preview
        </CardTitle>
        <CardDescription>
          Chọn và nghe thử âm thanh thông báo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Âm lượng: {volume}%
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVolumeChange(volume === 0 ? 70 : 0)}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Slider
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            max={100}
            step={5}
            disabled={selectedSound === 'none'}
          />
        </div>

        {/* Sound Options */}
        <RadioGroup
          value={selectedSound}
          onValueChange={(value) => onSoundChange(value as NotificationSoundType)}
          className="space-y-2"
        >
          {SOUND_OPTIONS.map((sound) => (
            <div
              key={sound.id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                selectedSound === sound.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={sound.id} id={sound.id} />
                <Label 
                  htmlFor={sound.id} 
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div className={`p-2 rounded-lg ${
                    selectedSound === sound.id ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {sound.icon}
                  </div>
                  <div>
                    <p className="font-medium">{sound.name}</p>
                    <p className="text-sm text-muted-foreground">{sound.description}</p>
                  </div>
                </Label>
              </div>
              
              {sound.id !== 'none' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isPlaying === sound.id) {
                      stopPlaying();
                    } else {
                      playSound(sound.id);
                    }
                  }}
                  disabled={isPlaying !== null && isPlaying !== sound.id}
                >
                  {isPlaying === sound.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>

        {/* Preview Selected */}
        {selectedSound !== 'none' && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                Đã chọn: <strong>{SOUND_OPTIONS.find(s => s.id === selectedSound)?.name}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSound(selectedSound)}
              disabled={isPlaying !== null}
            >
              <Play className="mr-1 h-3 w-3" />
              Nghe thử
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for playing notification sounds
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playNotificationSound = useCallback((
    soundType: NotificationSoundType,
    volume: number = 70
  ) => {
    if (soundType === 'none') return;

    const sound = SOUND_OPTIONS.find(s => s.id === soundType);
    if (!sound || !sound.frequency) return;

    const audioContext = getAudioContext();
    const normalizedVolume = volume / 100;

    const playTone = (frequency: number, duration: number, startTime: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(normalizedVolume * 0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration / 1000);
    };

    const currentTime = audioContext.currentTime;
    
    if (sound.pattern && sound.pattern.length > 0) {
      let time = currentTime;
      sound.pattern.forEach((freq) => {
        playTone(freq, sound.duration || 150, time);
        time += (sound.duration || 150) / 1000 + 0.05;
      });
    } else {
      playTone(sound.frequency, sound.duration || 200, currentTime);
    }
  }, [getAudioContext]);

  return { playNotificationSound };
}

export default NotificationSoundPreview;
