import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, WifiOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorHandlerProps {
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Số lần đã retry */
  failureCount?: number;
  /** Có đang trong quá trình retry không */
  isRefetching?: boolean;
  /** Hiển thị inline thay vì toast */
  inline?: boolean;
  /** Custom class name */
  className?: string;
  /** Ẩn component khi không có lỗi */
  hideOnSuccess?: boolean;
}

/**
 * Component hiển thị trạng thái lỗi và retry cho queries
 */
export function QueryErrorHandler({
  error,
  isLoading,
  isError,
  refetch,
  failureCount = 0,
  isRefetching = false,
  inline = false,
  className,
  hideOnSuccess = true,
}: QueryErrorHandlerProps) {
  const [showRetrySuccess, setShowRetrySuccess] = useState(false);
  const [prevFailureCount, setPrevFailureCount] = useState(0);

  // Hiển thị thông báo khi retry thành công
  useEffect(() => {
    if (prevFailureCount > 0 && failureCount === 0 && !isError && !isLoading) {
      setShowRetrySuccess(true);
      toast.success("Đã kết nối lại thành công");
      const timer = setTimeout(() => setShowRetrySuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevFailureCount(failureCount);
  }, [failureCount, isError, isLoading, prevFailureCount]);

  // Hiển thị toast khi đang retry
  useEffect(() => {
    if (isRefetching && failureCount > 0) {
      toast.info(`Đang thử kết nối lại... (lần ${failureCount})`, {
        duration: 2000,
      });
    }
  }, [isRefetching, failureCount]);

  if (hideOnSuccess && !isError && !showRetrySuccess) {
    return null;
  }

  if (showRetrySuccess) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-green-50 border border-green-200 text-green-700",
          "dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
          className
        )}
      >
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Đã kết nối lại thành công</span>
      </div>
    );
  }

  if (!isError) {
    return null;
  }

  const errorMessage = getErrorMessage(error);
  const isNetworkError = isNetworkRelatedError(error);

  if (inline) {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg",
          "bg-destructive/10 border border-destructive/30",
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1">
          {isNetworkError ? (
            <WifiOff className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {isNetworkError ? "Lỗi kết nối mạng" : "Không thể tải dữ liệu"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {errorMessage}
            </p>
            {failureCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Đã thử lại {failureCount} lần
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="shrink-0"
        >
          {isRefetching ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Đang thử...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Thử lại
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

/**
 * Component hiển thị trạng thái retry nhỏ gọn
 */
export function RetryIndicator({
  failureCount,
  maxRetries = 3,
  isRetrying,
  className,
}: {
  failureCount: number;
  maxRetries?: number;
  isRetrying: boolean;
  className?: string;
}) {
  if (failureCount === 0 && !isRetrying) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        className
      )}
    >
      {isRetrying ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      <span>
        {isRetrying
          ? `Đang thử lại (${failureCount}/${maxRetries})`
          : `Thử lại ${failureCount}/${maxRetries}`}
      </span>
    </div>
  );
}

/**
 * Component wrapper cho các widget với error handling
 */
export function WidgetWithErrorHandler({
  children,
  error,
  isLoading,
  isError,
  refetch,
  loadingComponent,
  className,
}: {
  children: React.ReactNode;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  loadingComponent?: React.ReactNode;
  className?: string;
}) {
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  if (isError) {
    return (
      <div className={cn("min-h-[200px] flex items-center justify-center", className)}>
        <QueryErrorHandler
          error={error}
          isLoading={isLoading}
          isError={isError}
          refetch={refetch}
          inline={true}
        />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Lấy thông báo lỗi thân thiện
 */
function getErrorMessage(error: Error | null): string {
  if (!error) return "Đã xảy ra lỗi không xác định";

  const message = error.message.toLowerCase();

  if (message.includes("fetch") || message.includes("network")) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
  }

  if (message.includes("timeout")) {
    return "Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.";
  }

  if (message.includes("unauthorized") || message.includes("401")) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (message.includes("forbidden") || message.includes("403")) {
    return "Bạn không có quyền truy cập tài nguyên này.";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "Không tìm thấy dữ liệu yêu cầu.";
  }

  if (message.includes("server") || message.includes("500")) {
    return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  }

  return error.message || "Đã xảy ra lỗi không mong muốn";
}

/**
 * Kiểm tra xem lỗi có liên quan đến network không
 */
function isNetworkRelatedError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
}

export default QueryErrorHandler;
