import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSSE } from "@/hooks/useSSE";
import { AlertTriangle, CheckCircle2, TrendingUp, Bell, Gauge, Server, Activity } from "lucide-react";
import { addNotification } from "./NotificationBell";
import { useSseEnabled } from "./SseIndicator";
import { alertSoundService, AlertType } from "@/services/alertSoundService";

// Get notification preferences from localStorage
function getNotificationPrefs() {
  const stored = localStorage.getItem('sse_notification_prefs');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultNotificationPrefs();
    }
  }
  return getDefaultNotificationPrefs();
}

function getDefaultNotificationPrefs() {
  return {
    spc_analysis_complete: true,
    cpk_alert: true,
    plan_status_change: true,
    oee_update: true,
    machine_status_change: true,
    maintenance_alert: true,
    realtime_alert: true,
  };
}

interface SseNotificationProviderProps {
  children: React.ReactNode;
}

export function SseNotificationProvider({ children }: SseNotificationProviderProps) {
  const sseEnabled = useSseEnabled();
  const [notificationPrefs, setNotificationPrefs] = useState(getNotificationPrefs);
  
  // Listen for notification preferences changes
  useEffect(() => {
    const handlePrefsChange = (event: CustomEvent<any>) => {
      setNotificationPrefs(event.detail);
    };
    window.addEventListener('sse-notification-prefs-change', handlePrefsChange as EventListener);
    return () => {
      window.removeEventListener('sse-notification-prefs-change', handlePrefsChange as EventListener);
    };
  }, []);

  // Play alert sound helper
  const playAlertSound = useCallback((alertType: AlertType) => {
    try {
      alertSoundService.playAlertSound(alertType);
    } catch (e) {
      console.warn('[SseNotificationProvider] Error playing sound:', e);
    }
  }, []);

  // Determine SPC alert type based on CPK value
  const getSpcAlertType = useCallback((cpk: number | undefined, severity?: string): AlertType => {
    if (severity === 'critical' || (cpk !== undefined && cpk < 1.0)) {
      return 'cpk_critical';
    }
    if (cpk !== undefined && cpk < 1.33) {
      return 'cpk_low';
    }
    return 'general';
  }, []);

  // Determine OEE alert type
  const getOeeAlertType = useCallback((type: string, value?: number): AlertType => {
    switch (type) {
      case 'availability':
        return 'availability_low';
      case 'performance':
        return 'performance_low';
      case 'quality':
        return 'quality_low';
      case 'oee':
        return value !== undefined && value < 50 ? 'oee_critical' : 'performance_low';
      case 'downtime_start':
        return 'downtime_start';
      case 'downtime_extended':
        return 'downtime_extended';
      default:
        return 'general';
    }
  }, []);
  
  const { isConnected } = useSSE({
    enabled: sseEnabled,
    onSpcAnalysisComplete: (data) => {
      if (!notificationPrefs.spc_analysis_complete) return;
      
      // Determine alert type and play sound
      const alertType = data.alertTriggered 
        ? getSpcAlertType(data.cpk) 
        : 'general';
      
      if (data.alertTriggered) {
        playAlertSound(alertType);
      }
      
      // Add to notification store
      addNotification({
        type: data.alertTriggered ? "cpk_warning" : "info",
        title: data.alertTriggered ? "Phân tích SPC - Cảnh báo!" : "Phân tích SPC hoàn thành",
        message: `${data.productCode} - ${data.stationName}`,
        data: {
          cpk: data.cpk,
          productCode: data.productCode,
          stationName: data.stationName,
        },
      });
      
      if (data.alertTriggered) {
        toast.warning(
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-semibold">Phân tích SPC hoàn thành - Cảnh báo!</p>
              <p className="text-sm text-muted-foreground">
                {data.productCode} - {data.stationName}
              </p>
              <p className="text-sm">
                CPK: <span className="font-medium text-yellow-600">{data.cpk?.toFixed(3) || "N/A"}</span>
              </p>
            </div>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success(
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Phân tích SPC hoàn thành</p>
              <p className="text-sm text-muted-foreground">
                {data.productCode} - {data.stationName}
              </p>
              <p className="text-sm">
                CPK: <span className="font-medium text-green-600">{data.cpk?.toFixed(3) || "N/A"}</span>
              </p>
            </div>
          </div>,
          { duration: 5000 }
        );
      }
    },
    onCpkAlert: (data) => {
      if (!notificationPrefs.cpk_alert) return;
      
      // Determine alert type and play sound
      const alertType = getSpcAlertType(data.cpk, data.severity);
      playAlertSound(alertType);
      
      // Add to notification store
      addNotification({
        type: data.severity === "critical" ? "cpk_critical" : "cpk_warning",
        title: data.severity === "critical" ? "Cảnh báo CPK nghiêm trọng!" : "Cảnh báo CPK",
        message: `${data.productCode} - ${data.stationName}`,
        data: {
          cpk: data.cpk,
          threshold: data.threshold,
          productCode: data.productCode,
          stationName: data.stationName,
        },
      });
      
      const severity = data.severity === "critical" ? "error" : "warning";
      const Icon = data.severity === "critical" ? AlertTriangle : Bell;
      const color = data.severity === "critical" ? "text-red-500" : "text-yellow-500";
      
      toast[severity](
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${color} mt-0.5`} />
          <div>
            <p className="font-semibold">
              {data.severity === "critical" ? "Cảnh báo CPK nghiêm trọng!" : "Cảnh báo CPK"}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.productCode} - {data.stationName}
            </p>
            <p className="text-sm">
              CPK: <span className={`font-medium ${data.severity === "critical" ? "text-red-600" : "text-yellow-600"}`}>
                {data.cpk?.toFixed(3)}
              </span>
              {" "}(Ngưỡng: {data.threshold?.toFixed(2)})
            </p>
          </div>
        </div>,
        { duration: 10000 }
      );
    },
    onPlanStatusChange: (data) => {
      if (!notificationPrefs.plan_status_change) return;
      
      // Add to notification store
      addNotification({
        type: "plan_status",
        title: "Trạng thái kế hoạch thay đổi",
        message: `${data.planName}: ${data.oldStatus} → ${data.newStatus}`,
        data: {
          planName: data.planName,
        },
      });
      
      toast.info(
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="font-semibold">Trạng thái kế hoạch thay đổi</p>
            <p className="text-sm text-muted-foreground">{data.planName}</p>
            <p className="text-sm">
              {data.oldStatus} → <span className="font-medium">{data.newStatus}</span>
            </p>
          </div>
        </div>,
        { duration: 5000 }
      );
    },
    onOeeUpdate: (data: any) => {
      if (!notificationPrefs.oee_update) return;
      
      // Check for alerts
      const hasAlert = data.alert || 
        (data.oee !== undefined && data.oee < 65) ||
        (data.availability !== undefined && data.availability < 85) ||
        (data.performance !== undefined && data.performance < 80) ||
        (data.quality !== undefined && data.quality < 95);
      
      if (hasAlert) {
        // Determine which metric triggered the alert
        let alertType: AlertType = 'general';
        let alertMessage = '';
        
        if (data.oee !== undefined && data.oee < 50) {
          alertType = 'oee_critical';
          alertMessage = `OEE: ${data.oee.toFixed(1)}%`;
        } else if (data.availability !== undefined && data.availability < 85) {
          alertType = 'availability_low';
          alertMessage = `Availability: ${data.availability.toFixed(1)}%`;
        } else if (data.performance !== undefined && data.performance < 80) {
          alertType = 'performance_low';
          alertMessage = `Performance: ${data.performance.toFixed(1)}%`;
        } else if (data.quality !== undefined && data.quality < 95) {
          alertType = 'quality_low';
          alertMessage = `Quality: ${data.quality.toFixed(1)}%`;
        }
        
        playAlertSound(alertType);
        
        // Add to notification store
        addNotification({
          type: "oee_alert",
          title: "Cảnh báo OEE",
          message: alertMessage || `${data.machineName || 'Machine'} - OEE Alert`,
          data: {
            oee: data.oee,
            availability: data.availability,
            performance: data.performance,
            quality: data.quality,
          },
        });
        
        toast.warning(
          <div className="flex items-start gap-3">
            <Gauge className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-semibold">Cảnh báo OEE</p>
              <p className="text-sm text-muted-foreground">
                {data.machineName || 'Machine'}
              </p>
              <p className="text-sm">{alertMessage}</p>
            </div>
          </div>,
          { duration: 8000 }
        );
      }
    },
    onMachineStatus: (data: any) => {
      if (!notificationPrefs.machine_status_change) return;
      
      // Play sound for downtime events
      if (data.status === 'down' || data.status === 'offline') {
        playAlertSound('downtime_start');
      }
      
      // Add to notification store
      addNotification({
        type: "machine_status",
        title: `Máy ${data.machineName || 'Unknown'} - ${data.status}`,
        message: data.reason || 'Trạng thái máy thay đổi',
        data: {
          machineName: data.machineName,
          status: data.status,
        },
      });
      
      const Icon = data.status === 'running' ? Activity : Server;
      const color = data.status === 'running' ? 'text-green-500' : 
                    data.status === 'down' ? 'text-red-500' : 'text-yellow-500';
      
      toast.info(
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${color} mt-0.5`} />
          <div>
            <p className="font-semibold">Trạng thái máy thay đổi</p>
            <p className="text-sm text-muted-foreground">
              {data.machineName || 'Machine'}
            </p>
            <p className="text-sm">
              Trạng thái: <span className="font-medium">{data.status}</span>
            </p>
          </div>
        </div>,
        { duration: 5000 }
      );
    },
    onSpcRuleViolation: (data: any) => {
      if (!notificationPrefs.realtime_alert) return;
      
      // Determine alert type based on rule
      let alertType: AlertType = 'rule_violation';
      if (data.rule?.includes('trend')) {
        alertType = 'trend_detected';
      } else if (data.rule?.includes('shift')) {
        alertType = 'shift_detected';
      }
      
      playAlertSound(alertType);
      
      // Add to notification store
      addNotification({
        type: "spc_rule_violation",
        title: `Vi phạm Rule SPC: ${data.rule || 'Unknown'}`,
        message: `${data.productCode || ''} - ${data.stationName || ''}`,
        data: {
          rule: data.rule,
          productCode: data.productCode,
          stationName: data.stationName,
        },
      });
      
      toast.error(
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Vi phạm Rule SPC!</p>
            <p className="text-sm text-muted-foreground">
              {data.productCode} - {data.stationName}
            </p>
            <p className="text-sm">
              Rule: <span className="font-medium text-red-600">{data.rule}</span>
            </p>
          </div>
        </div>,
        { duration: 10000 }
      );
    },
    onKpiAlert: (data: any) => {
      // KPI Alert handler for realtime alerts
      const alertType = data.severity === 'critical' ? 'cpk_critical' : 'cpk_low';
      playAlertSound(alertType);
      
      // Add to notification store
      addNotification({
        type: data.severity === 'critical' ? 'cpk_critical' : 'cpk_warning',
        title: `Cảnh báo KPI: ${data.alertType || 'Unknown'}`,
        message: data.alertMessage || `Giá trị: ${data.currentValue}`,
        data: {
          alertType: data.alertType,
          severity: data.severity,
          currentValue: data.currentValue,
          thresholdValue: data.thresholdValue,
        },
      });
      
      const toastFn = data.severity === 'critical' ? toast.error : toast.warning;
      toastFn(
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${data.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'} mt-0.5`} />
          <div>
            <p className="font-semibold">
              {data.severity === 'critical' ? 'Cảnh báo KPI nghiêm trọng!' : 'Cảnh báo KPI'}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.alertType}
            </p>
            <p className="text-sm">
              Giá trị: <span className={`font-medium ${data.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                {typeof data.currentValue === 'number' ? data.currentValue.toFixed(4) : data.currentValue}
              </span>
            </p>
          </div>
        </div>,
        { duration: 10000 }
      );
    },
    onConnect: () => {
      playAlertSound('connection_restored');
    },
    onDisconnect: () => {
      playAlertSound('connection_lost');
    },
  });

  return <>{children}</>;
}

export default SseNotificationProvider;
