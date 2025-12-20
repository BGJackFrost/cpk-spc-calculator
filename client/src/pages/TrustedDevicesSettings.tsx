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
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
  MapPin,
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
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function TrustedDevicesSettings() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const { data: devices, isLoading, refetch } = trpc.localAuth.getTrustedDevices.useQuery();

  const removeMutation = trpc.localAuth.removeTrustedDevice.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã xóa thiết bị tin cậy",
      });
      refetch();
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeAllMutation = trpc.localAuth.removeAllTrustedDevices.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã xóa tất cả thiết bị tin cậy",
      });
      refetch();
      setDeleteAllDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getDeviceIcon = (deviceName: string | null) => {
    if (!deviceName) return <Monitor className="h-5 w-5" />;
    const name = deviceName.toLowerCase();
    if (name.includes("mobile") || name.includes("iphone") || name.includes("android")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (name.includes("ipad") || name.includes("tablet")) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const handleDelete = (deviceId: number) => {
    setDeviceToDelete(deviceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      removeMutation.mutate({ deviceId: deviceToDelete });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                Thiết bị tin cậy
              </CardTitle>
              <CardDescription>
                Các thiết bị này sẽ không cần xác thực 2 yếu tố khi đăng nhập
              </CardDescription>
            </div>
            {devices && devices.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa tất cả
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!devices || devices.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Chưa có thiết bị tin cậy nào. Khi đăng nhập với 2FA, bạn có thể chọn "Nhớ thiết bị này" để thêm thiết bị vào danh sách tin cậy.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div 
                  key={device.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getDeviceIcon(device.deviceName)}
                    </div>
                    <div>
                      <p className="font-medium">{device.deviceName || "Thiết bị không xác định"}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {device.ipAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.ipAddress}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sử dụng {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                      {device.expiresAt && (
                        <Badge variant="outline" className="mt-2">
                          Hết hạn: {new Date(device.expiresAt).toLocaleDateString("vi-VN")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(device.id)}
                    disabled={removeMutation.isPending}
                  >
                    {removeMutation.isPending && deviceToDelete === device.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete single device dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thiết bị tin cậy?</AlertDialogTitle>
            <AlertDialogDescription>
              Thiết bị này sẽ cần xác thực 2 yếu tố khi đăng nhập lần sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all devices dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tất cả thiết bị tin cậy?</AlertDialogTitle>
            <AlertDialogDescription>
              Tất cả thiết bị sẽ cần xác thực 2 yếu tố khi đăng nhập lần sau. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => removeAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Xóa tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
