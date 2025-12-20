import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Globe, 
  Clock, 
  MapPin, 
  LogOut, 
  Loader2,
  Shield,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Session {
  id: number;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent?: boolean;
}

export default function SessionManagement() {
  const { toast } = useToast();
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);

  const { data: sessions, isLoading, refetch } = trpc.localAuth.getSessions.useQuery();

  const revokeSessionMutation = trpc.localAuth.revokeSession.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã đăng xuất thiết bị",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeAllMutation = trpc.localAuth.revokeAllOtherSessions.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã đăng xuất tất cả thiết bị khác",
      });
      setRevokeAllDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Quản lý phiên đăng nhập
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem và quản lý các thiết bị đang đăng nhập vào tài khoản của bạn
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất tất cả
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Đăng xuất tất cả thiết bị khác?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này sẽ đăng xuất tất cả các thiết bị khác ngoài thiết bị hiện tại.
                  Bạn sẽ cần đăng nhập lại trên các thiết bị đó.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => revokeAllMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {revokeAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Đăng xuất tất cả
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nếu bạn thấy phiên đăng nhập lạ, hãy đăng xuất ngay và đổi mật khẩu để bảo vệ tài khoản.
        </AlertDescription>
      </Alert>

      {/* Sessions List */}
      {sessions && sessions.length > 0 ? (
        <div className="grid gap-4">
          {sessions.map((session: Session, index: number) => (
            <Card key={session.id} className={index === 0 ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${index === 0 ? "bg-primary/10" : "bg-muted"}`}>
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {session.deviceName || "Thiết bị không xác định"}
                        </span>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Thiết bị hiện tại
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {session.browser && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.browser}
                          </span>
                        )}
                        {session.os && (
                          <span>{session.os}</span>
                        )}
                        {session.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.ipAddress}
                            {session.location && ` (${session.location})`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Hoạt động: {getRelativeTime(session.lastActiveAt)}
                        <span className="mx-1">•</span>
                        Đăng nhập: {formatDate(session.createdAt)}
                      </div>
                    </div>
                  </div>
                  {index !== 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => revokeSessionMutation.mutate({ sessionId: session.id })}
                      disabled={revokeSessionMutation.isPending}
                    >
                      {revokeSessionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-1" />
                          Đăng xuất
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Không có phiên đăng nhập nào</h3>
            <p className="text-sm text-muted-foreground">
              Các phiên đăng nhập sẽ xuất hiện ở đây khi bạn đăng nhập từ các thiết bị khác nhau.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
