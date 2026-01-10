import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Configuration cho retry mechanism
 */
export interface RetryConfig {
  /** Số lần retry tối đa (mặc định: 3) */
  maxRetries?: number;
  /** Thời gian chờ ban đầu giữa các lần retry (ms, mặc định: 1000) */
  initialDelay?: number;
  /** Hệ số nhân cho exponential backoff (mặc định: 2) */
  backoffMultiplier?: number;
  /** Thời gian chờ tối đa giữa các lần retry (ms, mặc định: 30000) */
  maxDelay?: number;
  /** Có hiển thị toast notification không (mặc định: true) */
  showToast?: boolean;
  /** Các error codes không nên retry (vd: 401, 403) */
  noRetryOnCodes?: number[];
  /** Callback khi retry thành công */
  onRetrySuccess?: () => void;
  /** Callback khi hết số lần retry */
  onRetryExhausted?: (error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  showToast: true,
  noRetryOnCodes: [401, 403, 404],
  onRetrySuccess: () => {},
  onRetryExhausted: () => {},
};

/**
 * Tính toán delay cho lần retry tiếp theo với exponential backoff
 */
function calculateDelay(
  retryCount: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, retryCount);
  // Thêm jitter để tránh thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Kiểm tra xem error có nên retry không
 */
function shouldRetry(error: unknown, noRetryOnCodes: number[]): boolean {
  if (!error) return false;
  
  // Không retry nếu là lỗi authentication/authorization
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("unauthorized") || message.includes("forbidden")) {
      return false;
    }
  }
  
  // Kiểm tra HTTP status code nếu có
  const anyError = error as { data?: { httpStatus?: number }; status?: number };
  const statusCode = anyError?.data?.httpStatus || anyError?.status;
  if (statusCode && noRetryOnCodes.includes(statusCode)) {
    return false;
  }
  
  return true;
}

/**
 * Hook để quản lý retry state
 */
export function useRetryState(config: RetryConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canRetry = retryCount < mergedConfig.maxRetries;

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleRetry = useCallback(
    (error: Error, onRetry: () => void) => {
      if (!shouldRetry(error, mergedConfig.noRetryOnCodes)) {
        setLastError(error);
        return false;
      }

      if (retryCount >= mergedConfig.maxRetries) {
        setLastError(error);
        mergedConfig.onRetryExhausted(error);
        if (mergedConfig.showToast) {
          toast.error("Đã hết số lần thử lại", {
            description: "Vui lòng kiểm tra kết nối mạng và thử lại sau",
          });
        }
        return false;
      }

      setIsRetrying(true);
      setLastError(error);

      const delay = calculateDelay(
        retryCount,
        mergedConfig.initialDelay,
        mergedConfig.backoffMultiplier,
        mergedConfig.maxDelay
      );

      if (mergedConfig.showToast) {
        toast.info(`Đang thử lại... (${retryCount + 1}/${mergedConfig.maxRetries})`, {
          description: `Thử lại sau ${Math.round(delay / 1000)} giây`,
          duration: delay,
        });
      }

      timeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setIsRetrying(false);
        onRetry();
      }, delay);

      return true;
    },
    [retryCount, mergedConfig]
  );

  const onSuccess = useCallback(() => {
    if (retryCount > 0) {
      mergedConfig.onRetrySuccess();
      if (mergedConfig.showToast) {
        toast.success("Đã kết nối lại thành công");
      }
    }
    reset();
  }, [retryCount, mergedConfig, reset]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    retryCount,
    isRetrying,
    canRetry,
    lastError,
    scheduleRetry,
    onSuccess,
    reset,
    maxRetries: mergedConfig.maxRetries,
  };
}

/**
 * Hook wrapper cho tRPC queries với retry mechanism
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, retry, retryState } = useQueryWithRetry(
 *   trpc.someQuery.useQuery,
 *   { someParam: "value" },
 *   { maxRetries: 5 }
 * );
 * 
 * if (error && !retryState.canRetry) {
 *   return <ApiErrorFallback error={error} onRetry={retry} />;
 * }
 * ```
 */
export function useQueryWithRetry<TData, TError>(
  queryResult: {
    data: TData | undefined;
    error: TError | null;
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<unknown>;
  },
  config: RetryConfig = {}
) {
  const retryState = useRetryState(config);

  const retry = useCallback(async () => {
    try {
      await queryResult.refetch();
    } catch (error) {
      // Error will be handled by the query itself
    }
  }, [queryResult]);

  // Handle error and schedule retry
  useEffect(() => {
    if (queryResult.isError && queryResult.error) {
      retryState.scheduleRetry(queryResult.error as Error, retry);
    }
  }, [queryResult.isError, queryResult.error]);

  // Handle success after retry
  useEffect(() => {
    if (!queryResult.isError && !queryResult.isLoading && queryResult.data !== undefined) {
      retryState.onSuccess();
    }
  }, [queryResult.isError, queryResult.isLoading, queryResult.data]);

  return {
    ...queryResult,
    retry,
    retryState: {
      retryCount: retryState.retryCount,
      isRetrying: retryState.isRetrying,
      canRetry: retryState.canRetry,
      maxRetries: retryState.maxRetries,
      lastError: retryState.lastError,
    },
  };
}

/**
 * Hook wrapper cho tRPC mutations với retry mechanism
 * 
 * @example
 * ```tsx
 * const { mutate, mutateAsync, retryState } = useMutationWithRetry(
 *   trpc.someMutation.useMutation,
 *   { maxRetries: 2 }
 * );
 * ```
 */
export function useMutationWithRetry<TData, TError, TVariables>(
  mutationResult: {
    mutate: (variables: TVariables) => void;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    error: TError | null;
    isError: boolean;
    isPending: boolean;
    reset: () => void;
  },
  config: RetryConfig = {}
) {
  const retryState = useRetryState(config);
  const lastVariablesRef = useRef<TVariables | null>(null);

  const mutateWithRetry = useCallback(
    (variables: TVariables) => {
      lastVariablesRef.current = variables;
      retryState.reset();
      mutationResult.mutate(variables);
    },
    [mutationResult, retryState]
  );

  const mutateAsyncWithRetry = useCallback(
    async (variables: TVariables): Promise<TData> => {
      lastVariablesRef.current = variables;
      retryState.reset();
      return mutationResult.mutateAsync(variables);
    },
    [mutationResult, retryState]
  );

  const retry = useCallback(() => {
    if (lastVariablesRef.current !== null) {
      mutationResult.mutate(lastVariablesRef.current);
    }
  }, [mutationResult]);

  // Handle error and schedule retry
  useEffect(() => {
    if (mutationResult.isError && mutationResult.error) {
      retryState.scheduleRetry(mutationResult.error as Error, retry);
    }
  }, [mutationResult.isError, mutationResult.error]);

  return {
    ...mutationResult,
    mutate: mutateWithRetry,
    mutateAsync: mutateAsyncWithRetry,
    retry,
    retryState: {
      retryCount: retryState.retryCount,
      isRetrying: retryState.isRetrying,
      canRetry: retryState.canRetry,
      maxRetries: retryState.maxRetries,
      lastError: retryState.lastError,
    },
  };
}

/**
 * Utility function để wrap một async function với retry logic
 * 
 * @example
 * ```ts
 * const fetchWithRetry = withRetry(
 *   async () => await fetch('/api/data'),
 *   { maxRetries: 3 }
 * );
 * const result = await fetchWithRetry();
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0 && mergedConfig.showToast) {
        toast.success("Đã kết nối lại thành công");
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (!shouldRetry(error, mergedConfig.noRetryOnCodes)) {
        throw error;
      }

      if (attempt < mergedConfig.maxRetries) {
        const delay = calculateDelay(
          attempt,
          mergedConfig.initialDelay,
          mergedConfig.backoffMultiplier,
          mergedConfig.maxDelay
        );

        if (mergedConfig.showToast) {
          toast.info(`Đang thử lại... (${attempt + 1}/${mergedConfig.maxRetries})`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  mergedConfig.onRetryExhausted(lastError!);
  throw lastError;
}
