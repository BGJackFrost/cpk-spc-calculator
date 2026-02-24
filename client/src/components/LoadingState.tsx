import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show full page overlay */
  fullPage?: boolean;
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10"
};

const textClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg"
};

export function LoadingState({ 
  message = "Đang tải...", 
  size = "md",
  fullPage = false,
  className 
}: LoadingStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      fullPage ? "min-h-[50vh]" : "py-8",
      className
    )}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className={cn("text-muted-foreground", textClasses[size])}>{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

interface LoadingSkeletonProps {
  /** Number of skeleton rows */
  rows?: number;
  /** Show card skeleton */
  card?: boolean;
  /** Show table skeleton */
  table?: boolean;
  /** Additional className */
  className?: string;
}

export function LoadingSkeleton({ 
  rows = 3, 
  card = false, 
  table = false,
  className 
}: LoadingSkeletonProps) {
  if (card) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
            <div className="h-3 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (table) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-10 bg-muted rounded animate-pulse"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }}></div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Action button */
  action?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function EmptyState({ 
  icon, 
  title = "Không có dữ liệu", 
  description,
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  /** Error message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
}

export function ErrorState({ 
  message = "Đã xảy ra lỗi. Vui lòng thử lại.", 
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <div className="mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-destructive text-xl">!</span>
      </div>
      <h3 className="text-lg font-medium mb-1 text-destructive">Lỗi</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export default LoadingState;
