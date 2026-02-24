import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, FileText, Loader2, Eye, Upload, ImageIcon } from "lucide-react";

interface ReportTemplate {
  id: number;
  name: string;
  description: string | null;
  companyName: string | null;
  companyLogo: string | null;
  headerText: string | null;
  footerText: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  showLogo: number;
  showCompanyName: number;
  showDate: number;
  showCharts: number;
  showRawData: number;
  isDefault: number;
  isActive: number;
}

export default function ReportTemplateManagement() {
  const { t, language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    companyName: "",
    companyLogo: "",
    headerText: "",
    footerText: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    fontFamily: "Arial",
    showLogo: true,
    showCompanyName: true,
    showDate: true,
    showCharts: true,
    showRawData: false,
    isDefault: false,
  });

  const { data: templates, refetch } = trpc.reportTemplate.list.useQuery();
  
  const createMutation = trpc.reportTemplate.create.useMutation({
    onSuccess: () => {
      toast.success(language === 'vi' ? "Đã tạo template thành công" : "Template created successfully");
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.reportTemplate.update.useMutation({
    onSuccess: () => {
      toast.success(language === 'vi' ? "Đã cập nhật template" : "Template updated");
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.reportTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success(language === 'vi' ? "Đã xóa template" : "Template deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      companyName: "",
      companyLogo: "",
      headerText: "",
      footerText: "",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      fontFamily: "Arial",
      showLogo: true,
      showCompanyName: true,
      showDate: true,
      showCharts: true,
      showRawData: false,
      isDefault: false,
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      companyName: template.companyName || "",
      companyLogo: template.companyLogo || "",
      headerText: template.headerText || "",
      footerText: template.footerText || "",
      primaryColor: template.primaryColor || "#3b82f6",
      secondaryColor: template.secondaryColor || "#64748b",
      fontFamily: template.fontFamily || "Arial",
      showLogo: template.showLogo === 1,
      showCompanyName: template.showCompanyName === 1,
      showDate: template.showDate === 1,
      showCharts: template.showCharts === 1,
      showRawData: template.showRawData === 1,
      isDefault: template.isDefault === 1,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error(language === 'vi' ? "Vui lòng nhập tên template" : "Please enter template name");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      companyName: formData.companyName || undefined,
      companyLogo: formData.companyLogo || undefined,
      headerText: formData.headerText || undefined,
      footerText: formData.footerText || undefined,
      primaryColor: formData.primaryColor || undefined,
      secondaryColor: formData.secondaryColor || undefined,
      fontFamily: formData.fontFamily || undefined,
      showLogo: formData.showLogo ? 1 : 0,
      showCompanyName: formData.showCompanyName ? 1 : 0,
      showDate: formData.showDate ? 1 : 0,
      showCharts: formData.showCharts ? 1 : 0,
      showRawData: formData.showRawData ? 1 : 0,
      isDefault: formData.isDefault ? 1 : 0,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(language === 'vi' ? "Bạn có chắc muốn xóa template này?" : "Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'vi' ? 'Vui lòng chọn file hình ảnh' : 'Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'vi' ? 'File quá lớn (tối đa 2MB)' : 'File too large (max 2MB)');
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64 and upload via API
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Call upload API
        const response = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: file.name,
            contentType: file.type,
            data: base64
          }),
        });

        if (response.ok) {
          const { url } = await response.json();
          setFormData({ ...formData, companyLogo: url });
          toast.success(language === 'vi' ? 'Đã tải logo lên thành công' : 'Logo uploaded successfully');
        } else {
          throw new Error('Upload failed');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(language === 'vi' ? 'Lỗi tải logo' : 'Error uploading logo');
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {language === 'vi' ? 'Quản lý Template Báo cáo' : 'Report Template Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'vi' 
                ? 'Tùy chỉnh logo, header và footer cho báo cáo PDF xuất ra' 
                : 'Customize logo, header and footer for exported PDF reports'}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {language === 'vi' ? 'Tạo Template' : 'Create Template'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate 
                    ? (language === 'vi' ? 'Chỉnh sửa Template' : 'Edit Template')
                    : (language === 'vi' ? 'Tạo Template mới' : 'Create New Template')}
                </DialogTitle>
                <DialogDescription>
                  {language === 'vi' 
                    ? 'Cấu hình các thông tin hiển thị trên báo cáo PDF'
                    : 'Configure information displayed on PDF reports'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <Label>{language === 'vi' ? 'Tên Template *' : 'Template Name *'}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={language === 'vi' ? 'VD: Template công ty ABC' : 'E.g.: ABC Company Template'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'vi' ? 'Mô tả' : 'Description'}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={language === 'vi' ? 'Mô tả ngắn về template' : 'Short description'}
                  />
                </div>

                {/* Company Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{language === 'vi' ? 'Tên công ty' : 'Company Name'}</Label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder={language === 'vi' ? 'Tên công ty' : 'Company name'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'vi' ? 'Logo công ty' : 'Company Logo'}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formData.companyLogo}
                        onChange={(e) => setFormData({ ...formData, companyLogo: e.target.value })}
                        placeholder="https://... hoặc tải lên"
                        className="flex-1"
                      />
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploading}
                        />
                        <Button type="button" variant="outline" size="icon" disabled={isUploading} asChild>
                          <span>
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </span>
                        </Button>
                      </label>
                    </div>
                    {formData.companyLogo && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-md">
                        <img 
                          src={formData.companyLogo} 
                          alt="Logo preview" 
                          className="h-10 w-auto object-contain"
                          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                        />
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {formData.companyLogo.substring(0, 50)}...
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setFormData({ ...formData, companyLogo: '' })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Header/Footer */}
                <div className="space-y-2">
                  <Label>{language === 'vi' ? 'Tiêu đề Header' : 'Header Text'}</Label>
                  <Input
                    value={formData.headerText}
                    onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                    placeholder={language === 'vi' ? 'VD: Báo cáo Phân tích SPC/CPK' : 'E.g.: SPC/CPK Analysis Report'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'vi' ? 'Footer' : 'Footer Text'}</Label>
                  <Input
                    value={formData.footerText}
                    onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                    placeholder={language === 'vi' ? 'VD: Tài liệu nội bộ - Không phổ biến' : 'E.g.: Internal document - Confidential'}
                  />
                </div>

                {/* Colors */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{language === 'vi' ? 'Màu chính' : 'Primary Color'}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'vi' ? 'Màu phụ' : 'Secondary Color'}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'vi' ? 'Font chữ' : 'Font Family'}</Label>
                    <Input
                      value={formData.fontFamily}
                      onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                      placeholder="Arial, Helvetica, sans-serif"
                    />
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">
                    {language === 'vi' ? 'Tùy chọn hiển thị' : 'Display Options'}
                  </Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Hiển thị Logo' : 'Show Logo'}</Label>
                      <Switch
                        checked={formData.showLogo}
                        onCheckedChange={(checked) => setFormData({ ...formData, showLogo: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Hiển thị tên công ty' : 'Show Company Name'}</Label>
                      <Switch
                        checked={formData.showCompanyName}
                        onCheckedChange={(checked) => setFormData({ ...formData, showCompanyName: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Hiển thị ngày tạo' : 'Show Date'}</Label>
                      <Switch
                        checked={formData.showDate}
                        onCheckedChange={(checked) => setFormData({ ...formData, showDate: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Hiển thị biểu đồ' : 'Show Charts'}</Label>
                      <Switch
                        checked={formData.showCharts}
                        onCheckedChange={(checked) => setFormData({ ...formData, showCharts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Hiển thị dữ liệu thô' : 'Show Raw Data'}</Label>
                      <Switch
                        checked={formData.showRawData}
                        onCheckedChange={(checked) => setFormData({ ...formData, showRawData: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{language === 'vi' ? 'Đặt làm mặc định' : 'Set as Default'}</Label>
                      <Switch
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingTemplate 
                    ? (language === 'vi' ? 'Cập nhật' : 'Update')
                    : (language === 'vi' ? 'Tạo' : 'Create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'vi' ? 'Danh sách Template' : 'Template List'}
            </CardTitle>
            <CardDescription>
              {language === 'vi' 
                ? 'Các template báo cáo đã tạo. Template mặc định sẽ được sử dụng khi xuất PDF.'
                : 'Created report templates. Default template will be used when exporting PDF.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'vi' ? 'Tên' : 'Name'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Công ty' : 'Company'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Header' : 'Header'}</TableHead>
                  <TableHead>{language === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                  <TableHead className="text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.isDefault === 1 && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{template.companyName || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{template.headerText || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={template.isActive === 1 ? "default" : "secondary"}>
                        {template.isActive === 1 
                          ? (language === 'vi' ? 'Hoạt động' : 'Active')
                          : (language === 'vi' ? 'Tắt' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewTemplate(template)}
                          title={language === 'vi' ? 'Xem trước' : 'Preview'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                          title={language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          disabled={template.isDefault === 1}
                          title={language === 'vi' ? 'Xóa' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!templates || templates.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {language === 'vi' ? 'Chưa có template nào' : 'No templates yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{language === 'vi' ? 'Xem trước Template' : 'Template Preview'}</DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div 
                className="border rounded-lg p-6 bg-white text-black"
                style={{ fontFamily: previewTemplate.fontFamily || 'Arial' }}
              >
                {/* Header */}
                <div 
                  className="text-center pb-4 border-b mb-4"
                  style={{ borderColor: previewTemplate.primaryColor || '#3b82f6' }}
                >
                  {previewTemplate.showLogo === 1 && previewTemplate.companyLogo && (
                    <img 
                      src={previewTemplate.companyLogo} 
                      alt="Logo" 
                      className="h-12 mx-auto mb-2"
                    />
                  )}
                  {previewTemplate.showCompanyName === 1 && previewTemplate.companyName && (
                    <h2 
                      className="text-xl font-bold"
                      style={{ color: previewTemplate.primaryColor || '#3b82f6' }}
                    >
                      {previewTemplate.companyName}
                    </h2>
                  )}
                  {previewTemplate.headerText && (
                    <h3 className="text-lg mt-1">{previewTemplate.headerText}</h3>
                  )}
                  {previewTemplate.showDate === 1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                    </p>
                  )}
                </div>

                {/* Sample Content */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded" style={{ backgroundColor: `${previewTemplate.primaryColor}20` }}>
                      <p className="text-sm text-gray-500">{language === 'vi' ? 'Sản phẩm' : 'Product'}</p>
                      <p className="font-semibold">Sample Product</p>
                    </div>
                    <div className="p-3 rounded" style={{ backgroundColor: `${previewTemplate.secondaryColor}20` }}>
                      <p className="text-sm text-gray-500">CPK</p>
                      <p className="font-semibold text-green-600">1.45</p>
                    </div>
                  </div>
                  
                  {previewTemplate.showCharts === 1 && (
                    <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400">{language === 'vi' ? '[Biểu đồ SPC]' : '[SPC Chart]'}</span>
                    </div>
                  )}

                  {previewTemplate.showRawData === 1 && (
                    <div className="text-sm text-gray-500">
                      <p>{language === 'vi' ? 'Dữ liệu thô: 10.2, 10.3, 10.1, 10.4, 10.2...' : 'Raw data: 10.2, 10.3, 10.1, 10.4, 10.2...'}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {previewTemplate.footerText && (
                  <div 
                    className="text-center pt-4 mt-4 border-t text-sm"
                    style={{ 
                      borderColor: previewTemplate.secondaryColor || '#64748b',
                      color: previewTemplate.secondaryColor || '#64748b'
                    }}
                  >
                    {previewTemplate.footerText}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
