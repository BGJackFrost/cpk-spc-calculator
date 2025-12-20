import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Lock, 
  Unlock,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  User,
  ShieldAlert
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
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

export default function LockedAccountsAdmin() {
  const { toast } = useToast();
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [accountToUnlock, setAccountToUnlock] = useState<string | null>(null);

  const { data: lockedAccounts, isLoading, refetch } = trpc.localAuth.getLockedAccounts.useQuery();

  const unlockMutation = trpc.localAuth.unlockAccount.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã mở khóa tài khoản",
      });
      refetch();
      setUnlockDialogOpen(false);
      setAccountToUnlock(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUnlock = (username: string) => {
    setAccountToUnlock(username);
    setUnlockDialogOpen(true);
  };

  const confirmUnlock = () => {
    if (accountToUnlock) {
      unlockMutation.mutate({ username: accountToUnlock });
    }
  };

  const getRemainingTime = (lockedUntil: Date) => {
    const now = new Date();
    const until = new Date(lockedUntil);
    if (now >= until) return "Đã hết hạn khóa";
    return formatDistanceToNow(until, { addSuffix: false, locale: vi });
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
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Tài khoản bị khóa
              </CardTitle>
              <CardDescription>
                Quản lý các tài khoản bị khóa do đăng nhập thất bại nhiều lần
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!lockedAccounts || lockedAccounts.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Không có tài khoản nào đang bị khóa.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {lockedAccounts.map((account) => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-4 border rounded-lg border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <Lock className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{account.username}</p>
                        <Badge variant="destructive">Bị khóa</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {account.failedAttempts} lần thất bại
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Khóa lúc: {format(new Date(account.lockedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Còn lại: {getRemainingTime(account.lockedUntil)}
                        </Badge>
                        {account.reason && (
                          <Badge variant="secondary" className="text-xs">
                            {account.reason === "too_many_failed_attempts" ? "Quá nhiều lần thất bại" : account.reason}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleUnlock(account.username)}
                    disabled={unlockMutation.isPending}
                  >
                    {unlockMutation.isPending && accountToUnlock === account.username ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    Mở khóa
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock confirmation dialog */}
      <AlertDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mở khóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản "{accountToUnlock}" sẽ được mở khóa và có thể đăng nhập lại. 
              Lịch sử đăng nhập thất bại cũng sẽ được xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnlock}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {unlockMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Mở khóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
