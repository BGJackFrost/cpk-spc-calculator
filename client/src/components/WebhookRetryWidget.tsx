import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, RefreshCw, Webhook, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function WebhookRetryWidget() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: retryStats, isLoading, refetch } = trpc.webhook.retryStats.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 60000, // Refresh every minute
  });

  const processRetriesMutation = trpc.webhook.processRetries.useMutation({
    onSuccess: (result) => {
      toast.success(`Đã xử lý ${result.processed} webhook: ${result.succeeded} thành công, ${result.failed} thất bại`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể xử lý retry");
    },
  });

  // Only show for admin users
  if (user?.role !== "admin") {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasPending = (retryStats?.pending || 0) > 0;
  const hasExhausted = (retryStats?.exhausted || 0) > 0;

  return (
    <Card className="bg-card rounded-xl border border-border/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Webhook Retry</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>Trạng thái gửi lại webhook thất bại</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-yellow-500 mb-1" />
            <span className="text-2xl font-bold">{retryStats?.pending || 0}</span>
            <span className="text-xs text-muted-foreground">Đang chờ</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <AlertCircle className="h-5 w-5 text-red-500 mb-1" />
            <span className="text-2xl font-bold">{retryStats?.exhausted || 0}</span>
            <span className="text-xs text-muted-foreground">Đã hết retry</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <RefreshCw className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-2xl font-bold">{retryStats?.totalRetries || 0}</span>
            <span className="text-xs text-muted-foreground">Tổng retry</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!hasPending && !hasExhausted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Tất cả webhook đã gửi thành công</span>
              </>
            ) : hasPending ? (
              <>
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-600">{retryStats?.pending} webhook đang chờ retry</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{retryStats?.exhausted} webhook đã hết retry</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {hasPending && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => processRetriesMutation.mutate()}
            disabled={processRetriesMutation.isPending}
          >
            {processRetriesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry tất cả ngay
              </>
            )}
          </Button>
        )}

        {/* Link to Webhook Management */}
        <div className="text-center">
          <a href="/webhooks" className="text-sm text-primary hover:underline">
            Xem chi tiết trong Quản lý Webhook →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
