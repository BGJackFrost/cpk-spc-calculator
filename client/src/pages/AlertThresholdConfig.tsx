import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  Gauge,
  Activity,
  TrendingDown,
  CheckCircle2,
  Save,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Target,
  Zap
} from "lucide-react";

interface ThresholdConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  direction: "above" | "below"; // above = cảnh báo khi vượt ngưỡng, below = cảnh báo khi dưới ngưỡng
}

interface NotificationChannel {
  id: string;
  name: string;
  type: "email" | "sms" | "push" | "webhook";
  enabled: boolean;
  config: Record<string, string>;
}

export default function AlertThresholdConfig() {
  const [activeTab, setActiveTab] = useState("oee");
  const [isSaving, setIsSaving] = useState(false);

  // OEE Thresholds
  const [oeeThresholds, setOeeThresholds] = useState<ThresholdConfig[]>([
    {
      id: "oee_total",
      name: "OEE Tổng",
      description: "Cảnh báo khi OEE tổng dưới ngưỡng",
      enabled: true,
      warningThreshold: 85,
      criticalThreshold: 75,
      unit: "%",
      direction: "below"
    },
    {
      id: "availability",
      name: "Availability",
      description: "Cảnh báo khi Availability dưới ngưỡng",
      enabled: true,
      warningThreshold: 90,
      criticalThreshold: 80,
      unit: "%",
      direction: "below"
    },
    {
      id: "performance",
      name: "Performance",
      description: "Cảnh báo khi Performance dưới ngưỡng",
      enabled: true,
      warningThreshold: 90,
      criticalThreshold: 80,
      unit: "%",
      direction: "below"
    },
    {
      id: "quality",
      name: "Quality",
      description: "Cảnh báo khi Quality dưới ngưỡng",
      enabled: true,
      warningThreshold: 98,
      criticalThreshold: 95,
      unit: "%",
      direction: "below"
    }
  ]);

  // SPC/CPK Thresholds
  const [spcThresholds, setSpcThresholds] = useState<ThresholdConfig[]>([
    {
      id: "cpk",
      name: "CPK",
      description: "Cảnh báo khi CPK dưới ngưỡng",
      enabled: true,
      warningThreshold: 1.33,
      criticalThreshold: 1.0,
      unit: "",
      direction: "below"
    },
    {
      id: "cp",
      name: "Cp",
      description: "Cảnh báo khi Cp dưới ngưỡng",
      enabled: true,
      warningThreshold: 1.33,
      criticalThreshold: 1.0,
      unit: "",
      direction: "below"
    },
    {
      id: "ppk",
      name: "Ppk",
      description: "Cảnh báo khi Ppk dưới ngưỡng",
      enabled: false,
      warningThreshold: 1.33,
      criticalThreshold: 1.0,
      unit: "",
      direction: "below"
    },
    {
      id: "out_of_spec",
      name: "Ngoài Spec",
      description: "Cảnh báo khi có điểm ngoài USL/LSL",
      enabled: true,
      warningThreshold: 1,
      criticalThreshold: 3,
      unit: "điểm",
      direction: "above"
    },
    {
      id: "spc_rule_violation",
      name: "Vi phạm SPC Rule",
      description: "Cảnh báo khi vi phạm 8 SPC Rules",
      enabled: true,
      warningThreshold: 1,
      criticalThreshold: 2,
      unit: "lần",
      direction: "above"
    }
  ]);

  // Maintenance Thresholds
  const [maintenanceThresholds, setMaintenanceThresholds] = useState<ThresholdConfig[]>([
    {
      id: "mtbf",
      name: "MTBF",
      description: "Mean Time Between Failures - Thời gian trung bình giữa các lần hỏng",
      enabled: true,
      warningThreshold: 100,
      criticalThreshold: 50,
      unit: "giờ",
      direction: "below"
    },
    {
      id: "mttr",
      name: "MTTR",
      description: "Mean Time To Repair - Thời gian trung bình sửa chữa",
      enabled: true,
      warningThreshold: 2,
      criticalThreshold: 4,
      unit: "giờ",
      direction: "above"
    },
    {
      id: "downtime",
      name: "Downtime",
      description: "Thời gian dừng máy không kế hoạch",
      enabled: true,
      warningThreshold: 30,
      criticalThreshold: 60,
      unit: "phút/ca",
      direction: "above"
    },
    {
      id: "spare_parts_low",
      name: "Phụ tùng thấp",
      description: "Cảnh báo khi tồn kho phụ tùng dưới mức tối thiểu",
      enabled: true,
      warningThreshold: 20,
      criticalThreshold: 10,
      unit: "%",
      direction: "below"
    }
  ]);

  // Notification Channels
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([
    {
      id: "email",
      name: "Email",
      type: "email",
      enabled: true,
      config: { recipients: "admin@company.com" }
    },
    {
      id: "sms",
      name: "SMS",
      type: "sms",
      enabled: false,
      config: { phoneNumbers: "" }
    },
    {
      id: "push",
      name: "Push Notification",
      type: "push",
      enabled: true,
      config: {}
    },
    {
      id: "webhook",
      name: "Webhook",
      type: "webhook",
      enabled: false,
      config: { url: "" }
    }
  ]);

  const handleThresholdChange = (
    thresholds: ThresholdConfig[],
    setThresholds: React.Dispatch<React.SetStateAction<ThresholdConfig[]>>,
    id: string,
    field: keyof ThresholdConfig,
    value: any
  ) => {
    setThresholds(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Đã lưu cấu hình ngưỡng cảnh báo");
    } catch (error) {
      toast.error("Lỗi khi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  };

  const ThresholdCard = ({
    threshold,
    onUpdate
  }: {
    threshold: ThresholdConfig;
    onUpdate: (field: keyof ThresholdConfig, value: any) => void;
  }) => (
    <Card className={!threshold.enabled ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {threshold.direction === "below" ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <CardTitle className="text-sm font-medium">{threshold.name}</CardTitle>
          </div>
          <Switch
            checked={threshold.enabled}
            onCheckedChange={(checked) => onUpdate("enabled", checked)}
          />
        </div>
        <CardDescription className="text-xs">{threshold.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Badge className="bg-yellow-500 h-2 w-2 p-0 rounded-full" />
              Ngưỡng cảnh báo
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={threshold.unit === "" ? "0.01" : "1"}
                value={threshold.warningThreshold}
                onChange={(e) => onUpdate("warningThreshold", parseFloat(e.target.value))}
                className="h-8"
                disabled={!threshold.enabled}
              />
              <span className="text-sm text-muted-foreground w-12">{threshold.unit}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Badge className="bg-red-500 h-2 w-2 p-0 rounded-full" />
              Ngưỡng nghiêm trọng
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step={threshold.unit === "" ? "0.01" : "1"}
                value={threshold.criticalThreshold}
                onChange={(e) => onUpdate("criticalThreshold", parseFloat(e.target.value))}
                className="h-8"
                disabled={!threshold.enabled}
              />
              <span className="text-sm text-muted-foreground w-12">{threshold.unit}</span>
            </div>
          </div>
        </div>

        {/* Visual indicator */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {threshold.direction === "below" ? (
            <>
              <div
                className="absolute left-0 h-full bg-red-500"
                style={{ width: `${(threshold.criticalThreshold / 100) * 100}%` }}
              />
              <div
                className="absolute h-full bg-yellow-500"
                style={{
                  left: `${(threshold.criticalThreshold / 100) * 100}%`,
                  width: `${((threshold.warningThreshold - threshold.criticalThreshold) / 100) * 100}%`
                }}
              />
              <div
                className="absolute h-full bg-green-500"
                style={{
                  left: `${(threshold.warningThreshold / 100) * 100}%`,
                  right: 0
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute left-0 h-full bg-green-500"
                style={{ width: `${Math.min((threshold.warningThreshold / threshold.criticalThreshold) * 50, 50)}%` }}
              />
              <div
                className="absolute h-full bg-yellow-500"
                style={{
                  left: `${Math.min((threshold.warningThreshold / threshold.criticalThreshold) * 50, 50)}%`,
                  width: "25%"
                }}
              />
              <div
                className="absolute h-full bg-red-500"
                style={{ left: "75%", right: 0 }}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Cấu hình Ngưỡng Cảnh báo
            </h1>
            <p className="text-muted-foreground">
              Thiết lập ngưỡng cảnh báo cho OEE, SPC/CPK và Bảo trì
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu cấu hình
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="oee" className="gap-2">
              <Gauge className="h-4 w-4" />
              OEE
            </TabsTrigger>
            <TabsTrigger value="spc" className="gap-2">
              <Target className="h-4 w-4" />
              SPC/CPK
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Activity className="h-4 w-4" />
              Bảo trì
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Thông báo
            </TabsTrigger>
          </TabsList>

          {/* OEE Thresholds */}
          <TabsContent value="oee" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {oeeThresholds.map((threshold) => (
                <ThresholdCard
                  key={threshold.id}
                  threshold={threshold}
                  onUpdate={(field, value) =>
                    handleThresholdChange(oeeThresholds, setOeeThresholds, threshold.id, field, value)
                  }
                />
              ))}
            </div>
          </TabsContent>

          {/* SPC/CPK Thresholds */}
          <TabsContent value="spc" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spcThresholds.map((threshold) => (
                <ThresholdCard
                  key={threshold.id}
                  threshold={threshold}
                  onUpdate={(field, value) =>
                    handleThresholdChange(spcThresholds, setSpcThresholds, threshold.id, field, value)
                  }
                />
              ))}
            </div>
          </TabsContent>

          {/* Maintenance Thresholds */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {maintenanceThresholds.map((threshold) => (
                <ThresholdCard
                  key={threshold.id}
                  threshold={threshold}
                  onUpdate={(field, value) =>
                    handleThresholdChange(maintenanceThresholds, setMaintenanceThresholds, threshold.id, field, value)
                  }
                />
              ))}
            </div>
          </TabsContent>

          {/* Notification Channels */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationChannels.map((channel) => (
                <Card key={channel.id} className={!channel.enabled ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {channel.type === "email" && <Mail className="h-4 w-4" />}
                        {channel.type === "sms" && <Smartphone className="h-4 w-4" />}
                        {channel.type === "push" && <Bell className="h-4 w-4" />}
                        {channel.type === "webhook" && <Zap className="h-4 w-4" />}
                        <CardTitle className="text-sm font-medium">{channel.name}</CardTitle>
                      </div>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(checked) => {
                          setNotificationChannels(prev =>
                            prev.map(c => (c.id === channel.id ? { ...c, enabled: checked } : c))
                          );
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {channel.type === "email" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Danh sách email (phân cách bằng dấu phẩy)</Label>
                        <Input
                          placeholder="admin@company.com, manager@company.com"
                          value={channel.config.recipients || ""}
                          onChange={(e) => {
                            setNotificationChannels(prev =>
                              prev.map(c =>
                                c.id === channel.id
                                  ? { ...c, config: { ...c.config, recipients: e.target.value } }
                                  : c
                              )
                            );
                          }}
                          disabled={!channel.enabled}
                        />
                      </div>
                    )}
                    {channel.type === "sms" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Số điện thoại (phân cách bằng dấu phẩy)</Label>
                        <Input
                          placeholder="+84912345678, +84987654321"
                          value={channel.config.phoneNumbers || ""}
                          onChange={(e) => {
                            setNotificationChannels(prev =>
                              prev.map(c =>
                                c.id === channel.id
                                  ? { ...c, config: { ...c.config, phoneNumbers: e.target.value } }
                                  : c
                              )
                            );
                          }}
                          disabled={!channel.enabled}
                        />
                      </div>
                    )}
                    {channel.type === "webhook" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Webhook URL</Label>
                        <Input
                          placeholder="https://api.example.com/webhook"
                          value={channel.config.url || ""}
                          onChange={(e) => {
                            setNotificationChannels(prev =>
                              prev.map(c =>
                                c.id === channel.id
                                  ? { ...c, config: { ...c.config, url: e.target.value } }
                                  : c
                              )
                            );
                          }}
                          disabled={!channel.enabled}
                        />
                      </div>
                    )}
                    {channel.type === "push" && (
                      <p className="text-sm text-muted-foreground">
                        Push notification sẽ được gửi qua ứng dụng web
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Alert Priority Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cài đặt ưu tiên thông báo</CardTitle>
                <CardDescription>Chọn kênh thông báo theo mức độ nghiêm trọng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-500">Nghiêm trọng</Badge>
                      <span className="text-sm">Gửi qua tất cả kênh đã bật</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500">Cảnh báo</Badge>
                      <span className="text-sm">Gửi qua Email và Push</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Thông tin</Badge>
                      <span className="text-sm">Chỉ gửi qua Push</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
