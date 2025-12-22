import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Cursor pagination result type from backend
 */
export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

/**
 * Options for useCursorPagination hook
 */
export interface UseCursorPaginationOptions<T> {
  /** Initial page size */
  pageSize?: number;
  /** Enable infinite scroll mode */
  infiniteScroll?: boolean;
  /** Callback when data changes */
  onDataChange?: (items: T[]) => void;
  /** Initial cursor */
  initialCursor?: string;
}

/**
 * Return type for useCursorPagination hook
 */
export interface UseCursorPaginationReturn<T> {
  /** All loaded items */
  items: T[];
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether loading more (for infinite scroll) */
  isLoadingMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Total count of items (if available) */
  totalCount?: number;
  /** Current cursor */
  cursor: string | null;
  /** Load next page */
  loadMore: () => void;
  /** Load previous page */
  loadPrevious: () => void;
  /** Reset to first page */
  reset: () => void;
  /** Refresh current data */
  refresh: () => void;
  /** Ref for intersection observer (infinite scroll) */
  loadMoreRef: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook for cursor-based pagination
 * Supports both "Load More" button and infinite scroll modes
 */
export function useCursorPagination<T, TQueryResult extends CursorPaginationResult<T>>(
  queryFn: (params: { cursor?: string; limit: number; direction: 'forward' | 'backward' }) => { 
    data?: TQueryResult; 
    isLoading: boolean; 
    error: Error | null;
    refetch: () => void;
  },
  options: UseCursorPaginationOptions<T> = {}
): UseCursorPaginationReturn<T> {
  const { pageSize = 20, infiniteScroll = false, onDataChange, initialCursor } = options;

  const [allItems, setAllItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor || null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Query with current cursor
  const { data, isLoading, error, refetch } = queryFn({
    cursor: cursor || undefined,
    limit: pageSize,
    direction: 'forward',
  });

  // Update items when data changes
  useEffect(() => {
    if (data?.items) {
      if (!hasInitialized || !cursor) {
        // First load or reset - replace all items
        setAllItems(data.items);
        setHasInitialized(true);
      } else if (isLoadingMore) {
        // Loading more - append items
        setAllItems(prev => [...prev, ...data.items]);
        setIsLoadingMore(false);
      }
      
      onDataChange?.(data.items);
    }
  }, [data, cursor, hasInitialized, isLoadingMore, onDataChange]);

  // Load more function
  const loadMore = useCallback(() => {
    if (data?.nextCursor && !isLoading && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor, isLoading, isLoadingMore]);

  // Load previous function
  const loadPrevious = useCallback(() => {
    if (data?.prevCursor && !isLoading) {
      setCursor(data.prevCursor);
    }
  }, [data?.prevCursor, isLoading]);

  // Reset function
  const reset = useCallback(() => {
    setAllItems([]);
    setCursor(null);
    setHasInitialized(false);
    setIsLoadingMore(false);
  }, []);

  // Refresh function
  const refresh = useCallback(() => {
    reset();
    refetch();
  }, [reset, refetch]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!infiniteScroll) return;

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && data?.hasMore && !isLoading && !isLoadingMore) {
        loadMore();
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [infiniteScroll, data?.hasMore, isLoading, isLoadingMore, loadMore]);

  return {
    items: allItems,
    hasMore: data?.hasMore ?? false,
    isLoading: isLoading && !isLoadingMore,
    isLoadingMore,
    error,
    totalCount: data?.totalCount,
    cursor,
    loadMore,
    loadPrevious,
    reset,
    refresh,
    loadMoreRef,
  };
}

export default useCursorPagination;
