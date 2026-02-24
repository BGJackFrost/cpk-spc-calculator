/**
 * CPK Early Warning Component
 * Cảnh báo sớm CPK khi dự báo giảm dưới ngưỡng
 * Task: SPC-03, SPC-06
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  AlertTriangle,
  Bell,
  BellOff,
  TrendingDown,
  TrendingUp,
  Clock,
  Settings,
  CheckCircle2,
  XCircle,
  Info,
  Volume2,
  VolumeX,
  Mail,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface CpkAlert {
  id: string;
  type: "warning" | "critical" | "forecast";
  title: string;
  message: string;
  cpkValue: number;
  threshold: number;
  timestamp: Date;
  productionLine?: string;
  product?: string;
  acknowledged: boolean;
  forecastDate?: Date;
}

interface AlertConfig {
  warningThreshold: number;
  criticalThreshold: number;
  forecastHorizon: number; // days
  enableSound: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  emailRecipients: string[];
  autoAcknowledge: boolean;
  autoAcknowledgeDelay: number; // minutes
}

interface CpkEarlyWarningProps {
  currentCpk: number;
  forecastCpk?: number;
  forecastDate?: Date;
  productionLineName?: string;
  productName?: string;
  onConfigChange?: (config: AlertConfig) => void;
  onAlertAcknowledge?: (alertId: string) => void;
  initialConfig?: Partial<AlertConfig>;
}

const DEFAULT_CONFIG: AlertConfig = {
  warningThreshold: 1.33,
  criticalThreshold: 1.0,
  forecastHorizon: 7,
  enableSound: true,
  enableEmail: false,
  enableSms: false,
  emailRecipients: [],
  autoAcknowledge: false,
  autoAcknowledgeDelay: 30,
};

// Sound for alerts
const playAlertSound = (type: "warning" | "critical") => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = type === "critical" ? 800 : 600;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn("Could not play alert sound:", e);
  }
};

export default function CpkEarlyWarning({
  currentCpk,
  forecastCpk,
  forecastDate,
  productionLineName,
  productName,
  onConfigChange,
  onAlertAcknowledge,
  initialConfig,
}: CpkEarlyWarningProps) {
  const [config, setConfig] = useState<AlertConfig>({ ...DEFAULT_CONFIG, ...initialConfig });
  const [alerts, setAlerts] = useState<CpkAlert[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newEmailRecipient, setNewEmailRecipient] = useState("");

  // Determine current status
  const currentStatus = useMemo(() => {
    if (currentCpk < config.criticalThreshold) return "critical";
    if (currentCpk < config.warningThreshold) return "warning";
    return "good";
  }, [currentCpk, config.warningThreshold, config.criticalThreshold]);

  // Determine forecast status
  const forecastStatus = useMemo(() => {
    if (!forecastCpk) return null;
    if (forecastCpk < config.criticalThreshold) return "critical";
    if (forecastCpk < config.warningThreshold) return "warning";
    return "good";
  }, [forecastCpk, config.warningThreshold, config.criticalThreshold]);

  // Generate alerts based on current and forecast CPK
  useEffect(() => {
    const newAlerts: CpkAlert[] = [];
    const now = new Date();

    // Current CPK alerts
    if (currentCpk < config.criticalThreshold) {
      newAlerts.push({
        id: `current-critical-${now.getTime()}`,
        type: "critical",
        title: "CPK Nguy hiểm",
        message: `CPK hiện tại (${currentCpk.toFixed(3)}) dưới ngưỡng nguy hiểm (${config.criticalThreshold})`,
        cpkValue: currentCpk,
        threshold: config.criticalThreshold,
        timestamp: now,
        productionLine: productionLineName,
        product: productName,
        acknowledged: false,
      });
    } else if (currentCpk < config.warningThreshold) {
      newAlerts.push({
        id: `current-warning-${now.getTime()}`,
        type: "warning",
        title: "CPK Cảnh báo",
        message: `CPK hiện tại (${currentCpk.toFixed(3)}) dưới ngưỡng cảnh báo (${config.warningThreshold})`,
        cpkValue: currentCpk,
        threshold: config.warningThreshold,
        timestamp: now,
        productionLine: productionLineName,
        product: productName,
        acknowledged: false,
      });
    }

    // Forecast CPK alerts
    if (forecastCpk && forecastDate) {
      if (forecastCpk < config.criticalThreshold) {
        newAlerts.push({
          id: `forecast-critical-${now.getTime()}`,
          type: "forecast",
          title: "Dự báo CPK Nguy hiểm",
          message: `CPK dự báo (${forecastCpk.toFixed(3)}) sẽ giảm dưới ngưỡng nguy hiểm vào ${format(forecastDate, "dd/MM/yyyy", { locale: vi })}`,
          cpkValue: forecastCpk,
          threshold: config.criticalThreshold,
          timestamp: now,
          forecastDate,
          productionLine: productionLineName,
          product: productName,
          acknowledged: false,
        });
      } else if (forecastCpk < config.warningThreshold) {
        newAlerts.push({
          id: `forecast-warning-${now.getTime()}`,
          type: "forecast",
          title: "Dự báo CPK Cảnh báo",
          message: `CPK dự báo (${forecastCpk.toFixed(3)}) sẽ giảm dưới ngưỡng cảnh báo vào ${format(forecastDate, "dd/MM/yyyy", { locale: vi })}`,
          cpkValue: forecastCpk,
          threshold: config.warningThreshold,
          timestamp: now,
          forecastDate,
          productionLine: productionLineName,
          product: productName,
          acknowledged: false,
        });
      }
    }

    // Only add new alerts if they don't already exist
    setAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.type + a.threshold));
      const filteredNew = newAlerts.filter((a) => !existingIds.has(a.type + a.threshold));
      
      // Play sound for new critical/warning alerts
      if (config.enableSound && filteredNew.length > 0) {
        const hasCritical = filteredNew.some((a) => a.type === "critical" || (a.type === "forecast" && a.cpkValue < config.criticalThreshold));
        playAlertSound(hasCritical ? "critical" : "warning");
      }

      return [...prev.filter((a) => !a.acknowledged), ...filteredNew];
    });
  }, [currentCpk, forecastCpk, forecastDate, config, productionLineName, productName]);

  // Handle acknowledge
  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    onAlertAcknowledge?.(alertId);
    toast.success("Đã xác nhận cảnh báo");
  };

  // Handle acknowledge all
  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    toast.success("Đã xác nhận tất cả cảnh báo");
  };

  // Update config
  const updateConfig = (updates: Partial<AlertConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // Add email recipient
  const addEmailRecipient = () => {
    if (newEmailRecipient && !config.emailRecipients.includes(newEmailRecipient)) {
      updateConfig({
        emailRecipients: [...config.emailRecipients, newEmailRecipient],
      });
      setNewEmailRecipient("");
    }
  };

  // Remove email recipient
  const removeEmailRecipient = (email: string) => {
    updateConfig({
      emailRecipients: config.emailRecipients.filter((e) => e !== email),
    });
  };

  // Unacknowledged alerts count
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  // CPK health indicator
  const cpkHealth = useMemo(() => {
    const ratio = currentCpk / config.warningThreshold;
    return Math.min(100, Math.max(0, ratio * 100));
  }, [currentCpk, config.warningThreshold]);

  return (
    <Card className={currentStatus === "critical" ? "border-destructive" : currentStatus === "warning" ? "border-yellow-500" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {currentStatus === "critical" ? (
                <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
              ) : currentStatus === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              Cảnh báo CPK
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unacknowledgedCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {productionLineName && <span>{productionLineName}</span>}
              {productName && <span> - {productName}</span>}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateConfig({ enableSound: !config.enableSound })}
            >
              {config.enableSound ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current CPK Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">CPK hiện tại</span>
            <span
              className={`text-2xl font-bold ${
                currentStatus === "critical"
                  ? "text-destructive"
                  : currentStatus === "warning"
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {currentCpk.toFixed(3)}
            </span>
          </div>
          <Progress
            value={cpkHealth}
            className={`h-2 ${
              currentStatus === "critical"
                ? "[&>div]:bg-destructive"
                : currentStatus === "warning"
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-green-500"
            }`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-yellow-600">Cảnh báo: {config.warningThreshold}</span>
            <span className="text-destructive">Nguy hiểm: {config.criticalThreshold}</span>
            <span>2.0</span>
          </div>
        </div>

        {/* Forecast Status */}
        {forecastCpk && forecastDate && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Dự báo ({format(forecastDate, "dd/MM/yyyy", { locale: vi })})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPK dự báo</span>
              <div className="flex items-center gap-2">
                {forecastCpk < currentCpk ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span
                  className={`text-lg font-bold ${
                    forecastStatus === "critical"
                      ? "text-destructive"
                      : forecastStatus === "warning"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {forecastCpk.toFixed(3)}
                </span>
              </div>
            </div>
            {forecastStatus && forecastStatus !== "good" && (
              <div
                className={`text-xs ${
                  forecastStatus === "critical" ? "text-destructive" : "text-yellow-600"
                }`}
              >
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                CPK dự báo sẽ {forecastStatus === "critical" ? "nguy hiểm" : "cần chú ý"}
              </div>
            )}
          </div>
        )}

        {/* Active Alerts */}
        {alerts.filter((a) => !a.acknowledged).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Cảnh báo đang hoạt động</h4>
              <Button variant="ghost" size="sm" onClick={handleAcknowledgeAll}>
                Xác nhận tất cả
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {alerts
                .filter((a) => !a.acknowledged)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.type === "critical"
                        ? "border-destructive bg-destructive/10"
                        : alert.type === "warning"
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-blue-500 bg-blue-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              alert.type === "critical"
                                ? "text-destructive"
                                : alert.type === "warning"
                                ? "text-yellow-600"
                                : "text-blue-600"
                            }`}
                          />
                          <span className="font-medium text-sm">{alert.title}</span>
                          <Badge
                            variant={
                              alert.type === "critical"
                                ? "destructive"
                                : alert.type === "warning"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {alert.type === "forecast" ? "Dự báo" : alert.type === "critical" ? "Nguy hiểm" : "Cảnh báo"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(alert.timestamp, "HH:mm:ss dd/MM/yyyy", { locale: vi })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No alerts */}
        {alerts.filter((a) => !a.acknowledged).length === 0 && currentStatus === "good" && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Không có cảnh báo</p>
            <p className="text-xs">CPK đang trong giới hạn cho phép</p>
          </div>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cài đặt cảnh báo CPK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Thresholds */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Ngưỡng cảnh báo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ngưỡng cảnh báo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.warningThreshold}
                    onChange={(e) =>
                      updateConfig({ warningThreshold: parseFloat(e.target.value) || 1.33 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngưỡng nguy hiểm</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.criticalThreshold}
                    onChange={(e) =>
                      updateConfig({ criticalThreshold: parseFloat(e.target.value) || 1.0 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="space-y-2">
              <Label>Số ngày dự báo</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={config.forecastHorizon}
                onChange={(e) =>
                  updateConfig({ forecastHorizon: parseInt(e.target.value) || 7 })
                }
              />
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Thông báo</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <Label>Âm thanh cảnh báo</Label>
                  </div>
                  <Switch
                    checked={config.enableSound}
                    onCheckedChange={(checked) => updateConfig({ enableSound: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label>Gửi email</Label>
                  </div>
                  <Switch
                    checked={config.enableEmail}
                    onCheckedChange={(checked) => updateConfig({ enableEmail: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <Label>Gửi SMS</Label>
                  </div>
                  <Switch
                    checked={config.enableSms}
                    onCheckedChange={(checked) => updateConfig({ enableSms: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Email recipients */}
            {config.enableEmail && (
              <div className="space-y-2">
                <Label>Người nhận email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newEmailRecipient}
                    onChange={(e) => setNewEmailRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmailRecipient()}
                  />
                  <Button onClick={addEmailRecipient}>Thêm</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.emailRecipients.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button onClick={() => removeEmailRecipient(email)}>
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Auto acknowledge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tự động xác nhận</Label>
                <Switch
                  checked={config.autoAcknowledge}
                  onCheckedChange={(checked) => updateConfig({ autoAcknowledge: checked })}
                />
              </div>
              {config.autoAcknowledge && (
                <div className="space-y-2">
                  <Label>Sau (phút)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.autoAcknowledgeDelay}
                    onChange={(e) =>
                      updateConfig({ autoAcknowledgeDelay: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
