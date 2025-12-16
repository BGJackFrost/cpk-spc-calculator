import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRealtimeWebSocket } from "@/hooks/useRealtimeWebSocket";

export function WebSocketIndicator() {
  const { data: wsStatus, isLoading } = trpc.system.getWebSocketStatus.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  const { isConnected, wsEnabled } = useRealtimeWebSocket({
    channels: [], // Don't subscribe to any channels, just check status
    autoReconnect: false,
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
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50">
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

  // Server enabled but client not connected
  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10">
              <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Đang kết nối WebSocket...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Connected
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10">
            <Wifi className="h-4 w-4 text-green-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>WebSocket đã kết nối ({wsStatus?.clientCount} clients)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default WebSocketIndicator;
