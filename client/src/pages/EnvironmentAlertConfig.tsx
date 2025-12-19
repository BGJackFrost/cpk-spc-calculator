import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Thermometer, Droplets, Settings, History, Save, Plus, X, 
  AlertTriangle, CheckCircle, Clock
} from "lucide-react";

export default function EnvironmentAlertConfig() {
  const [tempMin, setTempMin] = useState(18);
  const [tempMax, setTempMax] = useState(28);
  const [humidityMin, setHumidityMin] = useState(40);
  const [humidityMax, setHumidityMax] = useState(70);
  const [checkInterval, setCheckInterval] = useState(30);
  const [alertEmails, setAlertEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [enabled, setEnabled] = useState(true);

  const { data: config, isLoading } = trpc.environmentAlerts.getConfig.useQuery();

  // Update state when config data is loaded
  useEffect(() => {
    if (config) {
      setTempMin(config.tempMin);
      setTempMax(config.tempMax);
      setHumidityMin(config.humidityMin);
      setHumidityMax(config.humidityMax);
      setCheckInterval(config.checkInterval);
      setAlertEmails(config.alertEmails);
      setEnabled(config.enabled);
    }
  }, [config]);

  const { data: alertHistory } = trpc.environmentAlerts.getAlertHistory.useQuery({ limit: 50 });

  const updateMutation = trpc.environmentAlerts.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình cảnh báo môi trường");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      tempMin,
      tempMax,
      humidityMin,
      humidityMax,
      checkInterval,
      alertEmails,
      enabled,
    });
  };

  const addEmail = () => {
    if (newEmail && !alertEmails.includes(newEmail)) {
      setAlertEmails([...alertEmails, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setAlertEmails(alertEmails.filter(e => e !== email));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Cấu hình Cảnh báo Môi trường
            </h1>
            <p className="text-muted-foreground">Thiết lập ngưỡng cảnh báo nhiệt độ và độ ẩm tự động</p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Lưu cấu hình
          </Button>
        </div>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Cấu hình</TabsTrigger>
            <TabsTrigger value="history">Lịch sử cảnh báo</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Trạng thái</span>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </CardTitle>
                <CardDescription>
                  {enabled ? "Cảnh báo môi trường đang BẬT" : "Cảnh báo môi trường đang TẮT"}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Temperature Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  Ngưỡng Nhiệt độ
                </CardTitle>
                <CardDescription>Cảnh báo khi nhiệt độ nằm ngoài khoảng cho phép</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nhiệt độ tối thiểu (°C)</Label>
                    <Input 
                      type="number" 
                      value={tempMin} 
                      onChange={(e) => setTempMin(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nhiệt độ tối đa (°C)</Label>
                    <Input 
                      type="number" 
                      value={tempMax} 
                      onChange={(e) => setTempMax(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm">
                    Khoảng nhiệt độ cho phép: <strong>{tempMin}°C - {tempMax}°C</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cảnh báo sẽ được gửi khi nhiệt độ &lt; {tempMin}°C hoặc &gt; {tempMax}°C
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Humidity Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  Ngưỡng Độ ẩm
                </CardTitle>
                <CardDescription>Cảnh báo khi độ ẩm nằm ngoài khoảng cho phép</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Độ ẩm tối thiểu (%)</Label>
                    <Input 
                      type="number" 
                      value={humidityMin} 
                      onChange={(e) => setHumidityMin(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Độ ẩm tối đa (%)</Label>
                    <Input 
                      type="number" 
                      value={humidityMax} 
                      onChange={(e) => setHumidityMax(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm">
                    Khoảng độ ẩm cho phép: <strong>{humidityMin}% - {humidityMax}%</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cảnh báo sẽ được gửi khi độ ẩm &lt; {humidityMin}% hoặc &gt; {humidityMax}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Check Interval */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Tần suất kiểm tra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Kiểm tra mỗi (phút)</Label>
                  <Input 
                    type="number" 
                    value={checkInterval} 
                    onChange={(e) => setCheckInterval(Number(e.target.value))}
                    min={5}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hệ thống sẽ kiểm tra điều kiện môi trường mỗi {checkInterval} phút
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Alert Emails */}
            <Card>
              <CardHeader>
                <CardTitle>Email nhận cảnh báo</CardTitle>
                <CardDescription>Danh sách email sẽ nhận thông báo khi có cảnh báo môi trường</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    type="email" 
                    placeholder="Nhập email..."
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                  />
                  <Button onClick={addEmail} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alertEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {alertEmails.length === 0 && (
                    <p className="text-sm text-muted-foreground">Chưa có email nào</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Lịch sử Cảnh báo Môi trường
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!alertHistory || alertHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>Chưa có cảnh báo môi trường nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertHistory.map((alert: any) => (
                      <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border">
                        <div className={`p-2 rounded-full ${
                          alert.alertType?.includes('temperature') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {alert.alertType?.includes('temperature') ? (
                            <Thermometer className="w-5 h-5" />
                          ) : (
                            <Droplets className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={alert.alertLevel === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.alertLevel === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="mt-1">{alert.message}</p>
                          {alert.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Giá trị: {alert.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
