import { useState, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle2, TrendingDown, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: "cpk_warning" | "cpk_critical" | "spc_violation" | "plan_status" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    cpk?: number;
    threshold?: number;
    productCode?: string;
    stationName?: string;
    planName?: string;
  };
}

// Global notification store
let notifications: Notification[] = [];
let listeners: ((n: Notification[]) => void)[] = [];

export function addNotification(notification: Omit<Notification, "id" | "timestamp" | "read">) {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
    read: false,
  };
  notifications = [newNotification, ...notifications].slice(0, 50); // Keep last 50
  listeners.forEach(l => l([...notifications]));
}

export function markAsRead(id: string) {
  notifications = notifications.map(n => 
    n.id === id ? { ...n, read: true } : n
  );
  listeners.forEach(l => l([...notifications]));
}

export function markAllAsRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  listeners.forEach(l => l([...notifications]));
}

export function clearAllNotifications() {
  notifications = [];
  listeners.forEach(l => l([...notifications]));
}

export function useNotifications() {
  const [state, setState] = useState<Notification[]>(notifications);
  
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);
  
  return {
    notifications: state,
    unreadCount: state.filter(n => !n.read).length,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  };
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "cpk_critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "cpk_warning":
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case "spc_violation":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "plan_status":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBgColor = (type: Notification["type"], read: boolean) => {
    if (read) return "bg-muted/30";
    switch (type) {
      case "cpk_critical":
        return "bg-red-50 dark:bg-red-950/30";
      case "cpk_warning":
        return "bg-yellow-50 dark:bg-yellow-950/30";
      case "spc_violation":
        return "bg-orange-50 dark:bg-orange-950/30";
      default:
        return "bg-blue-50 dark:bg-blue-950/30";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Thông báo</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Đánh dấu đã đọc
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearAllNotifications}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>Không có thông báo</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    getBgColor(notification.type, notification.read)
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.data?.cpk !== undefined && (
                        <p className="text-xs mt-1">
                          CPK: <span className={cn(
                            "font-medium",
                            notification.type === "cpk_critical" ? "text-red-600" :
                            notification.type === "cpk_warning" ? "text-yellow-600" : "text-green-600"
                          )}>
                            {notification.data.cpk.toFixed(3)}
                          </span>
                          {notification.data.threshold && (
                            <span className="text-muted-foreground">
                              {" "}(Ngưỡng: {notification.data.threshold.toFixed(2)})
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
