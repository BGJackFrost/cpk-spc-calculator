import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadMoreButtonProps {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Function to load more items */
  onLoadMore: () => void;
  /** Function to refresh/reset */
  onRefresh?: () => void;
  /** Total count of items */
  totalCount?: number;
  /** Current loaded count */
  loadedCount: number;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  /** Button size */
  size?: 'default' | 'sm' | 'lg';
  /** Custom className */
  className?: string;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Custom load more text */
  loadMoreText?: string;
  /** Custom no more text */
  noMoreText?: string;
}

/**
 * LoadMoreButton component for cursor-based pagination
 * Shows load more button with progress indicator
 */
export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  onRefresh,
  totalCount,
  loadedCount,
  variant = 'outline',
  size = 'default',
  className,
  showRefresh = true,
  loadMoreText = 'Tải thêm',
  noMoreText = 'Đã hiển thị tất cả',
}: LoadMoreButtonProps) {
  const progress = totalCount ? Math.round((loadedCount / totalCount) * 100) : null;

  return (
    <div className={cn('flex flex-col items-center gap-2 py-4', className)}>
      {/* Progress indicator */}
      {totalCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          Đang hiển thị {loadedCount} / {totalCount} mục
          {progress !== null && ` (${progress}%)`}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {hasMore ? (
          <Button
            variant={variant}
            size={size}
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                {loadMoreText}
              </>
            )}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{noMoreText}</span>
        )}

        {showRefresh && onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount !== undefined && progress !== null && (
        <div className="w-full max-w-xs">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LoadMoreButton;
