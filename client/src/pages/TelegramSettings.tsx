/**
 * TelegramSettings - Trang cấu hình Telegram Bot
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  MessageSquare, Plus, Trash2, Edit, Send, CheckCircle, 
  XCircle, Clock, Bell, Settings, History, RefreshCw, Bot
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function TelegramSettings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    botToken: '',
    chatId: '',
    description: '',
    isActive: true,
    alertTypes: [] as string[],
  });

  // Queries
  const { data: configs, refetch: refetchConfigs } = trpc.telegram.getConfigs.useQuery();
  const { data: alertTypes } = trpc.telegram.getAlertTypes.useQuery();
  const { data: messageHistory, refetch: refetchHistory } = trpc.telegram.getMessageHistory.useQuery({ limit: 50 });

  // Mutations
  const createConfig = trpc.telegram.createConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo cấu hình Telegram');
      setIsCreateOpen(false);
      resetForm();
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateConfig = trpc.telegram.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật cấu hình');
      setEditingConfig(null);
      resetForm();
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteConfig = trpc.telegram.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa cấu hình');
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const testConfig = trpc.telegram.testConfig.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Test thành công! Kiểm tra Telegram của bạn.');
      } else {
        toast.error(`Test thất bại: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      botToken: '',
      chatId: '',
      description: '',
      isActive: true,
      alertTypes: [],
    });
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      botToken: config.botToken,
      chatId: config.chatId,
      description: config.description || '',
      isActive: config.isActive,
      alertTypes: config.alertTypes || [],
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.botToken || !formData.chatId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (editingConfig) {
      updateConfig.mutate({ id: editingConfig.id, ...formData });
    } else {
      createConfig.mutate(formData);
    }
  };

  const handleAlertTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      alertTypes: prev.alertTypes.includes(type)
        ? prev.alertTypes.filter(t => t !== type)
        : [...prev.alertTypes, type],
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Cấu hình Telegram Bot
          </h1>
          <p className="text-muted-foreground">
            Thiết lập Telegram Bot để nhận cảnh báo realtime
          </p>
        </div>
        <Dialog open={isCreateOpen || !!editingConfig} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingConfig(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Chỉnh sửa cấu hình' : 'Thêm Telegram Bot mới'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên cấu hình *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Bot Cảnh báo SPC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token *</Label>
                <Input
                  id="botToken"
                  type="password"
                  value={formData.botToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, botToken: e.target.value }))}
                  placeholder="Lấy từ @BotFather"
                />
                <p className="text-xs text-muted-foreground">
                  Tạo bot mới qua @BotFather trên Telegram và lấy token
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatId">Chat ID *</Label>
                <Input
                  id="chatId"
                  value={formData.chatId}
                  onChange={(e) => setFormData(prev => ({ ...prev, chatId: e.target.value }))}
                  placeholder="VD: -1001234567890"
                />
                <p className="text-xs text-muted-foreground">
                  ID của chat/group nhận thông báo. Dùng @userinfobot để lấy ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả mục đích sử dụng..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Kích hoạt</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Loại cảnh báo nhận</Label>
                <div className="grid grid-cols-2 gap-2">
                  {alertTypes?.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={formData.alertTypes.includes(type.value)}
                        onCheckedChange={() => handleAlertTypeToggle(type.value)}
                      />
                      <label htmlFor={type.value} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingConfig(null);
                resetForm();
              }}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={createConfig.isPending || updateConfig.isPending}>
                {editingConfig ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Bot className="h-5 w-5" />
            Hướng dẫn thiết lập Telegram Bot
          </h3>
          <ol className="mt-2 space-y-1 text-sm text-blue-600 dark:text-blue-400 list-decimal list-inside">
            <li>Mở Telegram và tìm @BotFather</li>
            <li>Gửi /newbot và làm theo hướng dẫn để tạo bot mới</li>
            <li>Sao chép Bot Token được cung cấp</li>
            <li>Thêm bot vào group hoặc chat với bot trực tiếp</li>
            <li>Dùng @userinfobot hoặc @getidsbot để lấy Chat ID</li>
            <li>Nhập thông tin vào form và test kết nối</li>
          </ol>
        </CardContent>
      </Card>

      <Tabs defaultValue="configs" className="w-full">
        <TabsList>
          <TabsTrigger value="configs" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Cấu hình ({configs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lịch sử gửi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          {configs?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có cấu hình Telegram Bot nào</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Bot đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {configs?.map((config) => (
                <Card key={config.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {config.name}
                        {config.isActive ? (
                          <Badge className="bg-green-500">Hoạt động</Badge>
                        ) : (
                          <Badge variant="secondary">Tạm dừng</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConfig.mutate({ id: config.id })}
                          disabled={testConfig.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
                              deleteConfig.mutate({ id: config.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {config.description && (
                      <CardDescription>{config.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Chat ID:</span>
                        <span className="ml-2 font-mono">{config.chatId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bot Token:</span>
                        <span className="ml-2 font-mono">••••••{config.botToken.slice(-6)}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Loại cảnh báo:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.alertTypes?.length > 0 ? (
                          config.alertTypes.map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {alertTypes?.find(t => t.value === type)?.label || type}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Chưa chọn loại cảnh báo</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Lịch sử tin nhắn gần đây</CardTitle>
                <Button size="sm" variant="outline" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {messageHistory?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2" />
                    <p>Chưa có tin nhắn nào được gửi</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messageHistory?.map((msg, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(msg.status)}
                            <Badge variant="outline">{msg.messageType}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleString('vi-VN') : 'Chưa gửi'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {msg.content.slice(0, 150)}...
                        </p>
                        {msg.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{msg.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
