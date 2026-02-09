import { useState, useEffect, useCallback } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * ServiceWorkerUpdater — shows a banner when a new SW version is available
 * and prompts the user to reload.
 */
export function ServiceWorkerUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setSwVersion(event.data.version);
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Check for updates periodically (every 30 min)
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    }, 30 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
      // Reload after a short delay to allow SW to activate
      setTimeout(() => window.location.reload(), 500);
    }
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border bg-card text-card-foreground shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-500/10 p-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Phiên bản mới</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ứng dụng đã được cập nhật{swVersion ? ` (${swVersion})` : ""}. Tải lại để sử dụng phiên bản mới nhất.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default" onClick={handleUpdate} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Tải lại
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setUpdateAvailable(false)} className="h-7 text-xs">
                Để sau
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OfflineIndicator — shows a persistent banner when the user is offline,
 * and a brief toast when coming back online.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
    };

    const goOnline = () => {
      setIsOffline(false);
      // Tell SW to replay queued mutations
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "ONLINE" });
      }
      toast({
        title: "Đã kết nối lại",
        description: pendingCount > 0
          ? `Đang đồng bộ ${pendingCount} thao tác đã lưu...`
          : "Kết nối internet đã được khôi phục.",
        duration: 3000,
      });
      setPendingCount(0);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [pendingCount, toast]);

  // Count pending mutations in IndexedDB
  useEffect(() => {
    if (!isOffline) return;

    const countPending = async () => {
      try {
        const req = indexedDB.open("cpk-spc-offline", 1);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains("pending-mutations")) {
            const tx = db.transaction("pending-mutations", "readonly");
            const countReq = tx.objectStore("pending-mutations").count();
            countReq.onsuccess = () => setPendingCount(countReq.result);
          }
          db.close();
        };
      } catch {
        // IndexedDB not available
      }
    };

    countPending();
    const interval = setInterval(countPending, 5000);
    return () => clearInterval(interval);
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white px-4 py-2 text-center text-sm shadow-md">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="font-medium">Bạn đang offline</span>
        <span className="hidden sm:inline text-amber-100">
          — Dữ liệu đã lưu cache vẫn khả dụng.
          {pendingCount > 0 && ` ${pendingCount} thao tác đang chờ đồng bộ.`}
        </span>
      </div>
    </div>
  );
}

export default { ServiceWorkerUpdater, OfflineIndicator };
