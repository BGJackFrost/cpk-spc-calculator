/**
 * OfflineIndicator - Global offline status banner with auto-retry mechanism
 * Shows a banner when network connection is lost and auto-retries when online
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'reconnected';

interface OfflineIndicatorProps {
  className?: string;
  showReconnectedMessage?: boolean;
  reconnectedMessageDuration?: number;
}

function OfflineIndicatorComponent({
  className,
  showReconnectedMessage = true,
  reconnectedMessageDuration = 3000
}: OfflineIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const utils = trpc.useUtils();

  // Check if browser is online
  const checkOnlineStatus = useCallback(() => {
    return navigator.onLine;
  }, []);

  // Handle retry logic
  const handleRetry = useCallback(async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setStatus('reconnecting');
    
    try {
      // Try to invalidate queries to test connection
      await utils.auth.me.invalidate();
      
      // If successful, we're back online
      setStatus('reconnected');
      setRetryCount(0);
      
      // Invalidate all queries to refresh data
      await utils.invalidate();
      
      // Hide reconnected message after duration
      if (showReconnectedMessage) {
        setTimeout(() => {
          setStatus('online');
        }, reconnectedMessageDuration);
      } else {
        setStatus('online');
      }
    } catch (error) {
      // Still offline
      setStatus('offline');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, utils, showReconnectedMessage, reconnectedMessageDuration]);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (status !== 'offline') return;
    
    // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
    
    const timer = setTimeout(() => {
      if (checkOnlineStatus()) {
        handleRetry();
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [status, retryCount, checkOnlineStatus, handleRetry]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      handleRetry();
    };
    
    const handleOffline = () => {
      setStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    if (!checkOnlineStatus()) {
      setStatus('offline');
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkOnlineStatus, handleRetry]);

  // Don't render if online
  if (status === 'online') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] transition-all duration-300',
        status === 'reconnected' && 'animate-slide-down',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium',
          status === 'offline' && 'bg-destructive text-destructive-foreground',
          status === 'reconnecting' && 'bg-warning text-warning-foreground',
          status === 'reconnected' && 'bg-green-500 text-white'
        )}
      >
        {status === 'offline' && (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Mất kết nối mạng. Đang thử kết nối lại...</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Thử lại
                </>
              )}
            </Button>
            {retryCount > 0 && (
              <span className="text-xs opacity-75">
                (Lần thử: {retryCount})
              </span>
            )}
          </>
        )}
        
        {status === 'reconnecting' && (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Đang kết nối lại...</span>
          </>
        )}
        
        {status === 'reconnected' && (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>Đã kết nối lại thành công!</span>
          </>
        )}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const OfflineIndicator = memo(OfflineIndicatorComponent);
export default OfflineIndicator;
