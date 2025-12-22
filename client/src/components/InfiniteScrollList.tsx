import React, { useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollListProps<T> {
  /** Items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor function */
  keyExtractor: (item: T, index: number) => string | number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading more */
  isLoading: boolean;
  /** Function to load more items */
  onLoadMore: () => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom end message */
  endMessage?: React.ReactNode;
  /** Custom empty message */
  emptyMessage?: React.ReactNode;
  /** Container className */
  className?: string;
  /** Item wrapper className */
  itemClassName?: string;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
}

/**
 * InfiniteScrollList component for cursor-based pagination
 * Automatically loads more items when scrolling near the bottom
 */
export function InfiniteScrollList<T>({
  items,
  renderItem,
  keyExtractor,
  hasMore,
  isLoading,
  onLoadMore,
  loadingComponent,
  endMessage,
  emptyMessage,
  className,
  itemClassName,
  rootMargin = '200px',
  threshold = 0.1,
}: InfiniteScrollListProps<T>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin,
      threshold,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, rootMargin, threshold]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        {emptyMessage || (
          <p className="text-muted-foreground">Không có dữ liệu</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Load more trigger element */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          {loadingComponent || (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải thêm...</span>
            </div>
          )}
        </div>
      )}

      {/* End message */}
      {!hasMore && items.length > 0 && !isLoading && (
        <div className="flex items-center justify-center py-4">
          {endMessage || (
            <p className="text-sm text-muted-foreground">
              Đã hiển thị tất cả {items.length} mục
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default InfiniteScrollList;
