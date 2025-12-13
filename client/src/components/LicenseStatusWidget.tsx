import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Key, AlertTriangle, CheckCircle, Clock, Users, Factory, FileText, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function LicenseStatusWidget() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";
  
  const { data: activeLicense, isLoading } = trpc.license.getActive.useQuery();
  const { data: expiryData } = trpc.license.checkExpiry.useQuery(
    { daysBeforeExpiry: 30 },
    { enabled: isAdmin }
  );

  if (!isAdmin) return null;
  if (isLoading) return null;

  const isExpiringSoon = expiryData?.expiringSoon && expiryData.expiringSoon.length > 0;
  const isExpired = expiryData?.expired && expiryData.expired.length > 0;
  const daysUntilExpiry = activeLicense?.expiresAt 
    ? Math.ceil((new Date(activeLicense.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = () => {
    if (isExpired) return "bg-red-100 border-red-300 text-red-800";
    if (isExpiringSoon) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    return "bg-green-100 border-green-300 text-green-800";
  };

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (isExpiringSoon) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (isExpired) return t.license?.expired || "Đã hết hạn";
    if (isExpiringSoon) return `${t.license?.daysRemaining || "Còn"} ${daysUntilExpiry} ${t.license?.days || "ngày"}`;
    if (!activeLicense) return t.license?.notActivated || "Chưa kích hoạt";
    return t.license?.active || "Đang hoạt động";
  };

  const getLicenseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trial: "Trial",
      standard: "Standard",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return labels[type] || type;
  };

  return (
    <Card className={`${getStatusColor()} border-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t.dashboard?.licenseStatus || "Trạng thái License"}
          </div>
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeLicense ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">{t.license?.type || "Loại"}</span>
              <Badge variant="outline" className="text-xs">
                {getLicenseTypeLabel(activeLicense.licenseType)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">{t.common?.status || "Trạng thái"}</span>
              <span className="text-xs font-medium">{getStatusText()}</span>
            </div>

            {activeLicense.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-70">{t.license?.expiresAt || "Hết hạn"}</span>
                <span className="text-xs font-medium">
                  {new Date(activeLicense.expiresAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-current/20">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs opacity-70">
                  <Users className="h-3 w-3" />
                </div>
                <div className="text-sm font-bold">{activeLicense.maxUsers}</div>
                <div className="text-[10px] opacity-60">Users</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs opacity-70">
                  <Factory className="h-3 w-3" />
                </div>
                <div className="text-sm font-bold">{activeLicense.maxProductionLines}</div>
                <div className="text-[10px] opacity-60">Lines</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs opacity-70">
                  <FileText className="h-3 w-3" />
                </div>
                <div className="text-sm font-bold">{activeLicense.maxSpcPlans}</div>
                <div className="text-[10px] opacity-60">Plans</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs opacity-70 mb-2">{t.license?.noActiveLicense || "Chưa có license nào được kích hoạt"}</p>
          </div>
        )}

        <Link href="/license-management">
          <Button variant="outline" size="sm" className="w-full text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            {t.dashboard?.manageLicense || "Quản lý License"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
