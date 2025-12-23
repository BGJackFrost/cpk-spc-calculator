/**
 * NotificationSettingsExport - Component for exporting/importing notification settings
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Upload,
  FileJson,
  Check,
  X,
  AlertTriangle,
  FileCheck,
  Clock,
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Types
export interface NotificationChannel {
  id: string;
  name: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: string[];
}

export interface EmailDigest {
  enabled: boolean;
  frequency: string;
}

export interface NotificationPreferencesData {
  version: string;
  exportedAt: number;
  channels: NotificationChannel[];
  soundEnabled: boolean;
  soundType: string;
  soundVolume: number;
  vibrationEnabled: boolean;
  quietHours: QuietHours;
  emailDigest: EmailDigest;
}

interface NotificationSettingsExportProps {
  // Current settings
  channels: NotificationChannel[];
  soundEnabled: boolean;
  soundType: string;
  soundVolume: number;
  vibrationEnabled: boolean;
  quietHours: QuietHours;
  emailDigest: EmailDigest;
  // Callbacks
  onImport: (settings: Partial<NotificationPreferencesData>) => void;
  className?: string;
}

const CURRENT_VERSION = '1.0.0';

export function NotificationSettingsExport({
  channels,
  soundEnabled,
  soundType,
  soundVolume,
  vibrationEnabled,
  quietHours,
  emailDigest,
  onImport,
  className = ''
}: NotificationSettingsExportProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<NotificationPreferencesData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export settings to JSON file
  const handleExport = useCallback(() => {
    const exportData: NotificationPreferencesData = {
      version: CURRENT_VERSION,
      exportedAt: Date.now(),
      channels,
      soundEnabled,
      soundType,
      soundVolume,
      vibrationEnabled,
      quietHours,
      emailDigest
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất cài đặt thông báo');
  }, [channels, soundEnabled, soundType, soundVolume, vibrationEnabled, quietHours, emailDigest]);

  // Validate imported data
  const validateImportData = useCallback((data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check required fields
    if (!data.version) {
      errors.push('Thiếu thông tin phiên bản');
    }

    if (!data.channels || !Array.isArray(data.channels)) {
      errors.push('Thiếu hoặc sai định dạng channels');
    } else {
      // Validate each channel
      data.channels.forEach((ch: any, index: number) => {
        if (!ch.id) errors.push(`Channel ${index + 1}: thiếu id`);
        if (typeof ch.enabled !== 'boolean') errors.push(`Channel ${index + 1}: enabled phải là boolean`);
        if (!['low', 'medium', 'high', 'critical'].includes(ch.priority)) {
          errors.push(`Channel ${index + 1}: priority không hợp lệ`);
        }
      });
    }

    if (typeof data.soundEnabled !== 'boolean') {
      errors.push('soundEnabled phải là boolean');
    }

    if (typeof data.soundVolume !== 'number' || data.soundVolume < 0 || data.soundVolume > 100) {
      errors.push('soundVolume phải là số từ 0-100');
    }

    if (data.quietHours) {
      if (typeof data.quietHours.enabled !== 'boolean') {
        errors.push('quietHours.enabled phải là boolean');
      }
      if (!data.quietHours.startTime || !data.quietHours.endTime) {
        errors.push('quietHours thiếu startTime hoặc endTime');
      }
    }

    if (data.emailDigest) {
      if (typeof data.emailDigest.enabled !== 'boolean') {
        errors.push('emailDigest.enabled phải là boolean');
      }
    }

    return { valid: errors.length === 0, errors };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setImportError(null);
    setImportData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const validation = validateImportData(data);
      
      if (!validation.valid) {
        setImportError(`Lỗi validation:\n${validation.errors.join('\n')}`);
        setIsValidating(false);
        return;
      }

      setImportData(data);
      setIsImportDialogOpen(true);
    } catch (error) {
      setImportError('File không hợp lệ. Vui lòng chọn file JSON đúng định dạng.');
    } finally {
      setIsValidating(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateImportData]);

  // Confirm import
  const handleConfirmImport = useCallback(() => {
    if (!importData) return;

    onImport({
      channels: importData.channels,
      soundEnabled: importData.soundEnabled,
      soundType: importData.soundType,
      soundVolume: importData.soundVolume,
      vibrationEnabled: importData.vibrationEnabled,
      quietHours: importData.quietHours,
      emailDigest: importData.emailDigest
    });

    setIsImportDialogOpen(false);
    setImportData(null);
    toast.success('Đã nhập cài đặt thông báo thành công');
  }, [importData, onImport]);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Export/Import Settings
          </CardTitle>
          <CardDescription>
            Sao lưu và khôi phục cài đặt thông báo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <span className="font-medium">Xuất cài đặt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tải xuống file JSON chứa tất cả cài đặt thông báo hiện tại
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Xuất cài đặt (JSON)
            </Button>
          </div>

          <Separator />

          {/* Import Section */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <span className="font-medium">Nhập cài đặt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Khôi phục cài đặt từ file JSON đã xuất trước đó
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isValidating}
            >
              {isValidating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Chọn file JSON
            </Button>

            {importError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {importError}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Lưu ý:</strong> File export chứa cài đặt channels, âm thanh, quiet hours và email digest. 
              Không chứa thông tin cá nhân hay dữ liệu nhạy cảm.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-500" />
              Xác nhận nhập cài đặt
            </DialogTitle>
            <DialogDescription>
              Kiểm tra thông tin trước khi áp dụng cài đặt mới
            </DialogDescription>
          </DialogHeader>

          {importData && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {/* File Info */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Phiên bản</span>
                    <Badge variant="outline">{importData.version}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ngày xuất</span>
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(importData.exportedAt)}
                    </span>
                  </div>
                </div>

                {/* Channels Preview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notification Channels ({importData.channels.length})</h4>
                  <div className="space-y-1">
                    {importData.channels.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <span>{ch.name || ch.id}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={ch.enabled ? 'default' : 'secondary'} className="text-xs">
                            {ch.enabled ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ch.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sound Settings */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sound Settings</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Sound</span>
                      <p className="font-medium">{importData.soundEnabled ? 'Bật' : 'Tắt'}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Volume</span>
                      <p className="font-medium">{importData.soundVolume}%</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Sound Type</span>
                      <p className="font-medium">{importData.soundType || 'default'}</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Vibration</span>
                      <p className="font-medium">{importData.vibrationEnabled ? 'Bật' : 'Tắt'}</p>
                    </div>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Quiet Hours</h4>
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    {importData.quietHours.enabled ? (
                      <span>{importData.quietHours.startTime} - {importData.quietHours.endTime}</span>
                    ) : (
                      <span className="text-muted-foreground">Tắt</span>
                    )}
                  </div>
                </div>

                {/* Email Digest */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Email Digest</h4>
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    {importData.emailDigest.enabled ? (
                      <span>Bật - {importData.emailDigest.frequency}</span>
                    ) : (
                      <span className="text-muted-foreground">Tắt</span>
                    )}
                  </div>
                </div>

                {/* Warning */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Lưu ý</AlertTitle>
                  <AlertDescription>
                    Cài đặt hiện tại sẽ bị ghi đè. Hãy xuất cài đặt hiện tại trước nếu cần.
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Hủy
            </Button>
            <Button onClick={handleConfirmImport}>
              <Check className="mr-2 h-4 w-4" />
              Áp dụng cài đặt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NotificationSettingsExport;
