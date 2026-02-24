import { Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRealtimeWebSocket } from "@/hooks/useRealtimeWebSocket";

export function WebSocketIndicator() {
  const { data: wsStatus, isLoading } = trpc.system.getWebSocketStatus.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  const { 
    isConnected, 
    wsEnabled, 
    latency, 
    reconnectAttempts, 
    isReconnecting,
    reconnect,
    sendPing 
  } = useRealtimeWebSocket({
    channels: [], // Don't subscribe to any channels, just check status
    autoReconnect: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-8 h-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Server WebSocket is disabled
  if (!wsStatus?.enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 cursor-default">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>WebSocket đã tắt</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Get latency color
  const getLatencyColor = (ms: number | null) => {
    if (ms === null) return 'text-muted-foreground';
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Get status color and icon
  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        bgColor: 'bg-yellow-500/10',
        iconColor: 'text-yellow-500',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        status: 'Đang kết nối...',
      };
    }
    if (!isConnected) {
      return {
        bgColor: 'bg-red-500/10',
        iconColor: 'text-red-500',
        icon: <WifiOff className="h-4 w-4" />,
        status: 'Mất kết nối',
      };
    }
    return {
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500',
      icon: <Wifi className="h-4 w-4" />,
      status: 'Đã kết nối',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center justify-center w-8 h-8 rounded-full ${statusInfo.bgColor} hover:opacity-80 transition-opacity`}>
          <span className={statusInfo.iconColor}>{statusInfo.icon}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">WebSocket</span>
            <span className={`text-sm ${statusInfo.iconColor}`}>{statusInfo.status}</span>
          </div>
          
          {/* Latency */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Độ trễ (Ping)</span>
            <span className={getLatencyColor(latency)}>
              {latency !== null ? `${latency}ms` : '—'}
            </span>
          </div>
          
          {/* Clients */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Clients</span>
            <span>{wsStatus?.clientCount ?? 0}</span>
          </div>
          
          {/* Reconnect attempts */}
          {reconnectAttempts > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Thử kết nối lại</span>
              <span className="text-yellow-500">{reconnectAttempts} lần</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => sendPing()}
              disabled={!isConnected}
            >
              Ping
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => reconnect()}
              disabled={isReconnecting}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
              Kết nối lại
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default WebSocketIndicator;
