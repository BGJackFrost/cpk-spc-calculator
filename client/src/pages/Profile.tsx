import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import React from "react";
import { toast } from "sonner";
import { User, Mail, Lock, Save, Eye, EyeOff, Shield, Calendar, Camera, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { t } = useLanguage();
  
  // Profile form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const imgRef = React.useRef<HTMLImageElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Helper function to crop image
  const getCroppedImg = (image: HTMLImageElement, crop: Crop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('No 2d context');
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      200,
      200
    );
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Canvas is empty');
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      }, 'image/jpeg', 0.9);
    });
  };
  
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  };
  
  const handleCropComplete = async () => {
    if (!imgRef.current || !crop) return;
    
    setAvatarUploading(true);
    try {
      const croppedImageData = await getCroppedImg(imgRef.current, crop);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
          data: croppedImageData,
          folder: 'avatars',
        }),
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const { url } = await response.json();
      updateAvatarMutation.mutate({ avatarUrl: url });
      setShowCropDialog(false);
      setImageToCrop(null);
    } catch (error) {
      toast.error("Không thể tải lên ảnh. Vui lòng thử lại.");
    } finally {
      setAvatarUploading(false);
    }
  };
  
  // Default avatars - using DiceBear API for consistent, unique avatars
  const defaultAvatars = [
    { id: 'initials', url: null, label: 'Chữ cái' },
    { id: 'avatar1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4', label: 'Avatar 1' },
    { id: 'avatar2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede', label: 'Avatar 2' },
    { id: 'avatar3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&backgroundColor=d1d4f9', label: 'Avatar 3' },
    { id: 'avatar4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Dusty&backgroundColor=ffdfbf', label: 'Robot 1' },
    { id: 'avatar5', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pepper&backgroundColor=ffd5dc', label: 'Robot 2' },
    { id: 'avatar6', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=b6e3f4', label: 'Emoji 1' },
    { id: 'avatar7', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool&backgroundColor=c0aede', label: 'Emoji 2' },
    { id: 'avatar8', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=d1d4f9', label: 'Lorelei 1' },
    { id: 'avatar9', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Star&backgroundColor=ffdfbf', label: 'Lorelei 2' },
    { id: 'avatar10', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=ffd5dc', label: 'Notionist 1' },
    { id: 'avatar11', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sam&backgroundColor=b6e3f4', label: 'Notionist 2' },
  ];
  
  // Mutations
  const updateAvatarMutation = trpc.localAuth.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật ảnh đại diện");
      refresh?.();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể cập nhật ảnh đại diện");
    },
  });
  
  const updateProfileMutation = trpc.localAuth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật thông tin cá nhân");
      refresh?.();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể cập nhật thông tin");
    },
  });
  
  const changePasswordMutation = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Không thể đổi mật khẩu");
    },
  });
  
  const handleUpdateProfile = () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên");
      return;
    }
    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }
    updateProfileMutation.mutate({ name: name.trim(), email: email.trim() });
  };
  
  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (!newPassword) {
      toast.error("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-primary">Quản trị viên</Badge>;
      case "user":
        return <Badge variant="secondary">Người dùng</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ cá nhân</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin tài khoản và bảo mật
          </p>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {(user as any)?.avatar ? (
                    <img 
                      src={(user as any).avatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                
                {/* Avatar Picker Dialog */}
                {showAvatarPicker && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAvatarPicker(false)}>
                    <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-lg font-semibold mb-4">Chọn ảnh đại diện</h3>
                      
                      {/* Default Avatars Grid */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {defaultAvatars.map((avatar) => (
                          <button
                            key={avatar.id}
                            onClick={() => {
                              updateAvatarMutation.mutate({ avatarUrl: avatar.url });
                              setShowAvatarPicker(false);
                            }}
                            className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                              (user as any)?.avatar === avatar.url ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {avatar.url ? (
                              <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">
                                  {user?.name?.[0]?.toUpperCase() || "U"}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground mb-3">Hoặc tải lên ảnh của bạn:</p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setShowAvatarPicker(false);
                            fileInputRef.current?.click();
                          }}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Tải ảnh lên
                        </Button>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <Button variant="ghost" onClick={() => setShowAvatarPicker(false)}>
                          Đóng
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB");
                      return;
                    }
                    
                    // Read file and open crop dialog
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImageToCrop(reader.result as string);
                      setShowCropDialog(true);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                
                {/* Crop Dialog */}
                {showCropDialog && imageToCrop && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
                      <h3 className="text-lg font-semibold mb-4">Cắt ảnh đại diện</h3>
                      <p className="text-sm text-muted-foreground mb-4">Kéo để chọn vùng ảnh hình vuông</p>
                      
                      <div className="flex justify-center mb-4">
                        <ReactCrop
                          crop={crop}
                          onChange={(c) => setCrop(c)}
                          aspect={1}
                          circularCrop
                        >
                          <img
                            ref={imgRef}
                            src={imageToCrop}
                            alt="Crop"
                            onLoad={onImageLoad}
                            style={{ maxHeight: '400px' }}
                          />
                        </ReactCrop>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowCropDialog(false);
                            setImageToCrop(null);
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          onClick={handleCropComplete}
                          disabled={avatarUploading}
                        >
                          {avatarUploading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tải...</>
                          ) : (
                            'Xác nhận'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-xl">{user?.name || "User"}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user?.email || "Chưa có email"}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  {getRoleBadge(user?.role || "user")}
                  {user?.openId?.startsWith("local_") && (
                    <Badge variant="outline">Tài khoản Local</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Bảo mật
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Cập nhật tên và email của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập họ và tên"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Đổi mật khẩu</CardTitle>
                <CardDescription>
                  Cập nhật mật khẩu để bảo vệ tài khoản của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user?.openId?.startsWith("local_") ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Tài khoản của bạn được quản lý bởi hệ thống OAuth.</p>
                    <p className="text-sm mt-2">Vui lòng đổi mật khẩu tại trang quản lý tài khoản của nhà cung cấp.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {changePasswordMutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
