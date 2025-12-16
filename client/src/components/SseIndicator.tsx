import { Radio, Loader2, RefreshCw, WifiOff } from "lucide-react";
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
import { useSSE } from "@/hooks/useSSE";
import { useState, useEffect, useCallback } from "react";

// Global SSE state for external access
let globalSseEnabled = true;
let globalSseEnabledListeners: Set<(enabled: boolean) => void> = new Set();

export function getSseEnabled(): boolean {
  return globalSseEnabled;
}

export function setSseEnabled(enabled: boolean): void {
  globalSseEnabled = enabled;
  localStorage.setItem('sse_enabled', enabled ? 'true' : 'false');
  globalSseEnabledListeners.forEach(listener => listener(enabled));
}

export function useSseEnabled() {
  const [enabled, setEnabled] = useState(globalSseEnabled);
  
  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('sse_enabled');
    if (stored !== null) {
      globalSseEnabled = stored !== 'false'; // Default to true
      setEnabled(globalSseEnabled);
    }
    
    const listener = (newEnabled: boolean) => setEnabled(newEnabled);
    globalSseEnabledListeners.add(listener);
    
    // Listen for toggle events from Settings page
    const handleToggle = (event: CustomEvent<{ enabled: boolean }>) => {
      globalSseEnabled = event.detail.enabled;
      setEnabled(event.detail.enabled);
      globalSseEnabledListeners.forEach(l => l(event.detail.enabled));
    };
    window.addEventListener('sse-toggle', handleToggle as EventListener);
    
    return () => {
      globalSseEnabledListeners.delete(listener);
      window.removeEventListener('sse-toggle', handleToggle as EventListener);
    };
  }, []);
  
  return enabled;
}

export function SseIndicator() {
  const sseEnabled = useSseEnabled();
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const { 
    isConnected, 
    connectionError,
    connect,
    disconnect,
  } = useSSE({
    enabled: sseEnabled,
    onHeartbeat: () => {
      setLastHeartbeat(new Date());
    },
    onConnect: () => {
      setIsReconnecting(false);
    },
    onDisconnect: () => {
      // Don't set reconnecting if disabled
    },
  });

  const { data: sseStatus } = trpc.system.getSseStatus.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
  });

  const handleReconnect = useCallback(() => {
    setIsReconnecting(true);
    disconnect();
    setTimeout(() => {
      connect();
    }, 500);
  }, [connect, disconnect]);

  // SSE is disabled by user
  if (!sseEnabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 cursor-default">
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>SSE đã tắt</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

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
      icon: <Radio className="h-4 w-4" />,
      status: 'Đã kết nối',
    };
  };

  const statusInfo = getStatusInfo();
  
  // Calculate time since last heartbeat
  const getTimeSinceHeartbeat = () => {
    if (!lastHeartbeat) return '—';
    const seconds = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s trước`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m trước`;
  };

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
            <span className="font-medium">SSE Realtime</span>
            <span className={`text-sm ${statusInfo.iconColor}`}>{statusInfo.status}</span>
          </div>
          
          {/* Last heartbeat */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Heartbeat cuối</span>
            <span>{getTimeSinceHeartbeat()}</span>
          </div>
          
          {/* Server clients */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Server clients</span>
            <span>{sseStatus?.clientCount ?? '—'}</span>
          </div>
          
          {/* Error */}
          {connectionError && (
            <div className="text-sm text-red-500">
              {connectionError}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleReconnect}
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

export default SseIndicator;
