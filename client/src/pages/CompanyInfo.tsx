import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, Save, RefreshCw, Globe, Phone, Mail, MapPin } from "lucide-react";

export default function CompanyInfo() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    companyCode: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    taxCode: "",
    logo: ""
  });

  const { data: companyInfo, isLoading, refetch } = trpc.system.getCompanyInfo.useQuery();
  const saveMutation = trpc.system.saveCompanyInfo.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu thông tin công ty");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi khi lưu: " + error.message);
    }
  });

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        companyName: companyInfo.companyName || "",
        companyCode: companyInfo.companyCode || "",
        address: companyInfo.address || "",
        phone: companyInfo.phone || "",
        email: companyInfo.email || "",
        website: companyInfo.website || "",
        taxCode: companyInfo.taxCode || "",
        logo: companyInfo.logo || ""
      });
    }
  }, [companyInfo]);

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Thông tin Công ty
            </h1>
            <p className="text-muted-foreground">Quản lý thông tin công ty/khách hàng</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cơ bản</CardTitle>
                <CardDescription>Tên và mã công ty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Tên công ty</Label>
                  <Input id="companyName" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} disabled={!isEditing} placeholder="Nhập tên công ty" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCode">Mã công ty</Label>
                  <Input id="companyCode" value={formData.companyCode} onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })} disabled={!isEditing} placeholder="Nhập mã công ty" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxCode">Mã số thuế</Label>
                  <Input id="taxCode" value={formData.taxCode} onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })} disabled={!isEditing} placeholder="Nhập mã số thuế" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liên hệ</CardTitle>
                <CardDescription>Thông tin liên lạc</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" /> Điện thoại</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={!isEditing} placeholder="Nhập số điện thoại" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!isEditing} placeholder="Nhập email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Website</Label>
                  <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} disabled={!isEditing} placeholder="https://example.com" />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Địa chỉ</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={!isEditing} placeholder="Nhập địa chỉ đầy đủ" rows={3} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Logo công ty</CardTitle>
                <CardDescription>URL hình ảnh logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">URL Logo</Label>
                  <Input id="logo" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} disabled={!isEditing} placeholder="https://example.com/logo.png" />
                </div>
                {formData.logo && (
                  <div className="flex items-center gap-4">
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <img src={formData.logo} alt="Logo công ty" className="max-h-24 max-w-48 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Xem trước logo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
