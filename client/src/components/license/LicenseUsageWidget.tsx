import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Layers, Package, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface UsageItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
  percentage: number;
}

function UsageItem({ icon, label, current, max, percentage }: UsageItemProps) {
  const getStatusColor = (pct: number) => {
    if (pct >= 90) return "text-red-500";
    if (pct >= 75) return "text-orange-500";
    return "text-green-500";
  };
  
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return "bg-red-500";
    if (pct >= 75) return "bg-orange-500";
    return "bg-green-500";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(percentage)}`}>
          {current} / {max === -1 ? "∞" : max}
        </span>
      </div>
      <Progress 
        value={max === -1 ? 0 : percentage} 
        className={`h-2 ${max === -1 ? "opacity-50" : ""}`}
      />
      {percentage >= 90 && max !== -1 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Sắp đạt giới hạn
        </p>
      )}
    </div>
  );
}

export default function LicenseUsageWidget() {
  const usageQuery = trpc.license.getUsageStats.useQuery();
  
  if (usageQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">License Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!usageQuery.data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">License Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có license được kích hoạt</p>
        </CardContent>
      </Card>
    );
  }
  
  const { usage, licenseType, daysRemaining, expiresAt } = usageQuery.data;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">License Usage</CardTitle>
          <Badge variant={
            licenseType === "trial" ? "secondary" :
            licenseType === "standard" ? "default" :
            licenseType === "professional" ? "outline" :
            "default"
          }>
            {licenseType}
          </Badge>
        </div>
        {daysRemaining !== null && (
          <CardDescription className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysRemaining > 0 ? (
              <span className={daysRemaining <= 30 ? "text-orange-500" : ""}>
                Còn {daysRemaining} ngày
              </span>
            ) : (
              <span className="text-red-500">Đã hết hạn</span>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageItem 
          icon={<Users className="h-4 w-4 text-blue-500" />}
          label="Người dùng"
          current={usage.users.current}
          max={usage.users.max}
          percentage={usage.users.percentage}
        />
        
        <UsageItem 
          icon={<Layers className="h-4 w-4 text-green-500" />}
          label="Dây chuyền"
          current={usage.productionLines.current}
          max={usage.productionLines.max}
          percentage={usage.productionLines.percentage}
        />
        
        <UsageItem 
          icon={<Package className="h-4 w-4 text-purple-500" />}
          label="SPC Plans"
          current={usage.spcPlans.current}
          max={usage.spcPlans.max}
          percentage={usage.spcPlans.percentage}
        />
        
        {/* Overall status */}
        <div className="pt-2 border-t">
          {usage.users.percentage < 90 && usage.productionLines.percentage < 90 && usage.spcPlans.percentage < 90 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Tất cả trong giới hạn</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <span>Một số tài nguyên sắp đạt giới hạn</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
