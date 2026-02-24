/**
 * Component cấu hình ngưỡng cảnh báo Yield/Defect Rate
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  BellRing,
  Mail,
  Wifi,
  Smartphone,
  Save,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Settings,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface AlertThresholdConfigProps {
  productionLineId?: number;
  productionLineName?: string;
  onSave?: () => void;
}

interface ThresholdConfig {
  yieldWarningThreshold: number;
  yieldCriticalThreshold: number;
  defectWarningThreshold: number;
  defectCriticalThreshold: number;
  yieldDropThreshold: number;
  defectSpikeThreshold: number;
  cooldownMinutes: number;
  enabled: boolean;
  notifyEmail: boolean;
  notifyWebSocket: boolean;
  notifyPush: boolean;
  emailRecipients: string;
}

const DEFAULT_CONFIG: ThresholdConfig = {
  yieldWarningThreshold: 95,
  yieldCriticalThreshold: 90,
  defectWarningThreshold: 3,
  defectCriticalThreshold: 5,
  yieldDropThreshold: 5,
  defectSpikeThreshold: 50,
  cooldownMinutes: 30,
  enabled: true,
  notifyEmail: true,
  notifyWebSocket: true,
  notifyPush: true,
  emailRecipients: '',
};

export function AlertThresholdConfig({
  productionLineId,
  productionLineName,
  onSave,
}: AlertThresholdConfigProps) {
  const [config, setConfig] = useState<ThresholdConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing config
  const { data: existingConfig, refetch } = trpc.alertConfig.getYieldDefectThresholds.useQuery(
    { productionLineId },
    { enabled: true }
  );

  const saveMutation = trpc.alertConfig.saveYieldDefectThresholds.useMutation();

  useEffect(() => {
    if (existingConfig) {
      setConfig({
        ...DEFAULT_CONFIG,
        ...existingConfig,
        emailRecipients: existingConfig.emailRecipients?.join(', ') || '',
      });
    }
  }, [existingConfig]);

  const handleChange = (key: keyof ThresholdConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        productionLineId,
        ...config,
        emailRecipients: config.emailRecipients
          .split(',')
          .map(e => e.trim())
          .filter(e => e),
      });
      toast.success('Đã lưu cấu hình cảnh báo');
      setHasChanges(false);
      refetch();
      onSave?.();
    } catch (error: any) {
      toast.error(error.message || 'Lưu cấu hình thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cấu hình Cảnh báo Tự động
              {productionLineName && (
                <Badge variant="outline">{productionLineName}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Thiết lập ngưỡng cảnh báo khi yield rate giảm hoặc defect rate tăng
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => handleChange('enabled', checked)}
            />
            <span className="text-sm">{config.enabled ? 'Bật' : 'Tắt'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!config.enabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Hệ thống cảnh báo đang tắt. Bật để nhận thông báo khi có sự cố.
            </AlertDescription>
          </Alert>
        )}

        {/* Yield Rate Thresholds */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-600" />
            Ngưỡng Yield Rate
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Cảnh báo (Warning)
                </Label>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  &lt; {config.yieldWarningThreshold}%
                </Badge>
              </div>
              <Slider
                value={[config.yieldWarningThreshold]}
                onValueChange={([v]) => handleChange('yieldWarningThreshold', v)}
                min={80}
                max={100}
                step={0.5}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Cảnh báo khi yield rate dưới ngưỡng này
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Nghiêm trọng (Critical)
                </Label>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  &lt; {config.yieldCriticalThreshold}%
                </Badge>
              </div>
              <Slider
                value={[config.yieldCriticalThreshold]}
                onValueChange={([v]) => handleChange('yieldCriticalThreshold', v)}
                min={70}
                max={95}
                step={0.5}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Cảnh báo nghiêm trọng khi yield rate dưới ngưỡng này
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Giảm đột ngột
              </Label>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                &gt; {config.yieldDropThreshold}%
              </Badge>
            </div>
            <Slider
              value={[config.yieldDropThreshold]}
              onValueChange={([v]) => handleChange('yieldDropThreshold', v)}
              min={1}
              max={20}
              step={0.5}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Cảnh báo khi yield rate giảm đột ngột hơn ngưỡng này so với trung bình
            </p>
          </div>
        </div>

        <Separator />

        {/* Defect Rate Thresholds */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-red-600" />
            Ngưỡng Defect Rate
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Cảnh báo (Warning)
                </Label>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  &gt; {config.defectWarningThreshold}%
                </Badge>
              </div>
              <Slider
                value={[config.defectWarningThreshold]}
                onValueChange={([v]) => handleChange('defectWarningThreshold', v)}
                min={0.5}
                max={10}
                step={0.5}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Cảnh báo khi defect rate vượt ngưỡng này
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Nghiêm trọng (Critical)
                </Label>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  &gt; {config.defectCriticalThreshold}%
                </Badge>
              </div>
              <Slider
                value={[config.defectCriticalThreshold]}
                onValueChange={([v]) => handleChange('defectCriticalThreshold', v)}
                min={2}
                max={15}
                step={0.5}
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Cảnh báo nghiêm trọng khi defect rate vượt ngưỡng này
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Tăng đột biến
              </Label>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                &gt; {config.defectSpikeThreshold}%
              </Badge>
            </div>
            <Slider
              value={[config.defectSpikeThreshold]}
              onValueChange={([v]) => handleChange('defectSpikeThreshold', v)}
              min={10}
              max={100}
              step={5}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Cảnh báo khi defect rate tăng đột biến hơn ngưỡng này (%) so với trung bình
            </p>
          </div>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Cài đặt Thông báo
          </h3>

          <div className="space-y-2">
            <Label>Thời gian chờ giữa các cảnh báo (phút)</Label>
            <Input
              type="number"
              value={config.cooldownMinutes}
              onChange={(e) => handleChange('cooldownMinutes', parseInt(e.target.value) || 30)}
              min={5}
              max={120}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Tránh spam cảnh báo bằng cách đặt thời gian chờ tối thiểu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Email</span>
              </div>
              <Switch
                checked={config.notifyEmail}
                onCheckedChange={(checked) => handleChange('notifyEmail', checked)}
                disabled={!config.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm">WebSocket</span>
              </div>
              <Switch
                checked={config.notifyWebSocket}
                onCheckedChange={(checked) => handleChange('notifyWebSocket', checked)}
                disabled={!config.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Push</span>
              </div>
              <Switch
                checked={config.notifyPush}
                onCheckedChange={(checked) => handleChange('notifyPush', checked)}
                disabled={!config.enabled}
              />
            </div>
          </div>

          {config.notifyEmail && (
            <div className="space-y-2">
              <Label>Email nhận thông báo (phân cách bằng dấu phẩy)</Label>
              <Input
                value={config.emailRecipients}
                onChange={(e) => handleChange('emailRecipients', e.target.value)}
                placeholder="admin@company.com, manager@company.com"
                disabled={!config.enabled}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!config.enabled}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Đặt lại mặc định
          </Button>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary">Chưa lưu</Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AlertThresholdConfig;
