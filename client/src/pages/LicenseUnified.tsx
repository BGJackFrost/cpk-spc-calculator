import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { 
  Key, Shield, Users, Calendar, AlertTriangle, CheckCircle, Clock, 
  RefreshCw, Download, Upload, Settings, Activity, Zap, Server,
  Mail, Bell, FileText, Plus, Trash2, Edit, Eye, Copy
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

// Types
interface License {
  id: number;
  key: string;
  type: "trial" | "standard" | "professional" | "enterprise";
  status: "active" | "expired" | "suspended" | "pending";
  maxUsers: number;
  currentUsers: number;
  features: string[];
  activatedAt?: Date;
  expiresAt: Date;
  companyName: string;
  contactEmail: string;
}

interface LicenseNotification {
  id: number;
  licenseId: number;
  type: "expiry_warning" | "expiry_critical" | "usage_warning" | "renewal_reminder";
  message: string;
  sentAt: Date;
  acknowledged: boolean;
}

// Demo data
// Mock data removed - demoLicenses (data comes from tRPC or is not yet implemented)

// Mock data removed - demoNotifications (data comes from tRPC or is not yet implemented)

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function LicenseUnified() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [notifications, setNotifications] = useState<LicenseNotification[]>([]);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isAddLicenseOpen, setIsAddLicenseOpen] = useState(false);
  const [activationKey, setActivationKey] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  
  // Server settings
  const [serverSettings, setServerSettings] = useState({
    serverUrl: "https://license.company.com",
    apiKey: "sk-license-xxxxx",
    autoRenewal: true,
    notifyDaysBefore: 30,
    emailNotifications: true,
    webhookUrl: "",
  });

  // Stats
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === "active").length,
    expired: licenses.filter(l => l.status === "expired").length,
    expiringSoon: licenses.filter(l => {
      const daysUntilExpiry = differenceInDays(l.expiresAt, new Date());
      return l.status === "active" && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length,
    totalUsers: licenses.reduce((sum, l) => sum + l.currentUsers, 0),
    maxUsers: licenses.reduce((sum, l) => sum + l.maxUsers, 0),
  };

  // Chart data
  const licenseTypeData = [
    { name: "Enterprise", value: licenses.filter(l => l.type === "enterprise").length },
    { name: "Professional", value: licenses.filter(l => l.type === "professional").length },
    { name: "Standard", value: licenses.filter(l => l.type === "standard").length },
    { name: "Trial", value: licenses.filter(l => l.type === "trial").length },
  ];

  const usageTrendData = [
    { month: "T1", users: 120 },
    { month: "T2", users: 145 },
    { month: "T3", users: 160 },
    { month: "T4", users: 175 },
    { month: "T5", users: 190 },
    { month: "T6", users: 206 },
  ];

  // Handlers
  const handleActivate = () => {
    if (!activationKey.trim()) {
      toast.error("Vui lòng nhập mã kích hoạt");
      return;
    }
    // Simulate activation
    toast.success("Đã kích hoạt license thành công!");
    setIsActivateOpen(false);
    setActivationKey("");
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Đã sao chép mã license");
  };

  const getStatusBadge = (status: License["status"]) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "expired": return <Badge variant="destructive">Hết hạn</Badge>;
      case "suspended": return <Badge className="bg-yellow-500">Tạm ngưng</Badge>;
      case "pending": return <Badge variant="secondary">Chờ kích hoạt</Badge>;
    }
  };

  const getTypeBadge = (type: License["type"]) => {
    switch (type) {
      case "enterprise": return <Badge className="bg-purple-500">Enterprise</Badge>;
      case "professional": return <Badge className="bg-blue-500">Professional</Badge>;
      case "standard": return <Badge className="bg-green-500">Standard</Badge>;
      case "trial": return <Badge variant="outline">Trial</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const days = differenceInDays(expiresAt, new Date());
    if (days < 0) return <span className="text-red-600">Đã hết hạn {Math.abs(days)} ngày</span>;
    if (days <= 30) return <span className="text-yellow-600">{days} ngày</span>;
    return <span className="text-green-600">{days} ngày</span>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý License</h1>
            <p className="text-muted-foreground">
              Dashboard, kích hoạt, quản lý và cấu hình license
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Key className="h-4 w-4 mr-2" />
                  Kích hoạt License
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kích hoạt License mới</DialogTitle>
                  <DialogDescription>Nhập mã license để kích hoạt</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Mã License</Label>
                    <Input 
                      value={activationKey}
                      onChange={(e) => setActivationKey(e.target.value)}
                      placeholder="LIC-XXXX-XXXX-XXXX"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsActivateOpen(false)}>Hủy</Button>
                  <Button onClick={handleActivate}>Kích hoạt</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => toast.info("Đang làm mới...")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng License</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Đang hoạt động</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Hết hạn</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.expired}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Sắp hết hạn</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.expiringSoon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Users đang dùng</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Tổng Users tối đa</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-600">{stats.maxUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <Activity className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="licenses">
              <Key className="h-4 w-4 mr-2" />
              Licenses
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Thông báo
              {notifications.filter(n => !n.acknowledged).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {notifications.filter(n => !n.acknowledged).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Báo cáo
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Cài đặt Server
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo loại License</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={licenseTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {licenseTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng sử dụng Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={usageTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* License Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Tình trạng sử dụng License</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {licenses.filter(l => l.status === "active").map((license) => (
                    <div key={license.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{license.companyName}</span>
                          {getTypeBadge(license.type)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {license.currentUsers}/{license.maxUsers} users
                        </span>
                      </div>
                      <Progress value={(license.currentUsers / license.maxUsers) * 100} />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Còn lại: {getDaysUntilExpiry(license.expiresAt)}</span>
                        <span>{Math.round((license.currentUsers / license.maxUsers) * 100)}% sử dụng</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã License</TableHead>
                      <TableHead>Công ty</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Hết hạn</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{license.key}</code>
                            <Button size="sm" variant="ghost" onClick={() => handleCopyKey(license.key)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{license.companyName}</div>
                            <div className="text-sm text-muted-foreground">{license.contactEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(license.type)}</TableCell>
                        <TableCell>{getStatusBadge(license.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{license.currentUsers}/{license.maxUsers}</span>
                            <Progress value={(license.currentUsers / license.maxUsers) * 100} className="w-16" />
                          </div>
                        </TableCell>
                        <TableCell>{getDaysUntilExpiry(license.expiresAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedLicense(license)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* License Detail Dialog */}
            {selectedLicense && (
              <Dialog open={!!selectedLicense} onOpenChange={() => setSelectedLicense(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Chi tiết License</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Mã License</Label>
                        <p className="font-mono">{selectedLicense.key}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Loại</Label>
                        <p>{getTypeBadge(selectedLicense.type)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Công ty</Label>
                        <p>{selectedLicense.companyName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email liên hệ</Label>
                        <p>{selectedLicense.contactEmail}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Ngày kích hoạt</Label>
                        <p>{selectedLicense.activatedAt ? format(selectedLicense.activatedAt, "dd/MM/yyyy") : "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Ngày hết hạn</Label>
                        <p>{format(selectedLicense.expiresAt, "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tính năng được cấp</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedLicense.features.map((feature, index) => (
                          <Badge key={index} variant="outline">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thông báo License</CardTitle>
                <CardDescription>Cảnh báo hết hạn và sử dụng</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>{format(notification.sentAt, "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>
                          {notification.type === "expiry_critical" && <Badge variant="destructive">Hết hạn</Badge>}
                          {notification.type === "expiry_warning" && <Badge className="bg-yellow-500">Sắp hết hạn</Badge>}
                          {notification.type === "usage_warning" && <Badge className="bg-blue-500">Sử dụng cao</Badge>}
                          {notification.type === "renewal_reminder" && <Badge variant="outline">Nhắc gia hạn</Badge>}
                        </TableCell>
                        <TableCell>{notification.message}</TableCell>
                        <TableCell>
                          {notification.acknowledged ? (
                            <Badge variant="outline" className="text-green-600">Đã xem</Badge>
                          ) : (
                            <Badge variant="destructive">Chưa xem</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!notification.acknowledged && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setNotifications(notifications.map(n => 
                                  n.id === notification.id ? { ...n, acknowledged: true } : n
                                ));
                                toast.success("Đã đánh dấu đã xem");
                              }}
                            >
                              Đánh dấu đã xem
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Báo cáo License</CardTitle>
                  <CardDescription>Xuất báo cáo tình trạng license</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Đang xuất báo cáo...")}>
                    <Download className="h-4 w-4 mr-2" />
                    Xuất báo cáo tổng hợp (Excel)
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Đang xuất báo cáo...")}>
                    <Download className="h-4 w-4 mr-2" />
                    Xuất báo cáo sử dụng (PDF)
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => toast.info("Đang xuất báo cáo...")}>
                    <Download className="h-4 w-4 mr-2" />
                    Xuất danh sách hết hạn (CSV)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thống kê nhanh</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Tỷ lệ sử dụng trung bình</span>
                      <span className="font-bold">{Math.round((stats.totalUsers / stats.maxUsers) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>License Enterprise</span>
                      <span className="font-bold">{licenses.filter(l => l.type === "enterprise").length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>License Professional</span>
                      <span className="font-bold">{licenses.filter(l => l.type === "professional").length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>License cần gia hạn (30 ngày)</span>
                      <span className="font-bold text-yellow-600">{stats.expiringSoon}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt License Server</CardTitle>
                <CardDescription>Cấu hình kết nối và thông báo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>URL License Server</Label>
                    <Input 
                      value={serverSettings.serverUrl}
                      onChange={(e) => setServerSettings({...serverSettings, serverUrl: e.target.value})}
                      placeholder="https://license.company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input 
                      type="password"
                      value={serverSettings.apiKey}
                      onChange={(e) => setServerSettings({...serverSettings, apiKey: e.target.value})}
                      placeholder="sk-license-xxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Tự động gia hạn</Label>
                      <p className="text-sm text-muted-foreground">Tự động gia hạn license khi sắp hết hạn</p>
                    </div>
                    <Switch 
                      checked={serverSettings.autoRenewal}
                      onCheckedChange={(checked) => setServerSettings({...serverSettings, autoRenewal: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Thông báo qua Email</Label>
                      <p className="text-sm text-muted-foreground">Gửi email khi license sắp hết hạn</p>
                    </div>
                    <Switch 
                      checked={serverSettings.emailNotifications}
                      onCheckedChange={(checked) => setServerSettings({...serverSettings, emailNotifications: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Số ngày thông báo trước khi hết hạn</Label>
                    <Input 
                      type="number"
                      value={serverSettings.notifyDaysBefore}
                      onChange={(e) => setServerSettings({...serverSettings, notifyDaysBefore: parseInt(e.target.value)})}
                      className="w-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook URL (tùy chọn)</Label>
                    <Input 
                      value={serverSettings.webhookUrl}
                      onChange={(e) => setServerSettings({...serverSettings, webhookUrl: e.target.value})}
                      placeholder="https://your-app.com/webhook/license"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => toast.info("Đang kiểm tra kết nối...")}>
                    <Server className="h-4 w-4 mr-2" />
                    Test kết nối
                  </Button>
                  <Button onClick={() => toast.success("Đã lưu cài đặt")}>
                    Lưu cài đặt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
