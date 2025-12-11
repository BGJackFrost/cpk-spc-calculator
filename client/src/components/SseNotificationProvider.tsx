import { useEffect } from "react";
import { toast } from "sonner";
import { useSSE } from "@/hooks/useSSE";
import { AlertTriangle, CheckCircle2, TrendingUp, Bell } from "lucide-react";

interface SseNotificationProviderProps {
  children: React.ReactNode;
}

export function SseNotificationProvider({ children }: SseNotificationProviderProps) {
  const { isConnected } = useSSE({
    onSpcAnalysisComplete: (data) => {
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
    onConnect: () => {
      // Optional: Show connection toast
      // toast.success("Đã kết nối realtime", { duration: 2000 });
    },
    onDisconnect: () => {
      // Optional: Show disconnection toast
      // toast.error("Mất kết nối realtime", { duration: 3000 });
    },
  });

  return <>{children}</>;
}

export default SseNotificationProvider;
