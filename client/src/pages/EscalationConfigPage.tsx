import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  AlertTriangle,
  Bell,
  Clock,
  Mail,
  Phone,
  Plus,
  Save,
  Settings,
  Trash2,
  User,
  ArrowUp,
  ArrowDown,
  Play,
  CheckCircle,
} from 'lucide-react';

interface EscalationLevel {
  level: number;
  name: string;
  timeoutMinutes: number;
  notifyEmails: string[];
  notifyPhones: string[];
  notifyOwner: boolean;
}

interface EscalationConfig {
  enabled: boolean;
  failureThreshold: number;
  levels: EscalationLevel[];
}

const DEFAULT_LEVELS: EscalationLevel[] = [
  { level: 1, name: 'Supervisor', timeoutMinutes: 15, notifyEmails: [], notifyPhones: [], notifyOwner: false },
  { level: 2, name: 'Manager', timeoutMinutes: 30, notifyEmails: [], notifyPhones: [], notifyOwner: true },
  { level: 3, name: 'Director', timeoutMinutes: 60, notifyEmails: [], notifyPhones: [], notifyOwner: true },
];

export default function EscalationConfigPage() {
  const [config, setConfig] = useState<EscalationConfig>({
    enabled: false,
    failureThreshold: 3,
    levels: DEFAULT_LEVELS,
  });
  const [newEmail, setNewEmail] = useState<{ [key: number]: string }>({});
  const [newPhone, setNewPhone] = useState<{ [key: number]: string }>({});
  const [testingLevel, setTestingLevel] = useState<number | null>(null);

  const { data: savedConfig, isLoading, refetch } = trpc.escalation.getConfig.useQuery();
  const saveMutation = trpc.escalation.saveConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình escalation');
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  const testMutation = trpc.escalation.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Đã gửi test notification thành công');
      } else {
        toast.error(`Test thất bại: ${result.error}`);
      }
      setTestingLevel(null);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
      setTestingLevel(null);
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        enabled: savedConfig.enabled,
        failureThreshold: savedConfig.failureThreshold || 3,
        levels: savedConfig.levels.length > 0 ? savedConfig.levels : DEFAULT_LEVELS,
      });
    }
  }, [savedConfig]);

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleTestLevel = (level: number) => {
    setTestingLevel(level);
    testMutation.mutate({ level });
  };

  const updateLevel = (index: number, updates: Partial<EscalationLevel>) => {
    const newLevels = [...config.levels];
    newLevels[index] = { ...newLevels[index], ...updates };
    setConfig({ ...config, levels: newLevels });
  };

  const addEmail = (levelIndex: number) => {
    const email = newEmail[levelIndex]?.trim();
    if (!email || !email.includes('@')) {
      toast.error('Email không hợp lệ');
      return;
    }
    const level = config.levels[levelIndex];
    if (level.notifyEmails.includes(email)) {
      toast.error('Email đã tồn tại');
      return;
    }
    updateLevel(levelIndex, { notifyEmails: [...level.notifyEmails, email] });
    setNewEmail({ ...newEmail, [levelIndex]: '' });
  };

  const removeEmail = (levelIndex: number, email: string) => {
    const level = config.levels[levelIndex];
    updateLevel(levelIndex, { notifyEmails: level.notifyEmails.filter(e => e !== email) });
  };

  const addPhone = (levelIndex: number) => {
    const phone = newPhone[levelIndex]?.trim();
    if (!phone) {
      toast.error('Số điện thoại không hợp lệ');
      return;
    }
    const level = config.levels[levelIndex];
    if (level.notifyPhones.includes(phone)) {
      toast.error('Số điện thoại đã tồn tại');
      return;
    }
    updateLevel(levelIndex, { notifyPhones: [...level.notifyPhones, phone] });
    setNewPhone({ ...newPhone, [levelIndex]: '' });
  };

  const removePhone = (levelIndex: number, phone: string) => {
    const level = config.levels[levelIndex];
    updateLevel(levelIndex, { notifyPhones: level.notifyPhones.filter(p => p !== phone) });
  };

  const addLevel = () => {
    const newLevel: EscalationLevel = {
      level: config.levels.length + 1,
      name: `Level ${config.levels.length + 1}`,
      timeoutMinutes: 60,
      notifyEmails: [],
      notifyPhones: [],
      notifyOwner: false,
    };
    setConfig({ ...config, levels: [...config.levels, newLevel] });
  };

  const removeLevel = (index: number) => {
    if (config.levels.length <= 1) {
      toast.error('Phải có ít nhất 1 level');
      return;
    }
    const newLevels = config.levels.filter((_, i) => i !== index).map((l, i) => ({ ...l, level: i + 1 }));
    setConfig({ ...config, levels: newLevels });
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-yellow-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-red-500';
      default: return 'bg-purple-500';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Cấu hình Escalation
            </h1>
            <p className="text-muted-foreground">
              Thiết lập quy trình leo thang cảnh báo tự động
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </div>

        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Cài đặt chung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Kích hoạt Escalation</Label>
                <p className="text-sm text-muted-foreground">
                  Tự động leo thang cảnh báo khi không được xử lý
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Số lần thất bại trước khi escalate</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={config.failureThreshold}
                  onChange={(e) => setConfig({ ...config, failureThreshold: parseInt(e.target.value) || 3 })}
                />
                <p className="text-xs text-muted-foreground">
                  Số lần webhook thất bại liên tiếp trước khi kích hoạt escalation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Escalation Flow Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5" />
              Quy trình Escalation
            </CardTitle>
            <CardDescription>
              Cảnh báo sẽ được leo thang theo thứ tự các level sau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 overflow-x-auto pb-4">
              {config.levels.map((level, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${config.enabled ? 'border-primary' : 'border-muted'} min-w-[150px]`}>
                    <div className={`w-10 h-10 rounded-full ${getLevelColor(level.level)} flex items-center justify-center text-white font-bold`}>
                      {level.level}
                    </div>
                    <span className="font-medium mt-2">{level.name}</span>
                    <span className="text-sm text-muted-foreground">{level.timeoutMinutes} phút</span>
                    <div className="flex gap-1 mt-2">
                      {level.notifyEmails.length > 0 && <Mail className="w-4 h-4 text-blue-500" />}
                      {level.notifyPhones.length > 0 && <Phone className="w-4 h-4 text-green-500" />}
                      {level.notifyOwner && <User className="w-4 h-4 text-purple-500" />}
                    </div>
                  </div>
                  {index < config.levels.length - 1 && (
                    <ArrowUp className="w-6 h-6 text-muted-foreground rotate-90" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Level Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chi tiết các Level</h2>
            <Button variant="outline" onClick={addLevel}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm Level
            </Button>
          </div>

          {config.levels.map((level, index) => (
            <Card key={index}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${getLevelColor(level.level)} flex items-center justify-center text-white font-bold text-sm`}>
                      {level.level}
                    </div>
                    <div>
                      <Input
                        value={level.name}
                        onChange={(e) => updateLevel(index, { name: e.target.value })}
                        className="font-semibold h-8 w-40"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestLevel(level.level)}
                      disabled={testingLevel === level.level}
                    >
                      {testingLevel === level.level ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span className="ml-2">Test</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLevel(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Thời gian chờ (phút)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={level.timeoutMinutes}
                      onChange={(e) => updateLevel(index, { timeoutMinutes: parseInt(e.target.value) || 15 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Thời gian chờ trước khi leo thang lên level tiếp theo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Thông báo Owner
                    </Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={level.notifyOwner}
                        onCheckedChange={(checked) => updateLevel(index, { notifyOwner: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {level.notifyOwner ? 'Có' : 'Không'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Emails */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email nhận thông báo
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {level.notifyEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          onClick={() => removeEmail(index, email)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Nhập email..."
                      value={newEmail[index] || ''}
                      onChange={(e) => setNewEmail({ ...newEmail, [index]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addEmail(index)}
                    />
                    <Button variant="outline" onClick={() => addEmail(index)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Phones */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Số điện thoại nhận SMS
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {level.notifyPhones.map((phone) => (
                      <Badge key={phone} variant="secondary" className="flex items-center gap-1">
                        {phone}
                        <button
                          onClick={() => removePhone(index, phone)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="Nhập số điện thoại..."
                      value={newPhone[index] || ''}
                      onChange={(e) => setNewPhone({ ...newPhone, [index]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && addPhone(index)}
                    />
                    <Button variant="outline" onClick={() => addPhone(index)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">Cách hoạt động</h3>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• Khi có cảnh báo mới, hệ thống sẽ gửi thông báo đến Level 1</li>
                  <li>• Nếu sau thời gian chờ cảnh báo chưa được xử lý, sẽ leo thang lên Level tiếp theo</li>
                  <li>• Quy trình tiếp tục cho đến khi cảnh báo được xử lý hoặc đạt Level cao nhất</li>
                  <li>• Cron job kiểm tra và xử lý escalation mỗi 5 phút</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
