import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home, Bug, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Component, ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error messages thân thiện với người dùng
 */
const friendlyMessages: Record<string, { title: string; description: string; suggestion: string }> = {
  NetworkError: {
    title: "Lỗi kết nối mạng",
    description: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet của bạn.",
    suggestion: "Thử tải lại trang hoặc kiểm tra kết nối mạng",
  },
  TypeError: {
    title: "Lỗi dữ liệu",
    description: "Có sự cố với dữ liệu được tải. Điều này có thể do dữ liệu không đúng định dạng.",
    suggestion: "Thử tải lại trang hoặc liên hệ quản trị viên",
  },
  SyntaxError: {
    title: "Lỗi cú pháp",
    description: "Có lỗi trong mã nguồn của ứng dụng.",
    suggestion: "Vui lòng liên hệ đội ngũ kỹ thuật",
  },
  ReferenceError: {
    title: "Lỗi tham chiếu",
    description: "Ứng dụng đang cố truy cập một thành phần không tồn tại.",
    suggestion: "Thử tải lại trang hoặc quay về trang chủ",
  },
  ChunkLoadError: {
    title: "Lỗi tải module",
    description: "Không thể tải một phần của ứng dụng. Có thể do kết nối mạng không ổn định.",
    suggestion: "Thử tải lại trang",
  },
  default: {
    title: "Đã xảy ra lỗi",
    description: "Ứng dụng gặp sự cố không mong muốn. Chúng tôi đang làm việc để khắc phục.",
    suggestion: "Thử tải lại trang hoặc quay về trang chủ",
  },
};

/**
 * Lấy thông báo lỗi thân thiện dựa trên loại lỗi
 */
function getFriendlyMessage(error: Error | null) {
  if (!error) return friendlyMessages.default;
  
  const errorName = error.name || "";
  const errorMessage = error.message || "";
  
  // Check for specific error types
  if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("Failed to fetch")) {
    return friendlyMessages.NetworkError;
  }
  if (errorMessage.includes("Loading chunk") || errorMessage.includes("ChunkLoadError")) {
    return friendlyMessages.ChunkLoadError;
  }
  
  return friendlyMessages[errorName] || friendlyMessages.default;
}

/**
 * Component hiển thị chi tiết lỗi (có thể mở rộng)
 */
function ErrorDetails({ error, errorInfo }: { error: Error | null; errorInfo: React.ErrorInfo | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorDetails = `Error: ${error?.name || "Unknown"}\nMessage: ${error?.message || "No message"}\n\nStack Trace:\n${error?.stack || "No stack trace"}\n\nComponent Stack:\n${errorInfo?.componentStack || "No component stack"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        <span>Chi tiết kỹ thuật</span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 relative">
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span className="ml-1 text-xs">{copied ? "Đã sao chép" : "Sao chép"}</span>
            </Button>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border overflow-auto max-h-64">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {errorDetails}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ErrorBoundary Component - Bắt và hiển thị lỗi React một cách thân thiện
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const friendlyMessage = getFriendlyMessage(this.state.error);

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-muted/30">
          <Card className="w-full max-w-lg shadow-lg border-border/50">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-xl font-semibold text-foreground">
                {friendlyMessage.title}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {friendlyMessage.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Suggestion */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-primary flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{friendlyMessage.suggestion}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Thử lại
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tải lại trang
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Về trang chủ
                </Button>
              </div>

              {/* Error Details (Expandable) */}
              <div className="pt-4 border-t border-border">
                <ErrorDetails 
                  error={this.state.error} 
                  errorInfo={this.state.errorInfo} 
                />
              </div>

              {/* Report Bug Link */}
              <div className="text-center">
                <a
                  href="mailto:support@example.com?subject=Bug Report"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Bug className="h-3 w-3" />
                  Báo cáo lỗi này
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook để sử dụng với functional components
 * Wrap component với ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Component Error Fallback đơn giản cho các widget nhỏ
 */
export function WidgetErrorFallback({ 
  error, 
  onRetry,
  className 
}: { 
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 text-center rounded-lg",
      "bg-destructive/5 border border-destructive/20",
      className
    )}>
      <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm font-medium text-destructive mb-1">
        Không thể tải widget
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {error?.message || "Đã xảy ra lỗi không mong muốn"}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Thử lại
        </Button>
      )}
    </div>
  );
}

/**
 * Component Error Fallback cho API calls
 */
export function ApiErrorFallback({
  error,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  className,
}: {
  error?: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  className?: string;
}) {
  const canRetry = retryCount < maxRetries;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <div className="p-3 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium mb-2">Lỗi tải dữ liệu</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error?.message || "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."}
      </p>
      
      {retryCount > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          Đã thử lại {retryCount}/{maxRetries} lần
        </p>
      )}
      
      {onRetry && canRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Đang thử lại...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Thử lại
            </>
          )}
        </Button>
      )}
      
      {!canRetry && (
        <p className="text-sm text-destructive">
          Đã hết số lần thử lại. Vui lòng tải lại trang.
        </p>
      )}
    </div>
  );
}
