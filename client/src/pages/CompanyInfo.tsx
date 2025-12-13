import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Building2, Save, RefreshCw, Globe, Phone, Mail, MapPin, Upload, Image, Trash2, Loader2 } from "lucide-react";

export default function CompanyInfo() {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadLogoMutation = trpc.system.uploadLogo.useMutation({
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, logo: data.url }));
      toast.success("Đã upload logo thành công");
    },
    onError: (error) => {
      toast.error("Lỗi upload logo: " + error.message);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file hình ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn. Kích thước tối đa là 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await uploadLogoMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
          base64Data: base64.split(',')[1] // Remove data:image/xxx;base64, prefix
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error("Lỗi đọc file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: "" }));
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
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Logo công ty
                </CardTitle>
                <CardDescription>Upload hoặc nhập URL hình ảnh logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Preview */}
                {formData.logo && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                      <img 
                        src={formData.logo} 
                        alt="Logo công ty" 
                        className="max-h-24 max-w-48 object-contain" 
                        onError={(e) => { 
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
                        }} 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Logo hiện tại</p>
                      <p className="text-xs text-muted-foreground break-all">{formData.logo}</p>
                    </div>
                    {isEditing && (
                      <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    )}
                  </div>
                )}

                {/* Upload Section */}
                {isEditing && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Đang upload..." : "Upload Logo"}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Hỗ trợ: PNG, JPG, GIF (tối đa 5MB)
                      </span>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">hoặc</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">Nhập URL Logo</Label>
                      <Input 
                        id="logo" 
                        value={formData.logo} 
                        onChange={(e) => setFormData({ ...formData, logo: e.target.value })} 
                        placeholder="https://example.com/logo.png" 
                      />
                    </div>
                  </div>
                )}

                {!isEditing && !formData.logo && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có logo. Bấm "Chỉnh sửa" để thêm logo.</p>
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
